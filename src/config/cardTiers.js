/**
 * cardTiers.js — single source of truth for player card tier system.
 *
 * Applies to every league on League Hunter regardless of sport.
 * Tiers are assigned by percentile rank within the player's same-category
 * peer group (or whole league when the group is too small).
 *
 * To add per-league tier overrides in the future, accept a `leagueMeta`
 * argument in getTierIdByPct() and check leagueMeta.tierOverrides here.
 */

/** Ordered from lowest to highest. */
export const CARD_TIERS = [
  {
    id: 'bronze',
    labelFr: 'BRONZE',   labelEn: 'BRONZE',
    color:   '#cd9858',  glow: false,
    pctMin: 0,   // everyone at or above 0th percentile
  },
  {
    id: 'silver',
    labelFr: 'ARGENT',   labelEn: 'SILVER',
    color:   '#d7dce2',  glow: false,
    pctMin: 50,  // top 50 %
  },
  {
    id: 'gold',
    labelFr: 'OR',       labelEn: 'GOLD',
    color:   '#ffd75e',  glow: false,
    pctMin: 70,  // top 30 %
  },
  {
    id: 'platinum',
    labelFr: 'PLATINE',  labelEn: 'PLATINUM',
    color:   '#e6ebf1',  glow: false,
    pctMin: 85,  // top 15 %
  },
  {
    id: 'diamond',
    labelFr: 'DIAMANT',  labelEn: 'DIAMOND',
    color:   '#8ee6ff',  glow: true,
    pctMin: 93,  // top 7 %
  },
  {
    id: 'champion',
    labelFr: 'ÉLITE',   labelEn: 'ELITE',
    color:   '#ffd24a',  glow: true,
    pctMin: 97,  // top 3 %
  },
  {
    id: 'legend',
    labelFr: 'LÉGENDE',  labelEn: 'LEGEND',
    color:   '#ffcc66',  glow: true,
    pctMin: 99,  // top 1 %
  },
];

/** Minimum games a player must have played to receive anything above Bronze. */
export const MIN_GAMES_FOR_TIER = 3;

/**
 * If a same-category group has fewer than this many eligible players,
 * fall back to fixed per-game average score thresholds instead of
 * comparing against the whole league pool (which would mix age categories).
 */
export const SMALL_GROUP_THRESHOLD = 10;

/** Icon per tier id (used in progression bar). */
export const TIER_ICON = {
  bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '🏅',
  diamond: '💎', champion: '🏆', legend: '👑',
};

/**
 * Fixed per-game average score thresholds — used when a category group is too small
 * for meaningful percentile comparison (< SMALL_GROUP_THRESHOLD eligible players).
 * Values are calibrated for basketball (pts×1+reb×0.7+ast×1.2+stl×1.5+blk×1.5-to×1.0).
 * Tune these values here; they propagate everywhere automatically.
 */
export const FIXED_TIER_THRESHOLDS = [
  { id: 'bronze',   minScore: 0  },
  { id: 'silver',   minScore: 4  },
  { id: 'gold',     minScore: 8  },
  { id: 'platinum', minScore: 12 },
  { id: 'diamond',  minScore: 17 },
  { id: 'champion', minScore: 23 },
  { id: 'legend',   minScore: 30 },
];

/** Return tier id for a per-game average score using absolute thresholds. */
export function getTierIdByScore(avgScore) {
  let tier = FIXED_TIER_THRESHOLDS[0];
  for (const t of FIXED_TIER_THRESHOLDS) {
    if (avgScore >= t.minScore) tier = t;
  }
  return tier.id;
}

/**
 * Return the tier id for a given percentile rank (0–100).
 * pctRank = percentage of eligible peers this player outperforms.
 *
 * Future hook: pass leagueMeta as second arg and check
 * leagueMeta.tierOverrides to allow per-league thresholds.
 */
export function getTierIdByPct(pctRank) {
  // [per-league override hook] — no override today, same rules for everyone
  let tier = CARD_TIERS[0];
  for (const t of CARD_TIERS) {
    if (pctRank >= t.pctMin) tier = t;
  }
  return tier.id;
}

/**
 * Return progress data for the modal progress bar.
 * tierId   — the player's current tier id
 * pctRank  — the player's percentile rank (0–100, two decimals ok)
 * rp       — raw RP score (displayed as a number, not used for tier)
 * lang     — 'fr' | 'en'
 */
export function getPlayerProgression(tierId, pctRank, rp, lang) {
  const idx = CARD_TIERS.findIndex(t => t.id === tierId);
  const cur  = CARD_TIERS[idx]  || CARD_TIERS[0];
  const next = CARD_TIERS[idx + 1] || null;
  const useFr = lang === 'fr';

  const curLabel  = useFr ? cur.labelFr  : cur.labelEn;
  const nextLabel = next ? (useFr ? next.labelFr : next.labelEn) : null;
  const curIcon   = TIER_ICON[cur.id]  || '';
  const nextIcon  = next ? (TIER_ICON[next.id] || '') : null;

  if (!next) {
    return { tierId, curLabel, curIcon, nextLabel: null, nextIcon: null, pct: 100, pctRank, rp, isMax: true };
  }

  // Progress within current tier band: from cur.pctMin to next.pctMin
  const span = next.pctMin - cur.pctMin;
  const into = pctRank - cur.pctMin;
  const pct  = span > 0 ? Math.max(0, Math.min(100, Math.round((into / span) * 100))) : 0;
  const pctNeeded = Math.max(0, next.pctMin - pctRank);

  return { tierId, curLabel, curIcon, nextLabel, nextIcon, pct, pctRank, rp, isMax: false, pctNeeded };
}
