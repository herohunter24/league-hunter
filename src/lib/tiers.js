/**
 * tiers.js — re-exports the card tier system for backwards-compat imports.
 *
 * App.jsx, PlayerCard.jsx and PlayerModal.jsx import TIERS/TIER_ORDER/TIER_COLOR/
 * TIER_GLOW from here. All authoritative definitions now live in
 * src/config/cardTiers.js.
 */
import { CARD_TIERS } from '../config/cardTiers.js';

// Shape expected by PlayerCard.jsx: { [id]: { label, cls } }
export const TIERS = Object.fromEntries(
  CARD_TIERS.map(t => [t.id, { label: t.labelEn, labelFr: t.labelFr, cls: `t-${t.id}` }])
);

// Highest to lowest (used for sorting tiebreaks)
export const TIER_ORDER = [...CARD_TIERS].reverse().map(t => t.id);

export const TIER_COLOR = Object.fromEntries(CARD_TIERS.map(t => [t.id, t.color]));

export const TIER_GLOW  = Object.fromEntries(
  CARD_TIERS.filter(t => t.glow).map(t => [t.id, 1])
);

// Re-export helpers so legacy call-sites still work
export { getTierIdByPct, getPlayerProgression, CARD_TIERS, TIER_ICON } from '../config/cardTiers.js';
