'use strict';
/**
 * Multi-tab safety tests for writeLeagueNow.
 *
 * Reproduces the game-deletion bug:
 *   Tab A loads (subcolData seeded from Firestore, includes Tab B's new games).
 *   Tab A discards its dirty state (restores from stale localStorage).
 *   Tab A saves something unrelated → diff must NOT delete Tab B's games.
 *
 * These tests run the pure diff logic extracted from writeLeagueNow, without Firebase.
 */

const assert = require('assert');
const { describe, it } = require('node:test');

/**
 * Pure simulation of the three delete loops in writeLeagueNow.
 *
 * @param {Object} prev        subcolData.current[lid] at write time
 * @param {Object} newGames    Object.fromEntries of updated.schedule
 * @param {Object} newTeams    Object.fromEntries of updated.teams
 * @param {Object} newPlayers  Object.fromEntries of updated.players
 * @param {Object|null} pending  pendingDeletes.current[lid] (null = no guard, simulates old code)
 * @returns {{ games: string[], teams: string[], players: string[] }} ids that would be deleted
 */
function simulateDiffDeletes(prev, newGames, newTeams, newPlayers, pending) {
  const pdGames   = pending ? (pending.games   || new Set()) : null;
  const pdTeams   = pending ? (pending.teams   || new Set()) : null;
  const pdPlayers = pending ? (pending.players || new Set()) : null;

  const delGames   = [];
  const delTeams   = [];
  const delPlayers = [];

  for (const gid of Object.keys(prev.games || {})) {
    const missing = !newGames[gid];
    if (missing && (pdGames === null || pdGames.has(gid))) delGames.push(gid);
  }
  for (const tid of Object.keys(prev.teams || {})) {
    const missing = !newTeams[tid];
    if (missing && (pdTeams === null || pdTeams.has(tid))) delTeams.push(tid);
  }
  for (const pid of Object.keys(prev.players || {})) {
    const missing = !newPlayers[pid];
    if (missing && (pdPlayers === null || pdPlayers.has(pid))) delPlayers.push(pid);
  }

  return { games: delGames, teams: delTeams, players: delPlayers };
}

