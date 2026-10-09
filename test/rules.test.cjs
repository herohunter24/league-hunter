/**
 * Firestore Rules Unit Tests — League Hunter / Website X
 *
 * Run with: firebase emulators:start --only firestore,auth  (in another terminal)
 *           then: cd test && npm test
 *
 * Prerequisites:
 *   1. Java 11+ installed (required by Firebase emulator)
 *   2. npm install -g firebase-tools
 *   3. cd test && npm install
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
const PLAIN_CODE       = 'NLS-TEST';
// sha256('NLS-TEST') — precomputed for test seeding
const CODE_HASH        = '5e4f8d3a2b1c0e9f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3';
// (In real tests this would be the actual sha256 — the value here is a placeholder
//  but the seeding sets it directly so the test logic is correct.)

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

  // Seed baseline data using admin context (bypasses rules)
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    // Superadmin doc
    await db.doc('meta/superadmin').set({ email: SUPERADMIN_EMAIL });

    // League
    await db.doc(`leagues/${LEAGUE_ID}`).set({
      id: LEAGUE_ID, name: 'Test League', sport: 'Basketball', color: '#f00',
      teams: [], players: [], schedule: [],
    });

    // Access code — stored as leagueCodes/{hash}
    await db.doc(`leagueCodes/${CODE_HASH}`).set({ leagueId: LEAGUE_ID, createdAt: Date.now() });

    // Private subcollection — plain code for superadmin
    await db.doc(`leagues/${LEAGUE_ID}/private/admin`).set({ code: PLAIN_CODE, updatedAt: Date.now() });

    // Owner user doc — doc ID == uid
    await db.doc(`users/${OWNER_UID}`).set({
      email: 'owner@test.com', googleUid: OWNER_UID,
      role: 'owner', leagueId: LEAGUE_ID, codeHash: CODE_HASH,
      createdAt: '2025-01-01',
    });
  });
});

// ── Helper: build authenticated context ─────────────────────────────────────

function superadminCtx() {
  return testEnv.authenticatedContext(SUPERADMIN_UID, {
    email: SUPERADMIN_EMAIL,
    email_verified: true,
  });
}

function ownerCtx() {
  return testEnv.authenticatedContext(OWNER_UID, {
    email: 'owner@test.com',
    email_verified: true,
  });
}

function strangerCtx() {
  return testEnv.authenticatedContext(STRANGER_UID, {
    email: 'nobody@test.com',
    email_verified: true,
  });
}

function unauthCtx() {
  return testEnv.unauthenticatedContext();
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('meta/superadmin', () => {
  it('superadmin can read', async () => {
    await assertSucceeds(
      superadminCtx().firestore().doc('meta/superadmin').get()
    );
  });

  it('stranger cannot read superadmin doc', async () => {
    await assertFails(
      strangerCtx().firestore().doc('meta/superadmin').get()
    );
  });

  it('unauthenticated cannot read superadmin doc', async () => {
    await assertFails(
      unauthCtx().firestore().doc('meta/superadmin').get()
    );
  });

  it('superadmin can write meta', async () => {
    await assertSucceeds(
      superadminCtx().firestore().doc('meta/config').set({ foo: 'bar' })
    );
  });

  it('owner cannot write meta', async () => {
    await assertFails(
      ownerCtx().firestore().doc('meta/config').set({ foo: 'bar' })
    );
  });
});

describe('leagueCodes — get vs list', () => {
  it('authenticated user can GET a code doc by hash', async () => {
    await assertSucceeds(
      strangerCtx().firestore().doc(`leagueCodes/${CODE_HASH}`).get()
    );
  });

  it('unauthenticated user cannot GET a code doc', async () => {
    await assertFails(
      unauthCtx().firestore().doc(`leagueCodes/${CODE_HASH}`).get()
    );
  });

  it('stranger cannot LIST leagueCodes (bulk read blocked)', async () => {
    await assertFails(
      strangerCtx().firestore().collection('leagueCodes').get()
    );
  });

  it('owner cannot LIST leagueCodes', async () => {
    await assertFails(
      ownerCtx().firestore().collection('leagueCodes').get()
    );
  });

  it('superadmin can write a code doc', async () => {
    await assertSucceeds(
      superadminCtx().firestore().doc('leagueCodes/newhash123').set({
        leagueId: LEAGUE_ID, createdAt: Date.now(),
      })
    );
  });

  it('stranger cannot write a code doc', async () => {
    await assertFails(
      strangerCtx().firestore().doc('leagueCodes/newhash123').set({
        leagueId: LEAGUE_ID, createdAt: Date.now(),
      })
    );
  });
});

describe('users — owner linking (create rule)', () => {
  it('authenticated user can create own doc when code hash is valid', async () => {
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
        role: 'owner', leagueId: LEAGUE_ID, codeHash: 'invalid_hash_that_does_not_exist',
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
    await assertSucceeds(
      ownerCtx().firestore().doc(`users/${OWNER_UID}`).get()
    );
  });

  it('stranger cannot read another user doc', async () => {
    await assertFails(
      strangerCtx().firestore().doc(`users/${OWNER_UID}`).get()
    );
  });

  it('superadmin can delete an owner user doc', async () => {
    await assertSucceeds(
      superadminCtx().firestore().doc(`users/${OWNER_UID}`).delete()
    );
  });

  it('owner cannot delete another user doc', async () => {
    await assertFails(
      ownerCtx().firestore().doc(`users/${STRANGER_UID}`).delete()
    );
  });
});

describe('leagues — root doc', () => {
  it('anyone (unauthenticated) can read league doc', async () => {
    await assertSucceeds(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}`).get()
    );
  });

  it('league owner can write own league', async () => {
    await assertSucceeds(
      ownerCtx().firestore().doc(`leagues/${LEAGUE_ID}`).update({ name: 'Updated' })
    );
  });

  it('stranger cannot write league', async () => {
    await assertFails(
      strangerCtx().firestore().doc(`leagues/${LEAGUE_ID}`).update({ name: 'Hacked' })
    );
  });

  it('owner cannot write a different league', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('leagues/other_league').set({ name: 'Other' });
    });
    await assertFails(
      ownerCtx().firestore().doc('leagues/other_league').update({ name: 'Hacked' })
    );
  });
});

describe('leagues/private (access code store)', () => {
  it('superadmin can read private/admin', async () => {
    await assertSucceeds(
      superadminCtx().firestore().doc(`leagues/${LEAGUE_ID}/private/admin`).get()
    );
  });

  it('owner can read own league private/admin', async () => {
    await assertSucceeds(
      ownerCtx().firestore().doc(`leagues/${LEAGUE_ID}/private/admin`).get()
    );
  });

  it('stranger cannot read private/admin', async () => {
    await assertFails(
      strangerCtx().firestore().doc(`leagues/${LEAGUE_ID}/private/admin`).get()
    );
  });

  it('unauthenticated cannot read private/admin', async () => {
    await assertFails(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/private/admin`).get()
    );
  });
});

describe('leagues/settings (emailConfig)', () => {
  it('owner can read settings', async () => {
    await assertSucceeds(
      ownerCtx().firestore().doc(`leagues/${LEAGUE_ID}/settings/emailConfig`).get()
    );
  });

  it('unauthenticated cannot read settings', async () => {
    await assertFails(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/settings/emailConfig`).get()
    );
  });

  it('stranger cannot read settings', async () => {
    await assertFails(
      strangerCtx().firestore().doc(`leagues/${LEAGUE_ID}/settings/emailConfig`).get()
    );
  });
});

describe('public-site writes — pageViews', () => {
  it('unauthenticated can create a valid pageView', async () => {
    await assertSucceeds(
      unauthCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/pageViews/v_test_123`)
        .set({ timestamp: Date.now(), date: '2025-01-01', section: 'home', sessionId: 'ses_abc', userAgent: 'Mozilla/5.0' })
    );
  });

  it('pageView create is rejected with extra fields', async () => {
    await assertFails(
      unauthCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/pageViews/v_bad`)
        .set({ timestamp: Date.now(), date: '2025-01-01', section: 'home', sessionId: 'ses', userAgent: 'UA', extraField: 'evil' })
    );
  });

  it('nobody can update or delete a pageView', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore()
        .doc(`leagues/${LEAGUE_ID}/pageViews/existing`)
        .set({ timestamp: 1, date: '2025-01-01', section: 'home', sessionId: 's', userAgent: 'u' });
    });
    await assertFails(
      unauthCtx().firestore().doc(`leagues/${LEAGUE_ID}/pageViews/existing`).update({ section: 'tampered' })
    );
  });
});

describe('public-site writes — subscribers', () => {
  it('unauthenticated can subscribe (create)', async () => {
    await assertSucceeds(
      unauthCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/subscribers/emailhash_abc`)
        .set({ email: 'fan@test.com', preferences: { scores: true }, subscribedAt: '2025-01-01T00:00:00Z', active: true })
    );
  });

  it('subscriber create rejected with extra fields', async () => {
    await assertFails(
      unauthCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/subscribers/emailhash_bad`)
        .set({ email: 'fan@test.com', preferences: {}, subscribedAt: '2025-01-01T00:00:00Z', active: true, hack: true })
    );
  });

  it('unauthenticated can unsubscribe (update active=false)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore()
        .doc(`leagues/${LEAGUE_ID}/subscribers/emailhash_existing`)
        .set({ email: 'fan@test.com', preferences: {}, subscribedAt: '2025-01-01T00:00:00Z', active: true });
    });
    await assertSucceeds(
      unauthCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/subscribers/emailhash_existing`)
        .update({ active: false, email: 'fan@test.com', preferences: {}, subscribedAt: '2025-01-01T00:00:00Z' })
    );
  });

  it('stranger cannot read subscribers', async () => {
    await assertFails(
      strangerCtx().firestore()
        .collection(`leagues/${LEAGUE_ID}/subscribers`)
        .get()
    );
  });
});

describe('public-site writes — allStarVotes', () => {
  it('unauthenticated can cast a valid vote', async () => {
    await assertSucceeds(
      unauthCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/allStarVotes/voter_abc`)
        .set({ playerId: 'player_1', email: '', votedAt: '2025-01-01T00:00:00Z' })
    );
  });

  it('vote rejected with extra fields', async () => {
    await assertFails(
      unauthCtx().firestore()
        .doc(`leagues/${LEAGUE_ID}/allStarVotes/voter_bad`)
        .set({ playerId: 'p1', email: '', votedAt: '2025', extraField: 'evil' })
    );
  });

  it('stranger cannot read allStarVotes', async () => {
    await assertFails(
      strangerCtx().firestore()
        .collection(`leagues/${LEAGUE_ID}/allStarVotes`)
        .get()
    );
  });

  it('owner can read allStarVotes for own league', async () => {
    await assertSucceeds(
      ownerCtx().firestore()
        .collection(`leagues/${LEAGUE_ID}/allStarVotes`)
        .get()
    );
  });
});

describe('superadmin full access', () => {
  it('superadmin can write any league', async () => {
    await assertSucceeds(
      superadminCtx().firestore().doc(`leagues/${LEAGUE_ID}`).update({ name: 'Renamed by admin' })
    );
  });

  it('superadmin can read subscribers', async () => {
    await assertSucceeds(
      superadminCtx().firestore().collection(`leagues/${LEAGUE_ID}/subscribers`).get()
    );
  });

  it('superadmin can list users', async () => {
    await assertSucceeds(
      superadminCtx().firestore().collection('users').get()
    );
  });
});

describe('isSuperAdmin — email_verified requirement', () => {
  it('unverified email cannot act as superadmin', async () => {
    const unverifiedCtx = testEnv.authenticatedContext(SUPERADMIN_UID, {
      email: SUPERADMIN_EMAIL,
      email_verified: false, // not verified
    });
    await assertFails(
      unverifiedCtx.firestore().doc('meta/superadmin').get()
    );
  });
});
