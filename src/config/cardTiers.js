/**
 * cardTiers.js — single source of truth for player card tier system.
 *
 * 9 tiers: Bronze → Argent → Or → Émeraude → Saphir → Rubis → Améthyste → Diamant → Légende
 *
 * Tiers are assigned by percentile rank within the player's same-category
 * peer group (or by fixed per-game thresholds when the group is too small).
 */

export const CARD_TIERS = [
  { id: 'bronze',   labelFr: 'BRONZE',    labelEn: 'BRONZE',   color: '#b87333', glow: false, pctMin: 0  },
  { id: 'silver',   labelFr: 'ARGENT',    labelEn: 'SILVER',   color: '#d7dce2', glow: false, pctMin: 25 },
  { id: 'gold',     labelFr: 'OR',        labelEn: 'GOLD',     color: '#ffd75e', glow: false, pctMin: 45 },
  { id: 'emerald',  labelFr: 'ÉMERAUDE',  labelEn: 'EMERALD',  color: '#50e878', glow: true,  pctMin: 60 },
  { id: 'sapphire', labelFr: 'SAPHIR',    labelEn: 'SAPPHIRE', color: '#7ab0ff', glow: true,  pctMin: 72 },
  { id: 'ruby',     labelFr: 'RUBIS',     labelEn: 'RUBY',     color: '#ff6080', glow: true,  pctMin: 82 },
  { id: 'amethyst', labelFr: 'AMÉTHYSTE', labelEn: 'AMETHYST', color: '#cc99ff', glow: true,  pctMin: 89 },
  { id: 'diamond',  labelFr: 'DIAMANT',   labelEn: 'DIAMOND',  color: '#8ee6ff', glow: true,  pctMin: 94 },
  { id: 'legend',   labelFr: 'LÉGENDE',   labelEn: 'LEGEND',   color: '#e0b0ff', glow: true,  pctMin: 98 },
];

/** Minimum games played to receive above Bronze. */
export const MIN_GAMES_FOR_TIER = 3;

/**
 * When a same-category group has fewer than this many eligible players,
 * fall back to fixed per-game average score thresholds.
 */
export const SMALL_GROUP_THRESHOLD = 10;

export const TIER_ICON = {
  bronze: '🥉', silver: '🥈', gold: '🥇', emerald: '💚',
  sapphire: '💙', ruby: '❤️', amethyst: '💜', diamond: '💎', legend: '👑',
};

/**
 * Fixed per-game average score thresholds — used when a category group is too
 * small for meaningful percentile comparison.
 * Calibrated for basketball (pts×1 + reb×0.7 + ast×1.2 + stl×1.5 + blk×1.5 − to×1.0).
 */
export const FIXED_TIER_THRESHOLDS = [
  { id: 'bronze',   minScore: 0  },
  { id: 'silver',   minScore: 4  },
  { id: 'gold',     minScore: 7  },
  { id: 'emerald',  minScore: 10 },
  { id: 'sapphire', minScore: 13 },
  { id: 'ruby',     minScore: 16 },
  { id: 'amethyst', minScore: 20 },
  { id: 'diamond',  minScore: 25 },
  { id: 'legend',   minScore: 30 },
];

export function getTierIdByScore(avgScore) {
  let tier = FIXED_TIER_THRESHOLDS[0];
  for (const t of FIXED_TIER_THRESHOLDS) {
    if (avgScore >= t.minScore) tier = t;
  }
  return tier.id;
}

export function getTierIdByPct(pctRank) {
  let tier = CARD_TIERS[0];
  for (const t of CARD_TIERS) {
    if (pctRank >= t.pctMin) tier = t;
  }
  return tier.id;
}

export function getPlayerProgression(tierId, pctRank, rp, lang) {
  // backwards compat: 'champion' was renamed to 'amethyst'
  const resolvedId = tierId === 'champion' ? 'amethyst' : tierId;
  const idx = CARD_TIERS.findIndex(t => t.id === resolvedId);
  const cur  = CARD_TIERS[idx]  || CARD_TIERS[0];
  const next = CARD_TIERS[idx + 1] || null;
  const useFr = lang === 'fr';

  const curLabel  = useFr ? cur.labelFr  : cur.labelEn;
  const nextLabel = next ? (useFr ? next.labelFr : next.labelEn) : null;
  const curIcon   = TIER_ICON[cur.id]  || '';
  const nextIcon  = next ? (TIER_ICON[next.id] || '') : null;

  if (!next) {
    return { tierId: resolvedId, curLabel, curIcon, nextLabel: null, nextIcon: null, pct: 100, pctRank, rp, isMax: true };
  }

  const span = next.pctMin - cur.pctMin;
  const into = pctRank - cur.pctMin;
  const pct  = span > 0 ? Math.max(0, Math.min(100, Math.round((into / span) * 100))) : 0;
  const pctNeeded = Math.max(0, next.pctMin - pctRank);

  return { tierId: resolvedId, curLabel, curIcon, nextLabel, nextIcon, pct, pctRank, rp, isMax: false, pctNeeded };
}