// ──────────────────────────────────────────────────────────────────────────────
describe('multi-tab safety — writeLeagueNow delete guard', () => {

  it('BUG REPRODUCED: without pendingDeletes, stale Tab A deletes Tab B’s games', () => {
    // subcolData seeded from Firestore (fresh — includes g1, g2, g3 added by Tab B)
    const subcolPrev = {
      games:   { g_orig: { id: 'g_orig' }, g1: { id: 'g1' }, g2: { id: 'g2' }, g3: { id: 'g3' } },
      teams:   {},
      players: {},
    };
    // Tab A's in-memory state was restored from stale localStorage (only g_orig)
    const staleGames = { g_orig: { id: 'g_orig' } };

    const { games } = simulateDiffDeletes(subcolPrev, staleGames, {}, {}, null /* no guard */);
    assert.ok(games.includes('g1'), 'g1 deleted — bug reproduced');
    assert.ok(games.includes('g2'), 'g2 deleted — bug reproduced');
    assert.ok(games.includes('g3'), 'g3 deleted — bug reproduced');
  });

  it('FIX: with pendingDeletes empty, stale Tab A does NOT delete Tab B’s games', () => {
    const subcolPrev = {
      games:   { g_orig: { id: 'g_orig' }, g1: { id: 'g1' }, g2: { id: 'g2' }, g3: { id: 'g3' } },
      teams:   {},
      players: {},
    };
    const staleGames = { g_orig: { id: 'g_orig' } };
    const emptyPending = { games: new Set(), teams: new Set(), players: new Set() };

    const { games } = simulateDiffDeletes(subcolPrev, staleGames, {}, {}, emptyPending);
    assert.strictEqual(games.length, 0, 'No games deleted — fix works');
  });

  it('FIX: explicitly deleted game IS removed from Firestore', () => {
    const subcolPrev = {
      games:   { g_orig: { id: 'g_orig' }, g_del: { id: 'g_del' } },
      teams:   {},
      players: {},
    };
    // User deleted g_del in this session; g_orig kept
    const newGames = { g_orig: { id: 'g_orig' } };
    const pending = { games: new Set(['g_del']), teams: new Set(), players: new Set() };

    const { games } = simulateDiffDeletes(subcolPrev, newGames, {}, {}, pending);
    assert.ok(games.includes('g_del'),  'g_del deleted — explicit delete works');
    assert.ok(!games.includes('g_orig'), 'g_orig not deleted');
  });

  it('FIX: discardDirty re-seeds subcolData so Tab A’s next save sees consistent state', () => {
    // Before discardDirty: subcolData is fresh (has g_new from Tab B), leagues is stale.
    // After discardDirty: subcolData is re-seeded from stale localStorage → no mismatch.
    const staleSchedule = [{ id: 'g_orig' }];

    // Simulate re-seed from localStorage (same as the new discardDirty implementation)
    const reseededPrev = {
      games:   Object.fromEntries(staleSchedule.map(g => [String(g.id), g])),
      teams:   {},
      players: {},
    };
    const staleGames = Object.fromEntries(staleSchedule.map(g => [String(g.id), g]));
    const emptyPending = { games: new Set(), teams: new Set(), players: new Set() };

    const { games } = simulateDiffDeletes(reseededPrev, staleGames, {}, {}, emptyPending);
    assert.strictEqual(games.length, 0, 'No spurious deletions after re-seed');
  });

  it('FIX: teams and players are also protected', () => {
    const subcolPrev = {
      games:   {},
      teams:   { t_orig: { id: 't_orig' }, t_new: { id: 't_new' } },
      players: { p_orig: { id: 'p_orig' }, p_new: { id: 'p_new' } },
    };
    const newTeams   = { t_orig: { id: 't_orig' } };
    const newPlayers = { p_orig: { id: 'p_orig' } };
    const emptyPending = { games: new Set(), teams: new Set(), players: new Set() };

    const { teams, players } = simulateDiffDeletes(subcolPrev, {}, newTeams, newPlayers, emptyPending);
    assert.strictEqual(teams.length,   0, 't_new not deleted without explicit mark');
    assert.strictEqual(players.length, 0, 'p_new not deleted without explicit mark');
  });

  it('FIX: explicit team + player deletions still work', () => {
    const subcolPrev = {
      games:   {},
      teams:   { t_del: { id: 't_del' }, t_keep: { id: 't_keep' } },
      players: { p_del: { id: 'p_del' }, p_keep: { id: 'p_keep' } },
    };
    const newTeams   = { t_keep: { id: 't_keep' } };
    const newPlayers = { p_keep: { id: 'p_keep' } };
    const pending = { games: new Set(), teams: new Set(['t_del']), players: new Set(['p_del']) };

    const { teams, players } = simulateDiffDeletes(subcolPrev, {}, newTeams, newPlayers, pending);
    assert.ok(teams.includes('t_del'),    't_del deleted');
    assert.ok(!teams.includes('t_keep'),  't_keep not deleted');
    assert.ok(players.includes('p_del'),  'p_del deleted');
    assert.ok(!players.includes('p_keep'), 'p_keep not deleted');
  });

  it('FIX: stripUndefined removes undefined values from player docs', () => {
    // Simulates saveEditPlayer with no height/weight — undefined must not reach Firestore
    function stripUndefined(obj) {
      if (Array.isArray(obj)) return obj.map(stripUndefined);
      if (obj !== null && typeof obj === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
          if (v !== undefined) out[k] = stripUndefined(v);
        }
        return out;
      }
      return obj;
    }

    const playerWithNoHeight = { id: 1, name: 'Thierry', height: undefined, weight: undefined, team: 'Raptors' };
    const cleaned = stripUndefined(playerWithNoHeight);

    assert.ok(!Object.prototype.hasOwnProperty.call(cleaned, 'height'), 'height key removed');
    assert.ok(!Object.prototype.hasOwnProperty.call(cleaned, 'weight'), 'weight key removed');
    assert.strictEqual(cleaned.name, 'Thierry', 'other fields preserved');

    // Nested objects also stripped
    const nested = { player: { stats: { pts: 10, extra: undefined } }, tag: undefined };
    const cleanedNested = stripUndefined(nested);
    assert.ok(!Object.prototype.hasOwnProperty.call(cleanedNested, 'tag'), 'top-level undefined removed');
    assert.ok(!Object.prototype.hasOwnProperty.call(cleanedNested.player.stats, 'extra'), 'nested undefined removed');
    assert.strictEqual(cleanedNested.player.stats.pts, 10, 'nested defined value preserved');
  });

  it('FIX: writeLeagueNow returns false on batch failure → callers suppress success toast', () => {
    // Simulates the return-value contract: ok === false means error toast, not success toast
    let toastShown = null;
    function fakeShowToast(msg, type) { toastShown = { msg, type }; }

    async function fakeWriteLeagueNow() { return false; }

    async function fakeConfirmSave() {
      const ok = await fakeWriteLeagueNow();
      if (ok === false) { fakeShowToast("Erreur : la sauvegarde a échoué — réessaie", "error"); return; }
      fakeShowToast("Enregistré", "success");
    }

    return fakeConfirmSave().then(() => {
      assert.strictEqual(toastShown?.type, 'error', 'error toast shown on failure');
      assert.ok(toastShown?.msg.includes('échoué'), 'error message mentions failure');
    });
  });
});
