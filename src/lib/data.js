import { TIER_ORDER } from './tiers.js';
import { getTierIdByPct, getTierIdByScore, MIN_GAMES_FOR_TIER, SMALL_GROUP_THRESHOLD } from '../config/cardTiers.js';
import { getScoreFn } from '../config/sportScores.js';

export function formatHeight(height, units) {
  if (!height && height !== 0) return '';
  if (units === 'metric') return `${height} cm`;
  const ft = Math.floor(height / 12);
  const inches = height % 12;
  return `${ft}'${inches}"`;
}

export function formatWeight(weight, units) {
  if (!weight && weight !== 0) return '';
  return units === 'metric' ? `${weight} kg` : `${weight} lbs`;
}

export function deriveArchetype(tierId, ppg, rpg, apg) {
  if (tierId === 'legend')   return { fr: 'ICÔNE',     en: 'ICON' };
  if (tierId === 'amethyst' || tierId === 'champion') return { fr: 'FINISSEUR', en: 'CLOSER' };
  const best = Math.max(ppg, rpg, apg);
  if (best === apg && apg > 0) return { fr: 'CRÉATEUR',  en: 'PLAYMAKER' };
  if (best === rpg && rpg > 0) return { fr: 'REBONDEUR', en: 'REBOUNDER' };
  if (ppg >= 18)               return { fr: 'SNIPER',    en: 'SNIPER' };
  if (ppg > 0)                 return { fr: 'MARQUEUR',  en: 'SCORER' };
  return { fr: 'BATAILLEUR', en: 'GRINDER' };
}

/**
 * Assign percentile-based tiers to all players.
 *
 * Grouping rules (generic — no NLS hard-coding):
 *   1. Players are grouped by their categoryId field.
 *   2. If a group has fewer than SMALL_GROUP_THRESHOLD eligible players,
 *      those players are compared against the whole-league pool instead.
 *   3. Players who have not yet played MIN_GAMES_FOR_TIER games receive 'bronze'
 *      without being counted in the percentile pool.
 *
 * scoreFn(player, allGames, leagueLike) → Number
 *   Pass the appropriate function from src/config/sportScores.js.
 *
 * teamCatMap — { teamName: categoryId } to derive categoryId from team when
 *   the player document does not carry it directly.
 *
 * Returns an array of { id, score, gp, pctRank, tier } parallel to rawPlayers.
 *
 * Future hook: per-league tier overrides live in getTierIdByPct (cardTiers.js).
 */
