// Stella — reads photos of paper stat sheets and returns structured stats.
// Vercel serverless function. Read-only: never writes to Firestore.
// The client fills the stats form; nothing is saved until the user clicks "Enregistrer stats".

export const config = { maxDuration: 60 };

const FIREBASE_API_KEY = 'AIzaSyDfMttfJLMvEW-LB3TIkFgebR5Cb7-1Wi4'; // public web key (same as index.html)
const FIREBASE_PROJECT_ID = 'league-hunter';
const MODEL = 'claude-sonnet-5-5';
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_B64 = 1600 * 1024;
const AUTH_TIMEOUT_MS = 10000;
const TOTAL_BUDGET_MS = 57000; // garde le total sous maxDuration (60s)
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Every stat key the stats form can hold. Anything else is dropped.
const KNOWN_KEYS = ['points', 'rebounds', 'assists', 'steals', 'blocks', 'turnovers', 'threes',
  'fgm', 'fga', 'ftm', 'fta', 'fouls'];

function send(res, status, obj) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

function fsValue(v) {
  if (!v) return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return String(v.integerValue);
  if ('doubleValue' in v) return String(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  return undefined;
}

async function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

async function checkAccess(idToken, leagueId) {
  const lr = await fetchWithTimeout(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  }, AUTH_TIMEOUT_MS);
  if (!lr.ok) return 401;
  const lj = await lr.json().catch(() => ({}));
  const acct = lj?.users?.[0];
  const uid = acct?.localId;
  if (!uid) return 401;
  if (acct.disabled) return 403;
  const ur = await fetchWithTimeout(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(uid)}`,
    { headers: { Authorization: 'Bearer ' + idToken } },
    AUTH_TIMEOUT_MS,
  );
  if (!ur.ok) return 403;
  const uj = await ur.json().catch(() => ({}));
  const f = uj.fields || {};
  const role = fsValue(f.role);
  if (role === 'superadmin') return 200;
  const docLeague = fsValue(f.leagueId);
  if ((role === 'owner' || role === 'coordinator') && docLeague !== undefined && String(docLeague) === String(leagueId)) {
    if (role === 'coordinator' && fsValue(f.active) === false) return 403;
    return 200;
  }
  return 403;
}

function buildPrompt({ home, away, statKeys, rosters }) {
  const fmtRoster = (list) => (list || []).map(p => `#${p.number} ${p.name}`).join(', ') || '(aucun joueur)';
  return `Tu lis des photos de feuilles de match de basketball (ligue NLS, Québec) pour le match ${home} (HOME / domicile) vs ${away} (AWAY / visiteur).

Rosters de référence (numéro de chandail + nom) :
- HOME ${home} : ${fmtRoster(rosters.home)}
- AWAY ${away} : ${fmtRoster(rosters.away)}

Clés de stats à remplir pour chaque joueur : ${statKeys.join(', ')}.
(points=PTS, rebounds=REB/RBD, assists=AST/PD/passes, steals=STL/INT/interceptions, blocks=BLK/CTR/contres, turnovers=TO/pertes, threes=3 points réussis, fgm/fga=tirs réussis/tentés, ftm/fta=lancers francs réussis/tentés, fouls=fautes)

Il y a 1 ou 2 photos, dans n'importe quel ordre. Types de feuilles possibles :

1) "FEUILLES DE STATISTIQUES AVANCÉES" (feuille de stats) : une seule page contient LES DEUX équipes (bloc du haut + bloc du bas). Colonnes par No. de chandail : Lancers francs (cercle = tentative, cercle rempli/barré = réussi), FG, 3-PT (cercle = tentative, barre = réussi), Rebonds (cercle = défensif, barre = offensif ; rebounds = total des deux), Blocks, Assists, Steals (barres de pointage par-dessus des chiffres imprimés), puis un RÉSUMÉ écrit à la main : total PTS, total RBD, total BLK, total AST, total STL.
   - Utilise les totaux du RÉSUMÉ comme valeurs principales (points←PTS, rebounds←RBD, blocks←BLK, assists←AST, steals←STL).
   - Utilise les barres de pointage seulement quand la case du résumé est vide mais que les barres montrent clairement des marques (compte-les).
   - Case du résumé vide ET aucune marque = 0 (pas null).
   - IMPORTANT : le champ "Opponent" de chaque bloc contient en réalité le nom de l'équipe listée DANS ce bloc, pas son adversaire. N'assigne jamais un côté (home/away) à partir de cette étiquette seule : compare les numéros de chandail aux deux rosters ci-dessus, et le nom d'équipe.
   - Les chiffres et totaux écrits à la main peuvent être décalés d'une demi-ligne par rapport à la grille imprimée. Aligne chaque total au numéro de chandail de la même ligne, et ajoute un avertissement (warnings) quand l'alignement est ambigu (indique le numéro).

2) Feuille officielle Exposure de la ligue (blocs AWAY/HOME avec # + NAME + FOULS 1-5, score cumulatif, cases AWAY/HOME FINAL SCORE) : lis le score final dans les cases FINAL SCORE. Dans finalScore, donne une entrée par équipe : { teamName: nom de l'équipe tel qu'écrit sur la feuille, points: score final, side: "home"/"away" selon la case (simple indice) } — par ex. [{ teamName: "<équipe A>", points: <score A>, side: "away" }, { teamName: "<équipe B>", points: <score B>, side: "home" }]. Si la clé "fouls" fait partie des clés demandées, fouls = nombre de cases barrées dans FOULS 1-5.

3) Les photos peuvent montrer les bords d'autres feuilles superposées (autres matchs). Ignore les feuilles partielles coupées aux bords de la photo.

Règles :
- Lis seulement ce qui est écrit. Ne devine jamais.
- Marques de pointage → compte-les.
- Si tu n'es pas sûr d'une valeur, mets null et ajoute la clé dans "unreadable" pour ce joueur.
- Numéro de chandail exactement comme écrit (texte).
- nameOnSheet d'un joueur = le nom en vigueur sur la feuille : si un nom est rayé et remplacé, donne le nouveau nom écrit à la main.
- Les feuilles peuvent être en français (PTS, REB, PD/AST, INT/STL, CTR/BLK, fautes).
- Pour chaque bloc d'équipe, nameOnSheet = le nom d'équipe écrit dans ce bloc. side = "home" ou "away" selon le match aux rosters (simple indice) ; "unknown" si tu ne peux pas décider.
- Combine les deux photos : un même joueur ne doit apparaître qu'une fois par équipe.
- Mets tes doutes dans warnings (en français, courts). Écris toujours les numéros de chandail sous la forme « #N » (ex. « #7 »).
- Ne signale pas les différences de noms ni les changements de roster (noms rayés/remplacés) : l'application les vérifie déjà.

Réponds uniquement en appelant l'outil report_stat_sheet.`;
}

