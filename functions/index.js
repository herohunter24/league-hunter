import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { Resend } from 'resend';
import { randomUUID } from 'crypto';
import {
  confirmEmail, welcomeEmail, reminderEmail,
  scoreEmail, changeEmail, announcementEmail,
} from './templates.js';

initializeApp();
const db = getFirestore();

const RESEND_KEY = defineSecret('RESEND_API_KEY');
const REGION = 'us-east1';
const FROM = 'NLS <alertes@nlscreation.com>';

// CORS helper
function cors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ['https://nls-creation.vercel.app', 'http://localhost:5173', 'http://localhost:4173'];
  if (allowed.includes(origin) || origin.endsWith('.vercel.app')) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return true; }
  return false;
}

// Hash IP for rate limiting (not stored raw)
function hashIp(ip) {
  let h = 0;
  for (let i = 0; i < ip.length; i++) { h = (Math.imul(31, h) + ip.charCodeAt(i)) | 0; }
  return Math.abs(h).toString(16);
}

// Check and increment rate limit: max 3 sign-ups per IP per hour
async function checkRateLimit(ip) {
  const key = hashIp(ip) + '_' + Math.floor(Date.now() / 3_600_000);
  const ref = db.collection('rateLimits').doc(key);
  const snap = await ref.get();
  const count = snap.exists ? snap.data().count : 0;
  if (count >= 3) return false;
  await ref.set({ count: count + 1, ts: FieldValue.serverTimestamp() }, { merge: true });
  return true;
}

// Send via Resend
async function send(resend, { to, subject, html }) {
  return resend.emails.send({ from: FROM, to, subject, html });
}

// ── SUBSCRIBE ────────────────────────────────────────────────────────────────
export const nlsSubscribe = onRequest(
  { region: REGION, secrets: [RESEND_KEY] },
  async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }

    const { leagueId, email, name, categories, teams, types, lang, honeypot } = req.body;

    // Honeypot: if filled, silently succeed (bot)
    if (honeypot) { res.json({ ok: true }); return; }

    // Validate
    if (!leagueId || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'invalid' }); return;
    }

    // Rate limit by IP
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    const ok = await checkRateLimit(ip);
    if (!ok) { res.status(429).json({ error: 'rate_limit' }); return; }

    // Check alertsActive flag
    const psRef = db.collection('leagues').doc(leagueId).collection('meta').doc('publicSettings');
    const psSnap = await psRef.get();
    const alertsActive = psSnap.exists ? (psSnap.data().alertsActive !== false) : false;
    // Still allow sign-up even if alerts are off — just won't send until turned on

    // Check if already subscribed (don't reveal existence)
    const existing = await db.collection('leagues').doc(leagueId)
      .collection('subscribers').where('email', '==', email.toLowerCase()).limit(1).get();
    if (!existing.empty) {
      // Resend confirmation if still pending
      const sub = existing.docs[0];
      if (sub.data().status === 'pending') {
        const resend = new Resend(RESEND_KEY.value());
        const tmpl = confirmEmail({ to: email, name: sub.data().name, leagueId, token: sub.data().token, lang: sub.data().lang || lang });
        await send(resend, tmpl);
      }
      res.json({ ok: true }); return;
    }

    const token = randomUUID();
    const subId = randomUUID();
    const now = new Date();

    await db.collection('leagues').doc(leagueId).collection('subscribers').doc(subId).set({
      email: email.toLowerCase(),
      name: (name || '').trim(),
      categories: categories || [],
      teams: teams || [],
      types: types || { reminder: true, scores: true, changes: true },
      lang: lang || 'fr',
      status: 'pending',
      token,
      createdAt: FieldValue.serverTimestamp(),
      consentAt: null,
      lastSentReminders: [],
    });

    const resend = new Resend(RESEND_KEY.value());
    const tmpl = confirmEmail({ to: email, name: (name || '').trim(), leagueId, token, lang: lang || 'fr' });
    await send(resend, tmpl);

    res.json({ ok: true });
  }
);

// ── CONFIRM OPT-IN ───────────────────────────────────────────────────────────
export const nlsConfirm = onRequest(
  { region: REGION, secrets: [RESEND_KEY] },
  async (req, res) => {
    if (cors(req, res)) return;
    const { token, league } = req.query;
    if (!token || !league) { res.status(400).json({ error: 'missing' }); return; }

    const snap = await db.collection('leagues').doc(league)
      .collection('subscribers').where('token', '==', token).limit(1).get();
    if (snap.empty) { res.status(404).json({ error: 'not_found' }); return; }

    const doc_ = snap.docs[0];
    if (doc_.data().status !== 'pending') { res.json({ ok: true, already: true }); return; }

    await doc_.ref.update({ status: 'active', consentAt: FieldValue.serverTimestamp() });

    const resend = new Resend(RESEND_KEY.value());
    const tmpl = welcomeEmail({ to: doc_.data().email, name: doc_.data().name, leagueId: league, token, lang: doc_.data().lang });
    await send(resend, tmpl);

    res.json({ ok: true });
  }
);

