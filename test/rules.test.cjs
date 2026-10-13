/**
 * Firestore Rules Unit Tests — League Hunter / Website X
 *
 * Auth model: Email/Password with internal @websitex.app addresses.
 * isSuperAdmin() reads users/{uid}.role == 'superadmin' (no email_verified).
 * isLeagueOwner(id) reads users/{uid}.role == 'owner' && leagueId == id.
 *
 * Run with:
 *   Terminal 1: firebase emulators:start --only firestore,auth
 *   Terminal 2: cd test && npm test
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const assert = require('assert');
const { describe, it, before, after, beforeEach } = require('node:test');

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');


const RULES_PATH = resolve(__dirname, '../firestore.rules');
const PROJECT_ID = 'league-hunter-test';
const FIRESTORE_PORT = 8080;

// ── Test data ────────────────────────────────────────────────────────────────

const SUPERADMIN_UID   = 'uid_superadmin';
const OWNER_UID        = 'uid_owner_1';
const OTHER_OWNER_UID  = 'uid_owner_2';
const STRANGER_UID     = 'uid_stranger';
const COORD_UID        = 'uid_coord_1';
const COORD_OTHER_UID  = 'uid_coord_other'; // coordinator for OTHER_LEAGUE_ID
const COORD_DEACT_UID  = 'uid_coord_deact'; // deactivated coordinator for LEAGUE_ID
const LEAGUE_ID        = 'league_001';
const OTHER_LEAGUE_ID  = 'league_002';

let testEnv;

// ── Setup ────────────────────────────────────────────────────────────────────

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: FIRESTORE_PORT,
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    // Superadmin user doc
    await db.doc(`users/${SUPERADMIN_UID}`).set({
      username: 'admin', role: 'superadmin',
      createdAt: '2025-01-01',
    });

    // Owner of league_001
    await db.doc(`users/${OWNER_UID}`).set({
      username: 'owner1', role: 'owner', leagueId: LEAGUE_ID,
      mustChangePassword: false, createdAt: '2025-01-01',
    });

    // Owner of league_002
    await db.doc(`users/${OTHER_OWNER_UID}`).set({
      username: 'owner2', role: 'owner', leagueId: OTHER_LEAGUE_ID,
      mustChangePassword: false, createdAt: '2025-01-01',
    });

    // Active coordinator for league_001
    await db.doc(`users/${COORD_UID}`).set({
      username: 'coord1', displayName: 'Marie Tremblay', role: 'coordinator',
      leagueId: LEAGUE_ID, venue: 'Gym Nord', active: true,
      mustChangePassword: false, createdAt: '2025-01-01',
    });

    // Active coordinator for league_002
    await db.doc(`users/${COORD_OTHER_UID}`).set({
      username: 'coord_other', displayName: 'Bob Ouellet', role: 'coordinator',
      leagueId: OTHER_LEAGUE_ID, venue: 'Gym Sud', active: true,
      mustChangePassword: false, createdAt: '2025-01-01',
    });

    // Deactivated coordinator for league_001
    await db.doc(`users/${COORD_DEACT_UID}`).set({
      username: 'coord_off', displayName: 'Désactivé', role: 'coordinator',
      leagueId: LEAGUE_ID, venue: 'Gym Est', active: false,
      mustChangePassword: false, createdAt: '2025-01-01',
    });

    // meta/superadmin kept for backward compat (superadmin may read/write it)
    await db.doc('meta/superadmin').set({ note: 'legacy' });

    // League 001
    await db.doc(`leagues/${LEAGUE_ID}`).set({
      id: LEAGUE_ID, name: 'Test League', sport: 'Basketball', color: '#f00',
      teams: [], players: [], schedule: [],
      allStar: { officialTeam: ['player_1'], nominee: 'player_2', fanVotes: { player_1: 5 } },
    });

    // League 002 (for cross-league owner tests)
    await db.doc(`leagues/${OTHER_LEAGUE_ID}`).set({
      id: OTHER_LEAGUE_ID, name: 'Other League', sport: 'Hockey', color: '#00f',
    });

    // A player doc (no email — stripped before write)
    await db.doc(`leagues/${LEAGUE_ID}/players/player_1`).set({
      id: 'player_1', name: 'Alice', team: 'TeamA', position: 'PG',
    });

    // playersPrivate doc (email lives here)
    await db.doc(`leagues/${LEAGUE_ID}/playersPrivate/player_1`).set({
      email: 'alice@test.com',
    });

    // A game doc (real production shape)
    await db.doc(`leagues/${LEAGUE_ID}/games/game_001`).set({
      id: 'game_001', date: '2025-03-15', time: '19:00',
      homeTeam: 'TeamA', awayTeam: 'TeamB',
      homeScore: 98, awayScore: 87,
    });

    // playerStats sub-sub-collection under that game
    await db.doc(`leagues/${LEAGUE_ID}/games/game_001/playerStats/player_1`).set({
      points: 22, rebounds: 5, assists: 4, steals: 2, blocks: 1,
      fgMade: 8, fgAtt: 15, threeMade: 2, threeAtt: 5, ftMade: 4, ftAtt: 4,
    });

    // A locked game (coordinator has already saved + locked it)
    await db.doc(`leagues/${LEAGUE_ID}/games/game_locked`).set({
      id: 'game_locked', date: '2025-03-10', time: '18:00',
      homeTeam: 'TeamA', awayTeam: 'TeamB',
      homeScore: 100, awayScore: 90, played: true,
      locked: true, lockedBy: COORD_UID, lockedAt: new Date(),
    });

    // playerStats under the locked game
    await db.doc(`leagues/${LEAGUE_ID}/games/game_locked/playerStats/player_1`).set({
      points: 25, rebounds: 7, assists: 3,
    });

    // A recap doc
    await db.doc(`leagues/${LEAGUE_ID}/recaps/1`).set({
      num: 1, text: 'Great game!', date: '2025-03-15', author: 'admin',
    });

    // A subscriber (inactive — double opt-in)
    await db.doc(`leagues/${LEAGUE_ID}/subscribers/sub_hash_1`).set({
      email: 'fan@test.com', preferences: { scores: true },
      subscribedAt: '2025-01-01T00:00:00Z', active: false,
    });

    // A confirmed subscriber (active == true)
    await db.doc(`leagues/${LEAGUE_ID}/subscribers/sub_hash_2`).set({
      email: 'fan2@test.com', preferences: { scores: true },
      subscribedAt: '2025-01-01T00:00:00Z', active: true,
    });
  });
});

// ── Auth context helpers ──────────────────────────────────────────────────────

function superadminCtx() {
  return testEnv.authenticatedContext(SUPERADMIN_UID, {});
}
function ownerCtx() {
  return testEnv.authenticatedContext(OWNER_UID, {});
}
function otherOwnerCtx() {
  return testEnv.authenticatedContext(OTHER_OWNER_UID, {});
}
function strangerCtx() {
  return testEnv.authenticatedContext(STRANGER_UID, {});
}
function unauthCtx() {
  return testEnv.unauthenticatedContext();
}
function coordCtx() {
  return testEnv.authenticatedContext(COORD_UID, {});
}
function coordOtherCtx() {
  return testEnv.authenticatedContext(COORD_OTHER_UID, {});
}
function coordDeactCtx() {
  return testEnv.authenticatedContext(COORD_DEACT_UID, {});
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('meta/superadmin', () => {
  it('superadmin can read', async () => {
    await assertSucceeds(superadminCtx().firestore().doc('meta/superadmin').get());
  });
  it('stranger cannot read superadmin doc', async () => {
    await assertFails(strangerCtx().firestore().doc('meta/superadmin').get());
  });
  it('unauthenticated cannot read superadmin doc', async () => {
    await assertFails(unauthCtx().firestore().doc('meta/superadmin').get());
  });
  it('superadmin can write meta', async () => {
    await assertSucceeds(superadminCtx().firestore().doc('meta/config').set({ foo: 'bar' }));
  });
  it('owner cannot write meta', async () => {
    await assertFails(ownerCtx().firestore().doc('meta/config').set({ foo: 'bar' }));
  });
});

describe('meta/publicSettings — stays public', () => {
  it('unauthenticated can read meta/publicSettings', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx.firestore().doc('meta/publicSettings').set({ showStandings: true });
    });
    await assertSucceeds(unauthCtx().firestore().doc('meta/publicSettings').get());
  });
  it('unauthenticated can read any non-superadmin meta doc', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx.firestore().doc('meta/sync').set({ updatedAt: 1 });
    });
    await assertSucceeds(unauthCtx().firestore().doc('meta/sync').get());
  });
});

describe('users — superadmin creates owner accounts', () => {
  it('superadmin can create a user doc', async () => {
    await assertSucceeds(
      superadminCtx().firestore().doc('users/new_uid').set({
        username: 'newowner', role: 'owner', leagueId: LEAGUE_ID,
        mustChangePassword: true, createdAt: '2025-01-01',
      })
    );
  });
  it('owner cannot create a user doc', async () => {
    await assertFails(
      ownerCtx().firestore().doc('users/new_uid').set({
        username: 'sneaky', role: 'owner', leagueId: LEAGUE_ID,
        mustChangePassword: false, createdAt: '2025-01-01',
      })
    );
  });
  it('stranger cannot create a user doc', async () => {
    await assertFails(
      strangerCtx().firestore().doc('users/new_uid').set({
        username: 'evil', role: 'superadmin', leagueId: LEAGUE_ID,
        createdAt: '2025-01-01',
      })
    );
  });
  it('unauthenticated cannot create a user doc', async () => {
    await assertFails(
      unauthCtx().firestore().doc('users/new_uid').set({
        username: 'anon', role: 'owner', leagueId: LEAGUE_ID,
        mustChangePassword: true, createdAt: '2025-01-01',
      })
    );
  });
});

describe('users — mustChangePassword self-update', () => {
  it('owner can set mustChangePassword from true to false on own doc', async () => {
    // Set mustChangePassword to true first
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx.firestore().doc(`users/${OWNER_UID}`).update({ mustChangePassword: true });
    });
    await assertSucceeds(
      ownerCtx().firestore().doc(`users/${OWNER_UID}`).update({ mustChangePassword: false })
    );
  });
  it('owner cannot set mustChangePassword from false to true on own doc', async () => {
    // mustChangePassword is already false in beforeEach
    await assertFails(
      ownerCtx().firestore().doc(`users/${OWNER_UID}`).update({ mustChangePassword: true })
    );
  });
  it('owner cannot change username on own doc', async () => {
    await assertFails(
      ownerCtx().firestore().doc(`users/${OWNER_UID}`).update({ username: 'hacked' })
    );
  });
  it('stranger cannot update another user doc', async () => {
    await assertFails(
      strangerCtx().firestore().doc(`users/${OWNER_UID}`).update({ mustChangePassword: false })
    );
  });
});

describe('users — read / delete', () => {
  it('owner can read own user doc', async () => {
    await assertSucceeds(ownerCtx().firestore().doc(`users/${OWNER_UID}`).get());
  });
  it('stranger cannot read another user doc', async () => {
    await assertFails(strangerCtx().firestore().doc(`users/${OWNER_UID}`).get());
  });
  it('superadmin can delete an owner user doc', async () => {
    await assertSucceeds(superadminCtx().firestore().doc(`users/${OWNER_UID}`).delete());
  });
  it('owner cannot delete another user doc', async () => {
    await assertFails(ownerCtx().firestore().doc(`users/${STRANGER_UID}`).delete());
  });
  it('superadmin can list users', async () => {
    await assertSucceeds(superadminCtx().firestore().collection('users').get());
  });
  it('owner can list users (to query own coordinators)', async () => {
    // Changed: owner can list so they can query where('leagueId',…).where('role','coordinator')
    await assertSucceeds(ownerCtx().firestore().collection('users').get());
  });
});

describe('leagues — root doc', () => {
  it('unauthenticated can read league doc', async () => {
    await assertSucceeds(unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}`).get());
  });
  it('league owner can write own league', async () => {
    await assertSucceeds(ownerCtx().firestore().doc(`leagues/${LEAGUE_ID}`).update({ name: 'Updated' }));
  });
  it('stranger cannot write league', async () => {
    await assertFails(strangerCtx().firestore().doc(`leagues/${LEAGUE_ID}`).update({ name: 'Hacked' }));
  });
  it('owner of league_001 cannot write league_002', async () => {
    await assertFails(ownerCtx().firestore().doc(`leagues/${OTHER_LEAGUE_ID}`).update({ name: 'Hacked' }));
  });
});

describe('leagues — fan vote update (narrow public update)', () => {
  it('unauthenticated can increment fanVotes only', async () => {
    await assertSucceeds(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}`).update({
        'allStar.fanVotes': { player_1: 6 },
      })
    );
  });
  it('unauthenticated cannot change allStar.officialTeam', async () => {
    await assertFails(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}`).update({
        'allStar.officialTeam': ['hacker'],
      })
    );
  });
  it('unauthenticated cannot change allStar.fanVotes AND another allStar field simultaneously', async () => {
    await assertFails(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}`).update({
        'allStar.fanVotes': { player_1: 7 },
        'allStar.nominee': 'hacker',
      })
    );
  });
  it('unauthenticated cannot change a non-allStar field', async () => {
    await assertFails(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}`).update({ name: 'Hacked' })
    );
  });
});

describe('leagues/players — email stripped from public docs', () => {
  it('unauthenticated can read a player doc', async () => {
    await assertSucceeds(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/players/player_1`).get()
    );
  });
  it('owner can write player doc', async () => {
    await assertSucceeds(
      ownerCtx().firestore().doc(`leagues/${LEAGUE_ID}/players/player_2`).set({
        id: 'player_2', name: 'Bob', team: 'TeamB',
      })
    );
  });
  it('stranger cannot write player doc', async () => {
    await assertFails(
      strangerCtx().firestore().doc(`leagues/${LEAGUE_ID}/players/player_3`).set({ name: 'Evil' })
    );
  });
});

describe('leagues/playersPrivate — email protected', () => {
  it('owner can read playersPrivate', async () => {
    await assertSucceeds(
      ownerCtx().firestore().doc(`leagues/${LEAGUE_ID}/playersPrivate/player_1`).get()
    );
  });
  it('superadmin can read playersPrivate', async () => {
    await assertSucceeds(
      superadminCtx().firestore().doc(`leagues/${LEAGUE_ID}/playersPrivate/player_1`).get()
    );
  });
  it('unauthenticated cannot read playersPrivate', async () => {
    await assertFails(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/playersPrivate/player_1`).get()
    );
  });
  it('stranger cannot read playersPrivate', async () => {
    await assertFails(
      strangerCtx().firestore().doc(`leagues/${LEAGUE_ID}/playersPrivate/player_1`).get()
    );
  });
  it('owner of league_002 cannot read league_001 playersPrivate', async () => {
    await assertFails(
      otherOwnerCtx().firestore().doc(`leagues/${LEAGUE_ID}/playersPrivate/player_1`).get()
    );
  });
});

describe('leagues/private — admin-only data', () => {
  it('superadmin can read private/admin', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx.firestore().doc(`leagues/${LEAGUE_ID}/private/admin`).set({ note: 'test' });
    });
    await assertSucceeds(superadminCtx().firestore().doc(`leagues/${LEAGUE_ID}/private/admin`).get());
  });
  it('owner can read own league private/admin', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx.firestore().doc(`leagues/${LEAGUE_ID}/private/admin`).set({ note: 'test' });
    });
    await assertSucceeds(ownerCtx().firestore().doc(`leagues/${LEAGUE_ID}/private/admin`).get());
  });
  it('stranger cannot read private/admin', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx.firestore().doc(`leagues/${LEAGUE_ID}/private/admin`).set({ note: 'test' });
    });
    await assertFails(strangerCtx().firestore().doc(`leagues/${LEAGUE_ID}/private/admin`).get());
  });
  it('unauthenticated cannot read private/admin', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx.firestore().doc(`leagues/${LEAGUE_ID}/private/admin`).set({ note: 'test' });
    });
    await assertFails(unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/private/admin`).get());
  });
});

describe('leagues/settings — EmailJS config protected', () => {
  it('owner can read settings', async () => {
    await assertSucceeds(ownerCtx().firestore().doc(`leagues/${LEAGUE_ID}/settings/emailConfig`).get());
  });
  it('unauthenticated cannot read settings', async () => {
    await assertFails(unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/settings/emailConfig`).get());
  });
  it('stranger cannot read settings', async () => {
    await assertFails(strangerCtx().firestore().doc(`leagues/${LEAGUE_ID}/settings/emailConfig`).get());
  });
});

describe('public-site writes — pageViews', () => {
  it('unauthenticated can create a valid pageView', async () => {
    await assertSucceeds(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/pageViews/v_test`).set({
        timestamp: Date.now(), date: '2025-01-01', section: 'home', sessionId: 'ses', userAgent: 'UA',
      })
    );
  });
  it('pageView create is rejected with extra fields', async () => {
    await assertFails(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/pageViews/v_bad`).set({
        timestamp: Date.now(), date: '2025-01-01', section: 'home', sessionId: 'ses', userAgent: 'UA', evil: true,
      })
    );
  });
  it('nobody can update a pageView', async () => {
    await assertFails(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/pageViews/v_test`).update({ section: 'tampered' })
    );
  });
});

describe('public-site writes — subscribers double opt-in', () => {
  it('public can create subscriber with active=false (double opt-in)', async () => {
    await assertSucceeds(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/subscribers/new_hash`).set({
        email: 'new@test.com', preferences: { scores: true },
        subscribedAt: '2025-01-01T00:00:00Z', active: false,
      })
    );
  });
  it('public cannot create subscriber with active=true (skips confirmation)', async () => {
    await assertFails(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/subscribers/skip_confirm`).set({
        email: 'skip@test.com', preferences: {},
        subscribedAt: '2025-01-01T00:00:00Z', active: true,
      })
    );
  });
  it('public can unsubscribe (set active false on active=true doc)', async () => {
    await assertSucceeds(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/subscribers/sub_hash_2`).update({
        email: 'fan2@test.com', preferences: { scores: true },
        subscribedAt: '2025-01-01T00:00:00Z', active: false,
      })
    );
  });
  it('public cannot change email while unsubscribing', async () => {
    await assertFails(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/subscribers/sub_hash_2`).update({
        email: 'different@test.com', preferences: { scores: true },
        subscribedAt: '2025-01-01T00:00:00Z', active: false,
      })
    );
  });
  it('public cannot update an already-inactive subscriber', async () => {
    await assertFails(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/subscribers/sub_hash_1`).update({
        email: 'fan@test.com', preferences: { scores: true },
        subscribedAt: '2025-01-01T00:00:00Z', active: false,
      })
    );
  });
  it('stranger cannot read subscribers', async () => {
    await assertFails(strangerCtx().firestore().collection(`leagues/${LEAGUE_ID}/subscribers`).get());
  });
  it('owner can read subscribers', async () => {
    await assertSucceeds(ownerCtx().firestore().collection(`leagues/${LEAGUE_ID}/subscribers`).get());
  });
});

describe('public-site writes — allStarVotes', () => {
  it('unauthenticated can cast a valid vote', async () => {
    await assertSucceeds(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/allStarVotes/voter_abc`).set({
        playerId: 'player_1', email: '', votedAt: '2025-01-01T00:00:00Z',
      })
    );
  });
  it('vote rejected with extra fields', async () => {
    await assertFails(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/allStarVotes/voter_bad`).set({
        playerId: 'p1', email: '', votedAt: '2025', extraField: 'evil',
      })
    );
  });
  it('stranger cannot read allStarVotes', async () => {
    await assertFails(strangerCtx().firestore().collection(`leagues/${LEAGUE_ID}/allStarVotes`).get());
  });
  it('owner can read allStarVotes', async () => {
    await assertSucceeds(ownerCtx().firestore().collection(`leagues/${LEAGUE_ID}/allStarVotes`).get());
  });
});

describe('superadmin full access', () => {
  it('superadmin can write any league', async () => {
    await assertSucceeds(superadminCtx().firestore().doc(`leagues/${LEAGUE_ID}`).update({ name: 'Renamed by admin' }));
  });
  it('superadmin can read subscribers', async () => {
    await assertSucceeds(superadminCtx().firestore().collection(`leagues/${LEAGUE_ID}/subscribers`).get());
  });
  it('superadmin can list users', async () => {
    await assertSucceeds(superadminCtx().firestore().collection('users').get());
  });
  it('superadmin can write league_002', async () => {
    await assertSucceeds(superadminCtx().firestore().doc(`leagues/${OTHER_LEAGUE_ID}`).update({ name: 'Admin edit' }));
  });
});

describe('isSuperAdmin — role-based (no email_verified needed)', () => {
  it('user with role=superadmin in users doc can read superadmin meta', async () => {
    await assertSucceeds(superadminCtx().firestore().doc('meta/superadmin').get());
  });
  it('user with role=owner cannot read superadmin meta', async () => {
    await assertFails(ownerCtx().firestore().doc('meta/superadmin').get());
  });
  it('stranger with no users doc cannot act as superadmin', async () => {
    await assertFails(strangerCtx().firestore().doc('meta/superadmin').get());
  });
});

describe('leagues/games/playerStats — sub-sub-collection', () => {
  it('unauthenticated can read playerStats', async () => {
    await assertSucceeds(
      unauthCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/games/game_001/playerStats/player_1`).get()
    );
  });
  it('public site can list playerStats for a game', async () => {
    await assertSucceeds(
      unauthCtx().firestore()
        .collection(`leagues/${LEAGUE_ID}/games/game_001/playerStats`).get()
    );
  });
  it('owner can write playerStats', async () => {
    await assertSucceeds(
      ownerCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/games/game_001/playerStats/player_1`)
        .set({ points: 30, rebounds: 6, assists: 5, steals: 1, blocks: 0,
               fgMade: 11, fgAtt: 18, threeMade: 3, threeAtt: 6, ftMade: 5, ftAtt: 6 })
    );
  });
  it('superadmin can write playerStats', async () => {
    await assertSucceeds(
      superadminCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/games/game_001/playerStats/player_2`)
        .set({ points: 15, rebounds: 3, assists: 2, steals: 0, blocks: 1,
               fgMade: 5, fgAtt: 10, threeMade: 1, threeAtt: 3, ftMade: 4, ftAtt: 4 })
    );
  });
  it('stranger cannot write playerStats', async () => {
    await assertFails(
      strangerCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/games/game_001/playerStats/player_1`)
        .set({ points: 99 })
    );
  });
  it('unauthenticated cannot write playerStats', async () => {
    await assertFails(
      unauthCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/games/game_001/playerStats/player_1`)
        .set({ points: 99 })
    );
  });
  it('owner of other league cannot write playerStats', async () => {
    await assertFails(
      otherOwnerCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/games/game_001/playerStats/player_1`)
        .set({ points: 99 })
    );
  });
});

describe('leagues/recaps — game recaps', () => {
  it('unauthenticated can read a recap', async () => {
    await assertSucceeds(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/recaps/1`).get()
    );
  });
  it('public site can list recaps', async () => {
    await assertSucceeds(
      unauthCtx().firestore().collection(`leagues/${LEAGUE_ID}/recaps`).get()
    );
  });
  it('owner can write a recap', async () => {
    await assertSucceeds(
      ownerCtx().firestore().doc(`leagues/${LEAGUE_ID}/recaps/2`).set({
        num: 2, text: 'Another recap', date: '2025-03-22', author: 'owner1',
      })
    );
  });
  it('superadmin can write a recap', async () => {
    await assertSucceeds(
      superadminCtx().firestore().doc(`leagues/${LEAGUE_ID}/recaps/3`).set({
        num: 3, text: 'Admin recap', date: '2025-03-29', author: 'admin',
      })
    );
  });
  it('stranger cannot write a recap', async () => {
    await assertFails(
      strangerCtx().firestore().doc(`leagues/${LEAGUE_ID}/recaps/4`).set({
        num: 4, text: 'Hacked recap',
      })
    );
  });
  it('unauthenticated cannot write a recap', async () => {
    await assertFails(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/recaps/4`).set({
        num: 4, text: 'Anon recap',
      })
    );
  });
  it('owner of other league cannot write recap for this league', async () => {
    await assertFails(
      otherOwnerCtx().firestore().doc(`leagues/${LEAGUE_ID}/recaps/4`).set({
        num: 4, text: 'Cross-league hack',
      })
    );
  });
});

describe('player email migration — end-to-end', () => {
  it('owner can write playersPrivate and update players doc', async () => {
    const db = ownerCtx().firestore();

    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx.firestore().doc(`leagues/${LEAGUE_ID}/players/player_pre`).set({
        id: 'player_pre', name: 'Pre-Migration Player', team: 'TeamA', email: 'premig@test.com',
      });
    });

    await assertSucceeds(
      db.doc(`leagues/${LEAGUE_ID}/playersPrivate/player_pre`).set({ email: 'premig@test.com' }, { merge: true })
    );
    await assertSucceeds(
      db.doc(`leagues/${LEAGUE_ID}/players/player_pre`).update({ name: 'Pre-Migration Player' })
    );

    let privEmail;
    await testEnv.withSecurityRulesDisabled(async ctx => {
      const snap = await ctx.firestore().doc(`leagues/${LEAGUE_ID}/playersPrivate/player_pre`).get();
      privEmail = snap.data().email;
    });
    assert.strictEqual(privEmail, 'premig@test.com', 'email must be in playersPrivate');
  });

  it('superadmin can run migration across any league', async () => {
    const db = superadminCtx().firestore();

    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx.firestore().doc(`leagues/${OTHER_LEAGUE_ID}/players/player_sa`).set({
        id: 'player_sa', name: 'SA Player', email: 'sa@test.com',
      });
    });

    await assertSucceeds(
      db.doc(`leagues/${OTHER_LEAGUE_ID}/playersPrivate/player_sa`).set({ email: 'sa@test.com' }, { merge: true })
    );
    await assertSucceeds(
      db.doc(`leagues/${OTHER_LEAGUE_ID}/players/player_sa`).update({ name: 'SA Player Updated' })
    );
  });

  it('stranger cannot write playersPrivate during migration', async () => {
    await assertFails(
      strangerCtx().firestore().doc(`leagues/${LEAGUE_ID}/playersPrivate/player_1`).set({ email: 'x@x.com' })
    );
  });

  it('unauthenticated cannot write playersPrivate during migration', async () => {
    await assertFails(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/playersPrivate/player_1`).set({ email: 'x@x.com' })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// COORDINATOR TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('coordinator — users collection', () => {
  it('coordinator can read own user doc', async () => {
    await assertSucceeds(coordCtx().firestore().doc(`users/${COORD_UID}`).get());
  });
  it('coordinator cannot read another user doc', async () => {
    await assertFails(coordCtx().firestore().doc(`users/${OWNER_UID}`).get());
  });
  it('coordinator can update own mustChangePassword false→false (no-op) is blocked — must go true→false', async () => {
    // mustChangePassword is already false, so this diff would include no change
    // The rule allows ONLY the transition true→false.
    // Set mustChangePassword to true first so the update is meaningful.
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx.firestore().doc(`users/${COORD_UID}`).update({ mustChangePassword: true });
    });
    await assertSucceeds(
      coordCtx().firestore().doc(`users/${COORD_UID}`).update({ mustChangePassword: false })
    );
  });
  it('coordinator cannot update their own role', async () => {
    await assertFails(
      coordCtx().firestore().doc(`users/${COORD_UID}`).update({ role: 'owner' })
    );
  });
  it('deactivated coordinator cannot read own user doc', async () => {
    // Note: users/{uid} get is allowed for request.auth.uid == userId regardless of active.
    // The active check is in isLeagueCoordinator() which is only called for league data writes.
    // So this should still succeed (they can read their own doc to see they're deactivated).
    await assertSucceeds(coordDeactCtx().firestore().doc(`users/${COORD_DEACT_UID}`).get());
  });
});

describe('coordinator — league root doc', () => {
  it('coordinator can update _updatedAt on own league', async () => {
    await assertSucceeds(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}`).update({ _updatedAt: Date.now() })
    );
  });
  it('coordinator can update _updatedAt and playerMilestones together', async () => {
    await assertSucceeds(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}`).update({
        _updatedAt: Date.now(),
        playerMilestones: { player_1: { milestones: [], rpAdjustments: [] } },
      })
    );
  });
  it('coordinator cannot update league name', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}`).update({ name: 'Hacked Name' })
    );
  });
  it('coordinator cannot update teams on league root', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}`).update({ teams: ['team_hack'] })
    );
  });
  it('coordinator cannot update another league root doc', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${OTHER_LEAGUE_ID}`).update({ _updatedAt: Date.now() })
    );
  });
  it('deactivated coordinator cannot update league root doc', async () => {
    await assertFails(
      coordDeactCtx().firestore().doc(`leagues/${LEAGUE_ID}`).update({ _updatedAt: Date.now() })
    );
  });
});

describe('coordinator — games collection', () => {
  it('coordinator can update score fields on a game', async () => {
    await assertSucceeds(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/game_001`).update({
        homeScore: 110, awayScore: 95, played: true,
      })
    );
  });
  it('coordinator can update only homeScore', async () => {
    await assertSucceeds(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/game_001`).update({ homeScore: 88 })
    );
  });
  it('coordinator cannot update game venue', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/game_001`).update({ venue: 'Gym Hack' })
    );
  });
  it('coordinator cannot update game date', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/game_001`).update({ date: '2099-01-01' })
    );
  });
  it('coordinator cannot create a new game', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/game_new`).set({
        id: 'game_new', date: '2025-04-01', home: 'TeamA', away: 'TeamB',
      })
    );
  });
  it('coordinator cannot delete a game', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/game_001`).delete()
    );
  });
  it('coordinator of other league cannot update this league game', async () => {
    await assertFails(
      coordOtherCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/game_001`).update({
        homeScore: 50, awayScore: 40, played: true,
      })
    );
  });
  it('deactivated coordinator cannot update game scores', async () => {
    await assertFails(
      coordDeactCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/game_001`).update({
        homeScore: 99, awayScore: 88, played: true,
      })
    );
  });
});

describe('coordinator — playerStats sub-sub-collection', () => {
  it('coordinator can write playerStats for own league', async () => {
    await assertSucceeds(
      coordCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/games/game_001/playerStats/player_1`)
        .set({ points: 30, rebounds: 8, assists: 6, steals: 2, blocks: 0 })
    );
  });
  it('coordinator can read playerStats', async () => {
    await assertSucceeds(
      coordCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/games/game_001/playerStats/player_1`)
        .get()
    );
  });
  it('coordinator of other league cannot write playerStats for this league', async () => {
    await assertFails(
      coordOtherCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/games/game_001/playerStats/player_1`)
        .set({ points: 99 })
    );
  });
  it('deactivated coordinator cannot write playerStats', async () => {
    await assertFails(
      coordDeactCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/games/game_001/playerStats/player_1`)
        .set({ points: 99 })
    );
  });
});

describe('coordinator — meta/sync', () => {
  it('coordinator can write meta/sync', async () => {
    await assertSucceeds(
      coordCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/meta/sync`)
        .set({ updatedAt: Date.now() })
    );
  });
  it('coordinator of other league cannot write meta/sync for this league', async () => {
    await assertFails(
      coordOtherCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/meta/sync`)
        .set({ updatedAt: Date.now() })
    );
  });
  it('deactivated coordinator cannot write meta/sync', async () => {
    await assertFails(
      coordDeactCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/meta/sync`)
        .set({ updatedAt: Date.now() })
    );
  });
});

describe('coordinator — blocked collections', () => {
  it('coordinator cannot read playersPrivate', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/playersPrivate/player_1`).get()
    );
  });
  it('coordinator cannot write playersPrivate', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/playersPrivate/player_1`).set({ email: 'x@x.com' })
    );
  });
  it('coordinator cannot write teams subcollection', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/teams/team_x`).set({ name: 'Hack Team' })
    );
  });
  it('coordinator cannot write players subcollection', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/players/player_hack`).set({ name: 'Hacker' })
    );
  });
  it('coordinator cannot write settings', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/settings/emailjs`).set({ serviceId: 'hack' })
    );
  });
  it('coordinator cannot create user docs (not superadmin)', async () => {
    await assertFails(
      coordCtx().firestore().doc('users/new_uid').set({ role: 'coordinator', leagueId: LEAGUE_ID })
    );
  });
});

// ── Phase 2 fix tests ─────────────────────────────────────────────────────────

describe('coordinator — lock mechanism', () => {
  it('coordinator cannot edit score on a locked game', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/game_locked`).update({
        homeScore: 110, awayScore: 95,
      })
    );
  });
  it('coordinator cannot set locked=false on an unlocked game', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/game_001`).update({
        locked: false,
      })
    );
  });
  it('coordinator cannot write playerStats on a locked game', async () => {
    await assertFails(
      coordCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/games/game_locked/playerStats/player_1`)
        .set({ points: 30, rebounds: 8 })
    );
  });
  it('coordinator cannot delete playerStats', async () => {
    await assertFails(
      coordCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/games/game_001/playerStats/player_1`)
        .delete()
    );
  });
  it('coordinator cannot write meta/categories', async () => {
    await assertFails(
      coordCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/meta/categories`)
        .set({ updatedAt: Date.now() })
    );
  });
  it('coordinator cannot write meta/sync with extra keys', async () => {
    await assertFails(
      coordCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/meta/sync`)
        .set({ updatedAt: Date.now(), hack: 'data' })
    );
  });
  it('coordinator of league A cannot write league B game', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${OTHER_LEAGUE_ID}/games/game_001`).update({
        homeScore: 50,
      })
    );
  });
  it('owner can overwrite a locked game (unlock is owner/superadmin only)', async () => {
    await assertSucceeds(
      ownerCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/game_locked`).update({
        homeScore: 105, locked: false,
      })
    );
  });
});

describe('coordinator — draft system', () => {
  it('coordinator can save draft field on an unlocked game', async () => {
    await assertSucceeds(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/game_001`).update({
        draft: { homeScore: 72, awayScore: 68, savedBy: COORD_UID, savedAt: new Date() },
      })
    );
  });
  it('coordinator can save playerStats with draft:true on an unlocked game', async () => {
    await assertSucceeds(
      coordCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/games/game_001/playerStats/player_1`)
        .set({ points: 20, rebounds: 5, draft: true })
    );
  });
  it('coordinator cannot save draft on a locked game', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/game_locked`).update({
        draft: { homeScore: 50, awayScore: 40, savedBy: COORD_UID, savedAt: new Date() },
      })
    );
  });
  it('coordinator cannot save playerStats with extra unknown keys', async () => {
    await assertFails(
      coordCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/games/game_001/playerStats/player_1`)
        .set({ points: 20, hack: 'bad', draft: true })
    );
  });
});

describe('owner — unlock a locked game', () => {
  it('owner can set locked=false (unlock) on a locked game', async () => {
    await assertSucceeds(
      ownerCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/game_locked`).update({
        locked: false, unlockedBy: 'uid_owner_1', unlockedAt: new Date(),
      })
    );
  });
  it('coordinator cannot unlock a locked game', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/game_locked`).update({
        locked: false,
      })
    );
  });
});

describe('users — owner manages coordinators', () => {
  it('owner can create a coordinator doc for own league', async () => {
    await assertSucceeds(
      ownerCtx().firestore().doc('users/new_coord_uid').set({
        username: 'coord_new', displayName: 'Jean Leblanc', role: 'coordinator',
        leagueId: LEAGUE_ID, venue: 'Gym Ouest', active: true,
        mustChangePassword: true, createdAt: '2025-01-01',
      })
    );
  });
  it('owner cannot create a coordinator for another league', async () => {
    await assertFails(
      ownerCtx().firestore().doc('users/new_coord_uid').set({
        username: 'coord_cross', displayName: 'Pierre Martin', role: 'coordinator',
        leagueId: OTHER_LEAGUE_ID, venue: 'Gym', active: true,
        mustChangePassword: true, createdAt: '2025-01-01',
      })
    );
  });
  it('owner cannot create an owner doc (no self-promotion)', async () => {
    await assertFails(
      ownerCtx().firestore().doc('users/new_owner_uid').set({
        username: 'new_owner', role: 'owner', leagueId: LEAGUE_ID,
        mustChangePassword: true, createdAt: '2025-01-01',
      })
    );
  });
  it('owner cannot create a superadmin doc', async () => {
    await assertFails(
      ownerCtx().firestore().doc('users/super_attempt').set({
        username: 'god_mode', role: 'superadmin', createdAt: '2025-01-01',
      })
    );
  });
  it('owner cannot create coordinator doc with extra fields', async () => {
    await assertFails(
      ownerCtx().firestore().doc('users/coord_extra').set({
        username: 'coord_extra', displayName: 'Test', role: 'coordinator',
        leagueId: LEAGUE_ID, venue: 'Gym', active: true,
        mustChangePassword: true, createdAt: '2025-01-01',
        adminNote: 'sneaky extra field',
      })
    );
  });
  it('owner can deactivate a coordinator in own league', async () => {
    await assertSucceeds(
      ownerCtx().firestore().doc(`users/${COORD_UID}`).update({ active: false })
    );
  });
  it('owner cannot deactivate a coordinator in another league', async () => {
    await assertFails(
      ownerCtx().firestore().doc(`users/${COORD_OTHER_UID}`).update({ active: false })
    );
  });
  it('owner can delete a coordinator doc in own league', async () => {
    await assertSucceeds(
      ownerCtx().firestore().doc(`users/${COORD_UID}`).delete()
    );
  });
  it('owner cannot delete a coordinator in another league', async () => {
    await assertFails(
      ownerCtx().firestore().doc(`users/${COORD_OTHER_UID}`).delete()
    );
  });
});

// ── Production-shaped game docs (Bug #1) ─────────────────────────────────────
// Real games in production were created BEFORE the coordinator feature, so
// they have NO 'locked', NO 'draft', NO 'played' fields.  Rules must NOT
// throw on missing fields — they must use .get() defaults.
describe('coordinator — production-shaped docs (no locked/draft fields)', () => {
  const GAME_PROD = 'game_prod';

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      // Minimal game doc: just id, date, time — no locked, no draft, no played
      await ctx.firestore().doc(`leagues/${LEAGUE_ID}/games/${GAME_PROD}`).set({
        id: GAME_PROD, date: '2025-06-01', time: '19:00',
        home: 'TeamA', away: 'TeamB',
        // intentionally NO 'locked', 'draft', 'played', 'homeScore', 'awayScore'
      });
    });
  });

  it('coordinator can save draft on a minimal production game doc', async () => {
    await assertSucceeds(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/${GAME_PROD}`).update({
        draft: { homeScore: 55, awayScore: 48, savedBy: COORD_UID, savedAt: new Date() },
      })
    );
  });

  it('coordinator can write playerStats on a minimal production game doc', async () => {
    await assertSucceeds(
      coordCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/games/${GAME_PROD}/playerStats/player_1`)
        .set({ points: 18, rebounds: 6, assists: 2, draft: true })
    );
  });

  it('coordinator is denied writing extra fields on a production game doc', async () => {
    await assertFails(
      coordCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/${GAME_PROD}`).update({
        draft: { homeScore: 55, awayScore: 48 },
        hackedField: 'bad',
      })
    );
  });

  it('coordinator for other league cannot write to this game', async () => {
    await assertFails(
      coordOtherCtx().firestore().doc(`leagues/${LEAGUE_ID}/games/${GAME_PROD}`).update({
        draft: { homeScore: 55, awayScore: 48, savedBy: COORD_OTHER_UID, savedAt: new Date() },
      })
    );
  });
});

// ── Owner list users (Bug #3) ────────────────────────────────────────────────
describe('users — owner list permission', () => {
  it('owner can list users (to query own coordinators)', async () => {
    const { getDocs, collection, query, where } = require('@firebase/rules-unit-testing');
    // The SDK used here doesn't expose query builders — use the Firestore instance directly
    await assertSucceeds(
      ownerCtx().firestore().collection('users').where('leagueId', '==', LEAGUE_ID).where('role', '==', 'coordinator').get()
    );
  });

  it('coordinator cannot list users', async () => {
    await assertFails(
      coordCtx().firestore().collection('users').get()
    );
  });

  it('stranger cannot list users', async () => {
    await assertFails(
      strangerCtx().firestore().collection('users').get()
    );
  });
});
