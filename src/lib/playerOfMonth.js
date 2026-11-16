/**
 * playerOfMonth.js — calcul du Joueur du mois (NLS).
 *
 * Principe : la régularité avant le gros match unique.
 *   score d'un match = PTS×1 + REB×0,7 + PASSES×1,2 + INT×1,5 + CONTRES×1,5
 *   score du mois    = somme des scores de TOUS ses matchs du mois
 * Égalité : plus de matchs joués dans le mois, puis meilleure moyenne par match.
 * Le même barème sert déjà au Joueur de la semaine.
 */

export const POTM_WEIGHTS = [
  { key: 'points',   w: 1.0 },
  { key: 'rebounds', w: 0.7 },
  { key: 'assists',  w: 1.2 },
  { key: 'steals',   w: 1.5 },
  { key: 'blocks',   w: 1.5 },
];

export function potmGameScore(st) {
  const s = st || {};
  return POTM_WEIGHTS.reduce((sum, { key, w }) => sum + (+s[key] || 0) * w, 0);
}

const pad = n => String(n).padStart(2, '0');
export const monthKeyOfDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const hasStats = g => g && g.date && g.playerStats && Object.keys(g.playerStats).length > 0;

/**
 * Mois affiché : celui forcé par l'admin (AAAA-MM) sinon le mois courant ;
 * si aucun match avec stats n'a encore eu lieu ce mois-ci, on garde le dernier
 * mois qui en a (ex. le 1er du mois, on montre encore le gagnant du mois passé).
 */
export function resolvePotmMonth(games, forcedMonth, now = new Date()) {
  if (/^\d{4}-\d{2}$/.test(forcedMonth || '')) return forcedMonth;
  const cur = monthKeyOfDate(now);
  const months = (games || []).filter(hasStats).map(g => String(g.date).slice(0, 7)).filter(m => m <= cur);
  if (!months.length || months.includes(cur)) return cur;
  return months.sort()[months.length - 1];
}

/** Classement du mois pour une liste de joueurs (déjà filtrée par catégorie). */
export function potmRanking(players, games, month) {
  const monthGames = (games || []).filter(g => hasStats(g) && String(g.date).slice(0, 7) === month);
  const rows = (players || []).map(p => {
    const pid = String(p.id);
    const totals = { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 };
    let gp = 0, score = 0;
    monthGames.forEach(g => {
      if (g.playerStats[pid] === undefined && g.playerStats[p.id] === undefined) return;
      const st = g.playerStats[pid] || g.playerStats[p.id] || {};
      gp++;
      score += potmGameScore(st);
      POTM_WEIGHTS.forEach(({ key }) => { totals[key] += (+st[key] || 0); });
    });
    return { p, gp, score, avg: gp ? score / gp : 0, totals };
  }).filter(r => r.gp >= 1);
  rows.sort((a, b) => (b.score - a.score) || (b.gp - a.gp) || (b.avg - a.avg));
  return rows;
}

/** Fin du mois (début du mois suivant, heure locale) — pour le compte à rebours. */
export function monthEnd(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 1, 0, 0, 0, 0); // m est 1-based → mois suivant
}

export function formatMonth(month, lang) {
  const [y, m] = month.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