function assignTiers(rawPlayers, games, leagueLike, scoreFn, teamCatMap) {
  // Step 1 — compute raw score and games-played for every player
  const scored = rawPlayers.map(p => {
    const pid = String(p.id);
    const gp  = games.filter(g => g.playerStats && g.playerStats[pid] !== undefined).length;
    const score = scoreFn({ ...p, id: pid }, games, leagueLike);
    // avgScore is the per-game average — used for tier ranking so a longer season
    // doesn't unfairly inflate a player's tier.
    const avgScore = gp > 0 ? score / gp : 0;
    const catFromPlayer = p.categoryId != null && p.categoryId !== '' ? String(p.categoryId) : '';
    const categoryId = catFromPlayer || (teamCatMap && teamCatMap[p.team]) || '';
    return { id: pid, score, avgScore, gp, categoryId };
  });

  // Step 2 — split into per-category groups; bucket players with no categoryId as ''
  const groups = {};
  scored.forEach(s => {
    const key = s.categoryId;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  /**
   * Given an eligible pool (already filtered to gp >= MIN_GAMES_FOR_TIER),
   * return a percentile rank (0–100) for a target per-game average.
   * pctRank = (players strictly below) / total × 100
   */
  function pctRankInPool(targetAvg, pool) {
    if (!pool.length) return 0;
    const below = pool.filter(s => s.avgScore < targetAvg).length;
    return (below / pool.length) * 100;
  }

  // Step 3 — assign tier per player using per-game average score
  return scored.map(s => {
    // Players with 0 games get Bronze; 1–2 games get at most Silver (not yet ranked)
    if (s.gp === 0) return { ...s, pctRank: 0, tier: 'bronze' };
    if (s.gp < MIN_GAMES_FOR_TIER) return { ...s, pctRank: 0, tier: 'silver' };

    const catGroup = (groups[s.categoryId] || []).filter(x => x.gp >= MIN_GAMES_FOR_TIER);
    if (catGroup.length < SMALL_GROUP_THRESHOLD) {
      // Too few peers — use fixed per-game average thresholds
      return { ...s, pctRank: 0, tier: getTierIdByScore(s.avgScore) };
    }
    const pctRank = pctRankInPool(s.avgScore, catGroup);
    const tier    = getTierIdByPct(pctRank);
    return { ...s, pctRank, tier };
  });
}

export function buildLiveViewData(meta, rawTeams, rawPlayers, rawGames) {
  const units      = (meta && meta.units)  || 'imperial';
  const sport      = (meta && meta.sport)  || 'basketball';
  const leagueLike = { season: meta && meta.season, playerMilestones: meta && meta.playerMilestones };
  const scoreFn    = getScoreFn(sport);

  const games = (rawGames || []).map(g => {
    const hs = (g.homeScore !== undefined && g.homeScore !== null && g.homeScore !== '') ? +g.homeScore : null;
    const as = (g.awayScore !== undefined && g.awayScore !== null && g.awayScore !== '') ? +g.awayScore : null;
    return {
      id: g.id, date: g.date || '', time: g.time || '',
      home: g.home || '', away: g.away || '', venue: g.venue || '',
      categoryId: g.categoryId != null ? String(g.categoryId) : '',
      hs, as,
      playerStats: g.playerStats || {},
      homeScore: g.homeScore, awayScore: g.awayScore,
    };
  });

  const played = games.filter(g => g.hs !== null && g.as !== null)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const teams = (rawTeams || []).map((tm, i) => {
    const results = [];
    let pf = 0, pa = 0;
    played.forEach(g => {
      if (g.home === tm.name)      { results.push(g.hs > g.as ? 1 : 0); pf += g.hs; pa += g.as; }
      else if (g.away === tm.name) { results.push(g.as > g.hs ? 1 : 0); pf += g.as; pa += g.hs; }
    });
    const w = results.filter(r => r).length;
    return {
      id: tm.id || i, name: tm.name || '', emoji: tm.emoji || '🏀',
      logoUrl: tm.logoUrl || '', color: tm.color || '#C9A24A',
      categoryId: tm.categoryId != null ? String(tm.categoryId) : '',
      w, l: results.length - w, pf, pa, last5: results.slice(-5),
    };
  });

  // Build categoryId lookup from teams (fallback when player doc lacks categoryId)
  const teamCatMap = Object.fromEntries(
    (rawTeams || []).map(tm => [
      tm.name || '',
      tm.categoryId != null && tm.categoryId !== '' ? String(tm.categoryId) : '',
    ])
  );

  // Compute percentile tiers for all players in one pass
  const tierMap = Object.fromEntries(
    assignTiers(rawPlayers || [], games, leagueLike, scoreFn, teamCatMap)
      .map(t => [t.id, t])
  );

  const players = (rawPlayers || []).map(p => {
    const pid  = String(p.id);
    const pGames = games.filter(g => g.playerStats && g.playerStats[pid] !== undefined);
    const gp   = pGames.length;
    const sum  = k => pGames.reduce((s, g) => s + (+((g.playerStats[pid] || {})[k] || 0)), 0);
    const ppg  = gp ? sum('points')   / gp : 0;
    const rpg  = gp ? sum('rebounds') / gp : 0;
    const apg  = gp ? sum('assists')  / gp : 0;
    const spg  = gp ? sum('steals')   / gp : 0;
    const bpg  = gp ? sum('blocks')   / gp : 0;

    const td      = tierMap[pid] || { score: 0, pctRank: 0, tier: 'bronze' };
    const tier    = td.tier;
    const rp      = td.score;    // "rp" kept as field name for API compat
    const pctRank = td.pctRank;

    return {
      id: pid, name: p.name || '', team: p.team || '', pos: p.position || '',
      number: p.number || '', photoUrl: p.photoUrl || '',
      height: p.height, weight: p.weight,
      categoryId: p.categoryId != null ? String(p.categoryId) : '',
      tier,
      arch: deriveArchetype(tier, ppg, rpg, apg),
      ppg, rpg, apg, spg, bpg, gp,
      rp,       // raw performance score (used for sorting / modal display)
      pctRank,  // percentile within peer group (used for tier + modal progress bar)
    };
  });

  // Sort order preserved for callers that use TIER_ORDER tiebreak
  void TIER_ORDER; // ensure import is used

  const rawCats = ((meta && meta.categories) || []).map(c => ({
    id:       String(c.id),
    name:     c.displayName || c.name || 'Catégorie',
    ageLabel: c.name || '',
    gender:   c.gender   || null,
    division: c.division || null,
  }));
  const catOrder   = ((meta && meta.categoryOrder) || []).map(String);
  const categories = catOrder.length
    ? [...rawCats].sort((a, b) => {
        const ia = catOrder.indexOf(a.id), ib = catOrder.indexOf(b.id);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      })
    : rawCats;

  return { teams, players, games, units, categories, ps: (meta && meta.publicSettings) || {}, meta };
}