function buildTool(statKeys) {
  const statProps = {};
  statKeys.forEach(k => { statProps[k] = { type: ['integer', 'null'] }; });
  return {
    name: 'report_stat_sheet',
    description: 'Report the stats read from the paper stat sheet(s).',
    input_schema: {
      type: 'object',
      properties: {
        finalScore: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              teamName: { type: ['string', 'null'] },
              points: { type: ['integer', 'null'] },
              side: { type: 'string', enum: ['home', 'away', 'unknown'] },
            },
            required: ['teamName', 'points'],
          },
        },
        teams: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              side: { type: 'string', enum: ['home', 'away', 'unknown'] },
              nameOnSheet: { type: ['string', 'null'] },
              teamPointsOnSheet: { type: ['integer', 'null'] },
              players: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    number: { type: 'string' },
                    nameOnSheet: { type: ['string', 'null'] },
                    stats: { type: 'object', properties: statProps },
                    unreadable: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['number', 'stats'],
                },
              },
            },
            required: ['side', 'nameOnSheet', 'players'],
          },
        },
        warnings: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      },
      required: ['finalScore', 'teams', 'warnings', 'confidence'],
    },
  };
}

const intOrNull = (v) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return Number.isInteger(n) && n >= 0 && n <= 200 ? n : null;
};
const str = (v, max = 80) => (typeof v === 'string' ? v.slice(0, max) : null);