// ── LOAD PREFS (GET) ─────────────────────────────────────────────────────────
export const nlsPrefs = onRequest(
  { region: REGION },
  async (req, res) => {
    if (cors(req, res)) return;

    if (req.method === 'GET') {
      const { token, league } = req.query;
      if (!token || !league) { res.status(400).json({ error: 'missing' }); return; }
      const snap = await db.collection('leagues').doc(league)
        .collection('subscribers').where('token', '==', token).limit(1).get();
      if (snap.empty) { res.status(404).json({ error: 'not_found' }); return; }
      const d = snap.docs[0].data();
      // Return prefs but not raw email (first + last letter masked)
      const e = d.email;
      const masked = e.length > 4 ? e[0] + '***' + e.slice(-4) : '***';
      res.json({ ok: true, sub: { email: masked, name: d.name, categories: d.categories, teams: d.teams, types: d.types, lang: d.lang, status: d.status } });
      return;
    }

    if (req.method === 'PUT') {
      const { token, leagueId, categories, teams, types, lang } = req.body;
      if (!token || !leagueId) { res.status(400).json({ error: 'missing' }); return; }
      const snap = await db.collection('leagues').doc(leagueId)
        .collection('subscribers').where('token', '==', token).limit(1).get();
      if (snap.empty) { res.status(404).json({ error: 'not_found' }); return; }
      await snap.docs[0].ref.update({ categories, teams, types, lang: lang || snap.docs[0].data().lang });
      res.json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'method' });
  }
);

// ── UNSUBSCRIBE ──────────────────────────────────────────────────────────────
export const nlsUnsubscribe = onRequest(
  { region: REGION },
  async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
    const { token, leagueId } = req.body;
    if (!token || !leagueId) { res.status(400).json({ error: 'missing' }); return; }
    const snap = await db.collection('leagues').doc(leagueId)
      .collection('subscribers').where('token', '==', token).limit(1).get();
    if (!snap.empty) {
      await snap.docs[0].ref.update({ status: 'unsubscribed' });
    }
    res.json({ ok: true });
  }
);

// ── ADMIN: LIST SUBSCRIBERS ──────────────────────────────────────────────────
export const nlsAdminSubs = onRequest(
  { region: REGION },
  async (req, res) => {
    if (cors(req, res)) return;
    const { league } = req.query;
    if (!league) { res.status(400).json({ error: 'missing' }); return; }
    const snap = await db.collection('leagues').doc(league)
      .collection('subscribers').orderBy('createdAt', 'desc').limit(500).get();
    const subs = snap.docs.map(d => ({ id: d.id, ...d.data(), token: undefined })); // don't expose token
    res.json({ ok: true, subs });
  }
);

// ── ADMIN: DELETE SUBSCRIBER ─────────────────────────────────────────────────
export const nlsAdminDelSub = onRequest(
  { region: REGION },
  async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
    const { league, subId } = req.body;
    if (!league || !subId) { res.status(400).json({ error: 'missing' }); return; }
    await db.collection('leagues').doc(league).collection('subscribers').doc(subId).delete();
    res.json({ ok: true });
  }
);

// ── ADMIN: SEND TEST / ANNOUNCEMENT ─────────────────────────────────────────
export const nlsAdminSend = onRequest(
  { region: REGION, secrets: [RESEND_KEY] },
  async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
    const { league, subject, body, targetCategories, testEmail } = req.body;
    if (!league || !subject || !body) { res.status(400).json({ error: 'missing' }); return; }

    const resend = new Resend(RESEND_KEY.value());

    // Test send to one address
    if (testEmail) {
      const tmpl = announcementEmail({ to: testEmail, leagueId: league, token: null, subject, body });
      await send(resend, tmpl);
      res.json({ ok: true, sent: 1 }); return;
    }

    // Real send: check alertsActive
    const psRef = db.collection('leagues').doc(league).collection('meta').doc('publicSettings');
    const psSnap = await psRef.get();
    if (!psSnap.exists || psSnap.data().alertsActive !== true) {
      res.status(403).json({ error: 'alerts_off' }); return;
    }

    // Get active subscribers matching target categories
    let query = db.collection('leagues').doc(league).collection('subscribers').where('status', '==', 'active');
    const subsSnap = await query.get();
    const targets = subsSnap.docs.filter(d => {
      if (!targetCategories || targetCategories.length === 0) return true;
      return d.data().categories.some(c => targetCategories.includes(c));
    });

    let sent = 0;
    for (const doc_ of targets) {
      const d = doc_.data();
      const tmpl = announcementEmail({ to: d.email, leagueId: league, token: d.token, subject, body });
      try {
        await send(resend, tmpl);
        await db.collection('leagues').doc(league).collection('emailLog').add({
          type: 'announcement', subId: doc_.id, sentAt: FieldValue.serverTimestamp(), status: 'sent',
        });
        sent++;
      } catch (e) {
        console.error('send failed', doc_.id, e);
      }
    }
    res.json({ ok: true, sent });
  }
);

