/**
 * Firestore Rules Unit Tests — League Hunter / Website X
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

const SUPERADMIN_EMAIL = 'admin@test.com';
const SUPERADMIN_UID   = 'uid_superadmin';
const OWNER_UID        = 'uid_owner_1';
const STRANGER_UID     = 'uid_stranger';
const LEAGUE_ID        = 'league_001';
const OTHER_LEAGUE_ID  = 'league_002';
const PLAIN_CODE       = 'NLS-TEST';
// sha256('NLS-TEST') computed with Node crypto:
//   require('crypto').createHash('sha256').update('NLS-TEST').digest('hex')
const CODE_HASH = require('crypto').createHash('sha256').update(PLAIN_CODE).digest('hex');

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

    // Superadmin doc
    await db.doc('meta/superadmin').set({ email: SUPERADMIN_EMAIL });

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

    // Access code
    await db.doc(`leagueCodes/${CODE_HASH}`).set({ leagueId: LEAGUE_ID, createdAt: Date.now() });

    // Private admin subcollection
    await db.doc(`leagues/${LEAGUE_ID}/private/admin`).set({ code: PLAIN_CODE, updatedAt: Date.now() });

    // Owner user doc (doc ID == uid)
    await db.doc(`users/${OWNER_UID}`).set({
      email: 'owner@test.com', googleUid: OWNER_UID,
      role: 'owner', leagueId: LEAGUE_ID, codeHash: CODE_HASH,
      createdAt: '2025-01-01',
    });

    // A player doc (no email — stripped before write)
    await db.doc(`leagues/${LEAGUE_ID}/players/player_1`).set({
      id: 'player_1', name: 'Alice', team: 'TeamA', position: 'PG',
    });

    // playersPrivate doc (email lives here)
    await db.doc(`leagues/${LEAGUE_ID}/playersPrivate/player_1`).set({
      email: 'alice@test.com',
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
  return testEnv.authenticatedContext(SUPERADMIN_UID, {
    email: SUPERADMIN_EMAIL, email_verified: true,
  });
}
function ownerCtx() {
  return testEnv.authenticatedContext(OWNER_UID, {
    email: 'owner@test.com', email_verified: true,
  });
}
function strangerCtx() {
  return testEnv.authenticatedContext(STRANGER_UID, {
    email: 'nobody@test.com', email_verified: true,
  });
}
function unauthCtx() {
  return testEnv.unauthenticatedContext();
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

describe('leagueCodes — get vs list', () => {
  it('authenticated user can GET a code doc by hash', async () => {
    await assertSucceeds(strangerCtx().firestore().doc(`leagueCodes/${CODE_HASH}`).get());
  });
  it('unauthenticated user cannot GET a code doc', async () => {
    await assertFails(unauthCtx().firestore().doc(`leagueCodes/${CODE_HASH}`).get());
  });
  it('stranger cannot LIST leagueCodes (bulk enumeration blocked)', async () => {
    await assertFails(strangerCtx().firestore().collection('leagueCodes').get());
  });
  it('owner cannot LIST leagueCodes', async () => {
    await assertFails(ownerCtx().firestore().collection('leagueCodes').get());
  });
  it('superadmin can write a code doc', async () => {
    await assertSucceeds(
      superadminCtx().firestore().doc('leagueCodes/newhash123').set({ leagueId: LEAGUE_ID, createdAt: Date.now() })
    );
  });
  it('stranger cannot write a code doc', async () => {
    await assertFails(
      strangerCtx().firestore().doc('leagueCodes/newhash123').set({ leagueId: LEAGUE_ID, createdAt: Date.now() })
    );
  });
});

describe('users — owner linking create rule', () => {
  it('authenticated user can create own doc with valid code hash', async () => {
    const newUid = 'uid_new_owner';
    const ctx = testEnv.authenticatedContext(newUid, { email: 'new@test.com', email_verified: true });
    await assertSucceeds(
      ctx.firestore().doc(`users/${newUid}`).set({
        email: 'new@test.com', googleUid: newUid,
        role: 'owner', leagueId: LEAGUE_ID, codeHash: CODE_HASH,
        createdAt: '2025-01-01',
      })
    );
  });
  it('user cannot create doc with nonexistent code hash', async () => {
    const newUid = 'uid_bad_code';
    const ctx = testEnv.authenticatedContext(newUid, { email: 'bad@test.com', email_verified: true });
    await assertFails(
      ctx.firestore().doc(`users/${newUid}`).set({
        email: 'bad@test.com', googleUid: newUid,
        role: 'owner', leagueId: LEAGUE_ID, codeHash: 'invalid_hash_404',
        createdAt: '2025-01-01',
      })
    );
  });
  it('user cannot create doc for a different uid', async () => {
    const ctx = testEnv.authenticatedContext(STRANGER_UID, { email: 'stranger@test.com', email_verified: true });
    await assertFails(
      ctx.firestore().doc(`users/some_other_uid`).set({
        email: 'stranger@test.com', googleUid: STRANGER_UID,
        role: 'owner', leagueId: LEAGUE_ID, codeHash: CODE_HASH,
        createdAt: '2025-01-01',
      })
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

describe('leagues — fan vote update (item 1: narrow public update)', () => {
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

describe('leagues/playersPrivate — email protected (item 3)', () => {
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
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx.firestore().doc(`users/${STRANGER_UID}`).set({
        email: 'other@test.com', googleUid: STRANGER_UID, role: 'owner',
        leagueId: OTHER_LEAGUE_ID, codeHash: 'fakehash', createdAt: '2025-01-01',
      });
    });
    const otherOwnerCtx = testEnv.authenticatedContext(STRANGER_UID, {
      email: 'other@test.com', email_verified: true,
    });
    await assertFails(
      otherOwnerCtx.firestore().doc(`leagues/${LEAGUE_ID}/playersPrivate/player_1`).get()
    );
  });
});

describe('leagues/private — access code store', () => {
  it('superadmin can read private/admin', async () => {
    await assertSucceeds(superadminCtx().firestore().doc(`leagues/${LEAGUE_ID}/private/admin`).get());
  });
  it('owner can read own league private/admin', async () => {
    await assertSucceeds(ownerCtx().firestore().doc(`leagues/${LEAGUE_ID}/private/admin`).get());
  });
  it('stranger cannot read private/admin', async () => {
    await assertFails(strangerCtx().firestore().doc(`leagues/${LEAGUE_ID}/private/admin`).get());
  });
  it('unauthenticated cannot read private/admin', async () => {
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

describe('public-site writes — subscribers double opt-in (item 2)', () => {
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
});

describe('isSuperAdmin — email_verified required', () => {
  it('unverified email cannot act as superadmin', async () => {
    const ctx = testEnv.authenticatedContext(SUPERADMIN_UID, {
      email: SUPERADMIN_EMAIL, email_verified: false,
    });
    await assertFails(ctx.firestore().doc('meta/superadmin').get());
  });
});
