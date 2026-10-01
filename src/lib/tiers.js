export const TIERS = {
  bronze:   { label: 'BRONZE',   cls: 't-bronze' },
  silver:   { label: 'SILVER',   cls: 't-silver' },
  gold:     { label: 'GOLD',     cls: 't-gold' },
  platinum: { label: 'PLATINUM', cls: 't-platinum' },
  diamond:  { label: 'DIAMOND',  cls: 't-diamond' },
  champion: { label: 'CHAMPION', cls: 't-champion' },
  legend:   { label: 'LEGEND',   cls: 't-legend' },
};

export const TIER_ORDER = ['legend','champion','diamond','platinum','gold','silver','bronze'];

export const TIER_COLOR = {
  bronze: '#cd9858', silver: '#d7dce2', gold: '#ffd75e',
  platinum: '#e6ebf1', diamond: '#8ee6ff', champion: '#ffd24a', legend: '#ffcc66',
};

export const TIER_GLOW = { diamond: 1, champion: 1, legend: 1 };

export const RANK_TIERS = [
  { id: 'bronze',   minRP: 0    },
  { id: 'silver',   minRP: 150  },
  { id: 'gold',     minRP: 450  },
  { id: 'platinum', minRP: 1000 },
  { id: 'diamond',  minRP: 2200 },
  { id: 'elite',    minRP: 4500 },
  { id: 'legend',   minRP: 9000 },
];

// Platform tier ids → NLS card frames ("elite" wears the CHAMPION frame)
export const TIER_TO_NLS = {
  bronze: 'bronze', silver: 'silver', gold: 'gold', platinum: 'platinum',
  diamond: 'diamond', elite: 'champion', legend: 'legend',
};

export const NLS_TIER_ICON = {
  bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '🏅',
  diamond: '💎', champion: '🏆', legend: '👑',
};