// ── SCHEDULED: DAILY GAME REMINDERS ─────────────────────────────────────────
export const nlsReminders = onSchedule(
  { schedule: 'every day 09:00', timeZone: 'America/Toronto', region: REGION, secrets: [RESEND_KEY] },
  async () => {
    const resend = new Resend(RESEND_KEY.value());
    const now = new Date();
    const in24 = new Date(now.getTime() + 24 * 3_600_000);
    const in48 = new Date(now.getTime() + 48 * 3_600_000);

    const d24 = in24.toISOString().slice(0, 10);
    const d48 = in48.toISOString().slice(0, 10);

    // Get all leagues
    const leaguesSnap = await db.collection('leagues').get();
    for (const leagueDoc of leaguesSnap.docs) {
      const leagueId = leagueDoc.id;

      // Check alertsActive
      const psSnap = await db.collection('leagues').doc(leagueId).collection('meta').doc('publicSettings').get();
      if (!psSnap.exists || psSnap.data().alertsActive !== true) continue;

      // Get games in the 24–48h window
      const gamesSnap = await db.collection('leagues').doc(leagueId).collection('games')
        .where('date', 'in', [d24, d48]).get();

      for (const gameDoc of gamesSnap.docs) {
        const game = { id: gameDoc.id, ...gameDoc.data() };
        if (game.hs != null) continue; // already played

        // Get active subscribers with reminder enabled, following this game's category or teams
        const subsSnap = await db.collection('leagues').doc(leagueId)
          .collection('subscribers').where('status', '==', 'active').get();

        for (const subDoc of subsSnap.docs) {
          const sub = subDoc.data();
          if (!sub.types?.reminder) continue;

          const followsCategory = !sub.categories?.length || sub.categories.includes(game.categoryId);
          const followsTeam = !sub.teams?.length || [game.home, game.away].some(t => sub.teams.includes(t));
          if (!followsCategory && !followsTeam) continue;

          // Don't resend for the same game
          if ((sub.lastSentReminders || []).includes(game.id)) continue;

          const tmpl = reminderEmail({ to: sub.email, name: sub.name, leagueId, token: sub.token, lang: sub.lang, game });
          try {
            await send(resend, tmpl);
            await subDoc.ref.update({ lastSentReminders: FieldValue.arrayUnion(game.id) });
            await db.collection('leagues').doc(leagueId).collection('emailLog').add({
              type: 'reminder', subId: subDoc.id, gameId: game.id, sentAt: FieldValue.serverTimestamp(), status: 'sent',
            });
          } catch (e) {
            console.error('reminder send error', subDoc.id, e);
          }
        }
      }
    }
  }
);

// ── TRIGGER: GAME UPDATED ────────────────────────────────────────────────────
export const nlsGameAlert = onDocumentUpdated(
  { document: 'leagues/{leagueId}/games/{gameId}', region: REGION, secrets: [RESEND_KEY] },
  async (event) => {
    const leagueId = event.params.leagueId;
    const gameId = event.params.gameId;
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Check alertsActive
    const psSnap = await db.collection('leagues').doc(leagueId).collection('meta').doc('publicSettings').get();
    if (!psSnap.exists || psSnap.data().alertsActive !== true) return;

    const resend = new Resend(RESEND_KEY.value());
    const game = { id: gameId, ...after };

    // Detect score added (hs/as go from null → number)
    const scoreAdded = before.hs == null && after.hs != null && after.as != null;

    // Detect schedule changes (date, time, venue, status)
    const watched = ['date', 'time', 'venue', 'status'];
    const changed = watched.filter(f => before[f] !== after[f]).map(f => ({ field: f, from: before[f], to: after[f] }));

    if (!scoreAdded && changed.length === 0) return;

    const subsSnap = await db.collection('leagues').doc(leagueId)
      .collection('subscribers').where('status', '==', 'active').get();

    for (const subDoc of subsSnap.docs) {
      const sub = subDoc.data();
      const followsCategory = !sub.categories?.length || sub.categories.includes(after.categoryId);
      const followsTeam = !sub.teams?.length || [after.home, after.away].some(t => sub.teams.includes(t));
      if (!followsCategory && !followsTeam) continue;

      try {
        if (scoreAdded && sub.types?.scores) {
          const tmpl = scoreEmail({ to: sub.email, name: sub.name, leagueId, token: sub.token, lang: sub.lang, game });
          await send(resend, tmpl);
          await db.collection('leagues').doc(leagueId).collection('emailLog').add({
            type: 'score', subId: subDoc.id, gameId, sentAt: FieldValue.serverTimestamp(), status: 'sent',
          });
        }
        if (changed.length > 0 && sub.types?.changes) {
          const tmpl = changeEmail({ to: sub.email, name: sub.name, leagueId, token: sub.token, lang: sub.lang, game, changes: changed });
          await send(resend, tmpl);
          await db.collection('leagues').doc(leagueId).collection('emailLog').add({
            type: 'change', subId: subDoc.id, gameId, sentAt: FieldValue.serverTimestamp(), status: 'sent',
          });
        }
      } catch (e) {
        console.error('game alert send error', subDoc.id, e);
      }
    }
  }
);