function sanitize(out, statKeys) {
  const o = out && typeof out === 'object' ? out : {};
  const teams = (Array.isArray(o.teams) ? o.teams : []).slice(0, 4).map(t => ({
    side: ['home', 'away'].includes(t?.side) ? t.side : 'unknown',
    nameOnSheet: str(t?.nameOnSheet),
    teamPointsOnSheet: intOrNull(t?.teamPointsOnSheet),
    players: (Array.isArray(t?.players) ? t.players : []).slice(0, 40).map(p => {
      const stats = {};
      statKeys.forEach(k => { stats[k] = intOrNull(p?.stats?.[k]); });
      return {
        number: (typeof p?.number === 'number' ? String(p.number) : (str(p?.number, 10) || '')).trim(),
        nameOnSheet: str(p?.nameOnSheet),
        stats,
        unreadable: (Array.isArray(p?.unreadable) ? p.unreadable : []).filter(k => statKeys.includes(k)),
      };
    }),
  }));
  return {
    finalScore: (Array.isArray(o.finalScore) ? o.finalScore : []).slice(0, 4).map(f => ({
      teamName: str(f?.teamName),
      points: intOrNull(f?.points),
      side: ['home', 'away'].includes(f?.side) ? f.side : 'unknown',
    })),
    teams,
    warnings: (Array.isArray(o.warnings) ? o.warnings : []).filter(w => typeof w === 'string').slice(0, 20).map(w => w.slice(0, 300)),
    confidence: ['high', 'medium', 'low'].includes(o.confidence) ? o.confidence : 'low',
  };
}

export default async function handler(req, res) {
  const startedAt = Date.now();
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'method_not_allowed' }); }

  const len = parseInt(req.headers['content-length'] || '0', 10);
  if (len > MAX_BODY_BYTES) return send(res, 413, { error: 'too_large' });

  if (!process.env.ANTHROPIC_API_KEY) return send(res, 503, { error: 'missing_key' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return send(res, 400, { error: 'bad_json' }); } }
  if (!body || typeof body !== 'object') return send(res, 400, { error: 'bad_request' });

  const { leagueId, home, away, images } = body;
  if (!leagueId || typeof home !== 'string' || typeof away !== 'string') return send(res, 400, { error: 'bad_request' });
  if (!Array.isArray(images) || images.length < 1 || images.length > 2) return send(res, 400, { error: 'bad_images' });
  for (const im of images) {
    if (!im || !MEDIA_TYPES.includes(im.media_type) || typeof im.data !== 'string' || !im.data || im.data.length > MAX_IMAGE_B64) {
      return send(res, 400, { error: 'bad_images' });
    }
  }
  const statKeys = (Array.isArray(body.statKeys) ? body.statKeys : []).filter(k => KNOWN_KEYS.includes(k));
  if (!statKeys.length) return send(res, 400, { error: 'bad_stat_keys' });
  const cleanRoster = (list) => (Array.isArray(list) ? list : []).slice(0, 40).map(p => ({
    number: String(p?.number ?? '').slice(0, 10), name: String(p?.name ?? '').slice(0, 60),
  }));
  const rosters = { home: cleanRoster(body.rosters?.home), away: cleanRoster(body.rosters?.away) };

  const auth = String(req.headers.authorization || '');
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!idToken) return send(res, 401, { error: 'unauthorized' });
  try {
    const st = await checkAccess(idToken, leagueId);
    if (st !== 200) return send(res, st, { error: st === 401 ? 'unauthorized' : 'forbidden' });
  } catch {
    return send(res, 502, { error: 'auth_check_failed' });
  }

  const content = [
    ...images.map(im => ({ type: 'image', source: { type: 'base64', media_type: im.media_type, data: im.data } })),
    { type: 'text', text: buildPrompt({ home: home.slice(0, 80), away: away.slice(0, 80), statKeys, rosters }) },
  ];

  const ctrl = new AbortController();
  const remaining = TOTAL_BUDGET_MS - (Date.now() - startedAt);
  if (remaining < 5000) return send(res, 504, { error: 'timeout' });
  const timer = setTimeout(() => ctrl.abort(), remaining);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        tools: [buildTool(statKeys)],
        tool_choice: { type: 'tool', name: 'report_stat_sheet' },
        messages: [{ role: 'user', content }],
      }),
    });
    if (!r.ok) {
      console.error('scan-stats: anthropic status', r.status);
      return send(res, 502, { error: 'ai_failed' });
    }
    const j = await r.json();
    if (j.stop_reason === 'max_tokens') {
      console.error('scan-stats: max_tokens reached');
      return send(res, 502, { error: 'ai_truncated' });
    }
    const block = (j.content || []).find(c => c.type === 'tool_use' && c.name === 'report_stat_sheet');
    if (!block) return send(res, 502, { error: 'ai_no_result' });
    return send(res, 200, sanitize(block.input, statKeys));
  } catch (e) {
    if (e && e.name === 'AbortError') return send(res, 504, { error: 'timeout' });
    console.error('scan-stats: error', e && e.message);
    return send(res, 502, { error: 'ai_failed' });
  } finally {
    clearTimeout(timer);
  }
}
