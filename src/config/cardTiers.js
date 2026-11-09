/**
 * cardTiers.js — single source of truth for player card tier system.
 *
 * 9 tiers: Bronze → Argent → Or → Émeraude → Saphir → Rubis → Améthyste → Diamant → Légende
 *
 * Tiers are assigned by percentile rank within the player's same-category
 * peer group (whole league when the category is too small, fixed per-game
 * thresholds only when the whole league is too small). High tiers also need
 * enough games played (TIER_GAMES_GATE) and Légende is capped per category.
 */

export const CARD_TIERS = [
  { id: 'bronze',   labelFr: 'BRONZE',    labelEn: 'BRONZE',   color: '#b87333', glow: false, pctMin: 0 },
  { id: 'silver',   labelFr: 'ARGENT',    labelEn: 'SILVER',   color: '#d7dce2', glow: false, pctMin: 10 },
  { id: 'gold',     labelFr: 'OR',        labelEn: 'GOLD',     color: '#ffd75e', glow: false, pctMin: 25 },
  { id: 'emerald',  labelFr: 'ÉMERAUDE',  labelEn: 'EMERALD',  color: '#50e878', glow: true,  pctMin: 75 },
  { id: 'sapphire', labelFr: 'SAPHIR',    labelEn: 'SAPPHIRE', color: '#7ab0ff', glow: true,  pctMin: 85 },
  { id: 'ruby',     labelFr: 'RUBIS',     labelEn: 'RUBY',     color: '#ff6080', glow: true,  pctMin: 91 },
  { id: 'amethyst', labelFr: 'AMÉTHYSTE', labelEn: 'AMETHYST', color: '#cc99ff', glow: true,  pctMin: 95 },
  { id: 'diamond',  labelFr: 'DIAMANT',   labelEn: 'DIAMOND',  color: '#8ee6ff', glow: true,  pctMin: 97.5 },
  { id: 'legend',   labelFr: 'LÉGENDE',   labelEn: 'LEGEND',   color: '#e0b0ff', glow: true,  pctMin: 99 },
];

/** Minimum games played to receive above Bronze. */
export const MIN_GAMES_FOR_TIER = 3;

/**
 * Les hauts tiers demandent assez de matchs joués. Le minimum suit la saison :
 * pct × (moyenne de matchs joués par équipe), jamais moins que `floor`.
 * Un joueur sans assez de matchs reste au tier en dessous.
 */
export const TIER_GAMES_GATE = {
  sapphire: { pct: 0.30, floor: 4 },
  ruby:     { pct: 0.40, floor: 6 },
  amethyst: { pct: 0.50, floor: 7 },
  diamond:  { pct: 0.60, floor: 8 },
  legend:   { pct: 0.85, floor: 12 },
};

/** Maximum de Légendes par catégorie. */
export const MAX_LEGENDS_PER_CATEGORY = 2;

/** Matchs requis pour un tier, selon la moyenne de matchs joués par équipe. */
export function requiredGamesForTier(tierId, avgTeamGames) {
  const g = TIER_GAMES_GATE[tierId];
  if (!g) return MIN_GAMES_FOR_TIER;
  return Math.max(g.floor, Math.ceil(g.pct * (avgTeamGames || 0)));
}

/** Le plus bas des deux tiers. */
export function minTier(a, b) {
  const ia = CARD_TIERS.findIndex(t => t.id === a), ib = CARD_TIERS.findIndex(t => t.id === b);
  return CARD_TIERS[Math.max(0, Math.min(ia, ib))].id;
}

/** Descend le tier jusqu'à ce que le joueur ait assez de matchs. */
export function applyGamesGate(tierId, gp, avgTeamGames) {
  let idx = CARD_TIERS.findIndex(t => t.id === tierId);
  while (idx > 0 && gp < requiredGamesForTier(CARD_TIERS[idx].id, avgTeamGames)) idx--;
  return CARD_TIERS[Math.max(0, idx)].id;
}

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
 * Moyenne minimum par match pour chaque tier. Sert de seuils fixes quand la ligue
 * est trop petite, ET de plancher partout : un joueur ne monte jamais plus haut que
 * sa moyenne le permet (ex. 4 points seulement = Argent max), même si son rang est bon.
 *
 * Fixed per-game average score thresholds — used when a category group is too
 * small for meaningful percentile comparison.
 * Calibrated for basketball (pts×1 + reb×1 + ast×1.5 + stl×2 + blk×2 − to×1).
 */
export const FIXED_TIER_THRESHOLDS = [
  { id: 'bronze',   minScore: 0  },
  { id: 'silver',   minScore: 4  },
  { id: 'gold',     minScore: 7  },
  { id: 'emerald',  minScore: 11 },
  { id: 'sapphire', minScore: 14 },
  { id: 'ruby',     minScore: 17 },
  { id: 'amethyst', minScore: 21 },
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
