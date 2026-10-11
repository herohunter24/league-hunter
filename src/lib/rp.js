/**
 * rp.js — legacy entry point kept for backwards compatibility.
 *
 * calcPlayerRP  → moved to src/config/sportScores.js (basketball implementation)
 * getTierId     → replaced by getTierIdByPct in src/config/cardTiers.js
 * getPlayerProgression → moved to src/config/cardTiers.js
 *
 * Re-exported here so any existing import { … } from './rp.js' still compiles.
 */
export { getTierIdByPct as getTierId, getPlayerProgression } from '../config/cardTiers.js';
export { getScoreFn } from '../config/sportScores.js';

// calcPlayerRP is still exported for any direct callers (e.g. demo.js, tests)
export { sportScores } from '../config/sportScores.js';

import { sportScores as _ss } from '../config/sportScores.js';
export const calcPlayerRP = _ss.basketball;
