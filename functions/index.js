import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentUpdated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { Resend } from 'resend';
import { randomUUID } from 'crypto';
import {
  confirmEmail, welcomeEmail,
  scoreEmail, changeEmail, cancelEmail, announcementEmail,
} from './templates.js';

// Score fields are stored as homeScore/awayScore (number or string); empty = no score.
const num = v => (v === undefined || v === null || v === '') ? null : +v;

initializeApp();
const db = getFirestore();

const RESEND_KEY = defineSecret('RESEND_API_KEY');
const REGION = 'us-east1';
const FROM = 'NLS - Alertes de matchs <no-reply@nlsshowcases.com>';

// CORS helper
function cors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ['https://nlsshowcases.com', 'https://www.nlsshowcases.com', 'https://nls-creation.vercel.app', 'http://localhost:5173', 'http://localhost:4173'];
  if (allowed.includes(origin) || origin.endsWith('.vercel.app')) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
async function send(resend, { to, subject, html, text, from, reply_to }) {
  const msg = { from: from || FROM, to, subject, html, text };
  if (reply_to) msg.reply_to = reply_to;
  const r = await resend.emails.send(msg);
  if (r && r.error) throw new Error('resend: ' + (r.error.message || JSON.stringify(r.error)));
  return r;
}

// Normalize the list of followed teams: [{ categoryId, team }], max 20, no duplicates.
function cleanFollows(follows) {
  if (!Array.isArray(follows)) return [];
  const out = [];
  for (const f of follows.slice(0, 20)) {
    const categoryId = String(f?.categoryId ?? '').trim().slice(0, 100);
    const team = String(f?.team ?? '').trim().slice(0, 100);
    if (!categoryId || !team) continue;
    if (!out.some(x => x.categoryId === categoryId && x.team === team)) out.push({ categoryId, team });
  }
  return out;
}

// Does this subscriber follow this game?
// New subscribers have `follows` (team + category). Old format: categories/teams arrays.
function subFollowsGame(sub, game) {
  const teams = [game.home, game.away];
  if (Array.isArray(sub.follows) && sub.follows.length) {
    return sub.follows.some(f => f.categoryId === String(game.categoryId ?? '') && teams.includes(f.team));
  }
  const cats = sub.categories || [];
  const tms = sub.teams || [];
  if (!cats.length && !tms.length) return true;
  return cats.includes(game.categoryId) || teams.some(t => tms.includes(t));
}

// Admin endpoints: caller must send a Firebase ID token of a superadmin or the league owner.
async function isAdminFor(req, leagueId) {
  const m = (req.headers.authorization || '').match(/^Bearer (.+)$/);
  if (!m) return false;
  try {
    const decoded = await getAuth().verifyIdToken(m[1]);
    const u = await db.collection('users').doc(decoded.uid).get();
    if (!u.exists) return false;
    const d = u.data();
    return d.role === 'superadmin' || (d.role === 'owner' && String(d.leagueId) === String(leagueId));
  } catch {
    return false;
  }
}

// ── LEAGUE HUNTER SALES LEAD (sales.html contact form) ──────────────────────
const LH_FROM = 'League Hunter <no-reply@nlsshowcases.com>';
const LH_TO = 'leaguehunter.project@gmail.com';
const escHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const lhLead = onRequest(
  { region: REGION, secrets: [RESEND_KEY] },
  async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }

    const b = req.body || {};
    // Honeypot: if filled, silently succeed (bot)
    if (b.website) { res.json({ ok: true }); return; }

    const clip = (v, n) => String(v ?? '').trim().slice(0, n);
    const lead = {
      nom: clip(b.nom, 200),
      ligue: clip(b.ligue, 200),
      sport: clip(b.sport, 200),
      equipes: clip(b.equipes, 200),
      courriel: clip(b.courriel, 200),
      telephone: clip(b.telephone, 200),
      message: clip(b.message, 2000),
      lang: b.lang === 'en' ? 'en' : 'fr',
    };
    if (!lead.nom || !lead.ligue || !lead.courriel || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.courriel)) {
      res.status(400).json({ error: 'invalid' }); return;
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    const ok = await checkRateLimit(ip);
    if (!ok) { res.status(429).json({ error: 'rate_limit' }); return; }

    const rows = [
      ['Nom', lead.nom], ['Ligue', lead.ligue], ['Sport', lead.sport], ["Nombre d'équipes", lead.equipes],
      ['Courriel', lead.courriel], ['Téléphone', lead.telephone], ['Langue', lead.lang],
    ];
    const text = rows.map(([k, v]) => `${k}: ${v || '—'}`).join('\n') + `\n\nMessage:\n${lead.message || '—'}`;
    const html = '<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">'
      + rows.map(([k, v]) => `<tr><td style="color:#666">${escHtml(k)}</td><td><strong>${escHtml(v || '—')}</strong></td></tr>`).join('')
      + '</table>'
      + `<p style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${escHtml(lead.message || '—')}</p>`;

    try {
      const resend = new Resend(RESEND_KEY.value());
      await send(resend, {
        from: LH_FROM,
        to: LH_TO,
        reply_to: lead.courriel,
        subject: `Nouvelle demande League Hunter — ${lead.ligue.replace(/[\r\n]+/g, ' ')}`,
        html,
        text,
      });
    } catch (e) {
      console.error('lhLead send failed', e);
      res.status(500).json({ error: 'send' }); return;
    }
    res.json({ ok: true });
  }
);

// ── SUBSCRIBE ────────────────────────────────────────────────────────────────
export const nlsSubscribe = onRequest(
  { region: REGION, secrets: [RESEND_KEY] },
  async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }

    const { leagueId, email, firstName, lastName, follows, types, lang, honeypot } = req.body || {};

    // Honeypot: if filled, silently succeed (bot)
    if (honeypot) { res.json({ ok: true }); return; }

    // Validate
    const first = String(firstName || '').trim().slice(0, 60);
    const last = String(lastName || '').trim().slice(0, 60);
    const fl = cleanFollows(follows);
    if (!leagueId || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !first || !last || !fl.length) {
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
      name: first,
      firstName: first,
      lastName: last,
      follows: fl,
      categories: [...new Set(fl.map(f => f.categoryId))],
      teams: [...new Set(fl.map(f => f.team))],
      types: types || { scores: true, changes: true },
      lang: lang || 'fr',
      status: 'pending',
      token,
      createdAt: FieldValue.serverTimestamp(),
      consentAt: null,
    });

    const resend = new Resend(RESEND_KEY.value());
    const tmpl = confirmEmail({ to: email, name: first, leagueId, token, lang: lang || 'fr' });
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
      res.json({ ok: true, sub: { email: masked, name: d.name, follows: d.follows || [], types: d.types, lang: d.lang, status: d.status } });
      return;
    }

    if (req.method === 'PUT') {
      const { token, leagueId, follows, types, lang } = req.body || {};
      const fl = cleanFollows(follows);
      if (!token || !leagueId || !fl.length) { res.status(400).json({ error: 'missing' }); return; }
      const snap = await db.collection('leagues').doc(leagueId)
        .collection('subscribers').where('token', '==', token).limit(1).get();
      if (snap.empty) { res.status(404).json({ error: 'not_found' }); return; }
      const t = types || {};
      await snap.docs[0].ref.update({
        follows: fl,
        categories: [...new Set(fl.map(f => f.categoryId))],
        teams: [...new Set(fl.map(f => f.team))],
        types: { scores: !!t.scores, changes: !!t.changes },
        lang: lang || snap.docs[0].data().lang,
      });
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
    const league = req.query.league || req.query.leagueId;
    if (!league) { res.status(400).json({ error: 'missing' }); return; }
    if (!(await isAdminFor(req, league))) { res.status(403).json({ error: 'forbidden' }); return; }
    const snap = await db.collection('leagues').doc(league)
      .collection('subscribers').orderBy('createdAt', 'desc').limit(500).get();
    const subs = snap.docs.map(d => {
      const x = d.data();
      const created = x.createdAt && typeof x.createdAt.toDate === 'function' ? x.createdAt.toDate().toISOString() : '';
      return { id: d.id, ...x, createdAt: created, consentAt: undefined, token: undefined }; // don't expose token
    });
    res.json({ ok: true, subs });
  }
);

// ── ADMIN: DELETE SUBSCRIBER ─────────────────────────────────────────────────
export const nlsAdminDelSub = onRequest(
  { region: REGION },
  async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
    const { subId } = req.body || {};
    const league = req.body?.league || req.body?.leagueId;
    if (!league || !subId) { res.status(400).json({ error: 'missing' }); return; }
    if (!(await isAdminFor(req, league))) { res.status(403).json({ error: 'forbidden' }); return; }
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
    const { subject, targetCategories, testEmail } = req.body || {};
    const league = req.body?.league || req.body?.leagueId;
    const body = req.body?.body || req.body?.message;
    if (!league || !subject || !body) { res.status(400).json({ error: 'missing' }); return; }
    if (!(await isAdminFor(req, league))) { res.status(403).json({ error: 'forbidden' }); return; }

    const resend = new Resend(RESEND_KEY.value());

    // Test send to one address
    if (testEmail) {
      const tmpl = announcementEmail({ to: testEmail, leagueId: league, token: null, subject, body, lang: 'fr' });
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
      return (d.data().categories || []).some(c => targetCategories.includes(c));
    });

    let sent = 0;
    for (const doc_ of targets) {
      const d = doc_.data();
      const tmpl = announcementEmail({ to: d.email, leagueId: league, token: d.token, subject, body, lang: d.lang || 'fr' });
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
    const hsB = num(before.homeScore);
    const hsA = num(after.homeScore);
    const asA = num(after.awayScore);
    const game = { id: gameId, ...after, hs: hsA, as: asA };

    // Detect score added (homeScore/awayScore go from empty → number)
    const scoreAdded = hsB == null && hsA != null && asA != null;

    // Detect schedule changes (date, time, venue, status)
    const watched = ['date', 'time', 'venue', 'status'];
    const changed = watched.filter(f => before[f] !== after[f]).map(f => ({ field: f, from: before[f], to: after[f] }));

    if (!scoreAdded && changed.length === 0) return;

    // Category label for the email (read the league doc once)
    const leagueSnap = await db.collection('leagues').doc(leagueId).get();
    const cat = ((leagueSnap.exists && leagueSnap.data().categories) || [])
      .find(c => String(c.id) === String(after.categoryId));
    if (cat) { game.categoryLabel = cat.displayName || cat.name; game.division = cat.division; }

    const subsSnap = await db.collection('leagues').doc(leagueId)
      .collection('subscribers').where('status', '==', 'active').get();

    for (const subDoc of subsSnap.docs) {
      const sub = subDoc.data();
      if (!subFollowsGame(sub, after)) continue;

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

// Pure decision for the cancel guard (bulk delete / recreated game → no email).
function shouldSkipCancel({ recentCount, sameIdExists, twinExists }) {
  if (recentCount > 2) return 'bulk delete';
  if (sameIdExists) return 'same id recreated';
  if (twinExists) return 'twin recreated';
  return null;
}

// ── TRIGGER: GAME DELETED (= cancelled by the league owner) ─────────────────
export const nlsGameCancelled = onDocumentDeleted(
  { document: 'leagues/{leagueId}/games/{gameId}', region: REGION, secrets: [RESEND_KEY], timeoutSeconds: 120 },
  async (event) => {
    const leagueId = event.params.leagueId;
    const gameId = event.params.gameId;
    const data = event.data?.data();
    if (!data) return;
    const game = { id: gameId, ...data };

    // Check alertsActive
    const psSnap = await db.collection('leagues').doc(leagueId).collection('meta').doc('publicSettings').get();
    if (!psSnap.exists || psSnap.data().alertsActive !== true) return;

    // Cancel guard marker (counts recent deletes to detect bulk deletes / re-imports)
    const now = Date.now();
    const guardRef = db.collection('leagues').doc(leagueId).collection('fnState').doc('cancelGuard');
    try {
      await guardRef.collection('deletes').doc(gameId).set({
        deletedAt: now, home: game.home || null, away: game.away || null,
        date: game.date || null, time: game.time || null,
      });
    } catch (e) {
      console.error('cancel guard marker error', leagueId, gameId, e);
      return;
    }

    // Already played or in the past (America/Toronto) → no cancel email
    if (num(game.homeScore) != null) return;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
    if (game.date && String(game.date) < today) return;

    // Wait, then skip if this was a bulk delete or the game was recreated (edit = delete + add)
    await new Promise(r => setTimeout(r, 45000));
    try {
      const recentQ = guardRef.collection('deletes').where('deletedAt', '>=', now - 120000);
      let recentCount;
      try { recentCount = (await recentQ.count().get()).data().count; }
      catch (e) { recentCount = (await recentQ.get()).size; }
      const gamesCol = db.collection('leagues').doc(leagueId).collection('games');
      const sameIdExists = (await gamesCol.doc(gameId).get()).exists;
      let twinExists = false;
      if (!sameIdExists && game.date) {
        const twinSnap = await gamesCol.where('date', '==', game.date).get();
        twinExists = twinSnap.docs.some(d => {
          const g = d.data();
          return String(g.home) === String(game.home) && String(g.away) === String(game.away)
            && String(g.time) === String(game.time);
        });
      }
      const skip = shouldSkipCancel({ recentCount, sameIdExists, twinExists });
      if (skip) {
        console.log('cancel skipped: ' + skip, leagueId, gameId, { recentCount });
        return;
      }
    } catch (e) {
      console.error('cancel guard check error (not sending)', leagueId, gameId, e);
      return;
    }

    // Housekeeping: remove markers older than 24 h
    try {
      const oldSnap = await guardRef.collection('deletes').where('deletedAt', '<', now - 86400000).limit(50).get();
      await Promise.all(oldSnap.docs.map(d => d.ref.delete()));
    } catch (e) {
      console.error('cancel guard cleanup error', e);
    }

    // Burst guard: when a league, category or team is deleted, its games are deleted too.
    // Skip unless the league, the game's category and both teams still exist.
    const leagueSnap = await db.collection('leagues').doc(leagueId).get();
    if (!leagueSnap.exists) return;
    const cats = leagueSnap.data().categories || [];
    if (game.categoryId != null && game.categoryId !== '' && cats.length
      && !cats.some(c => String(c.id) === String(game.categoryId))) return;
    const cat = cats.find(c => String(c.id) === String(game.categoryId));
    if (cat) { game.categoryLabel = cat.displayName || cat.name; game.division = cat.division; }
    const teamsSnap = await db.collection('leagues').doc(leagueId).collection('teams').get();
    const teamNames = teamsSnap.docs.map(d => d.data().name);
    if (!teamNames.includes(game.home) || !teamNames.includes(game.away)) return;

    const resend = new Resend(RESEND_KEY.value());
    const subsSnap = await db.collection('leagues').doc(leagueId)
      .collection('subscribers').where('status', '==', 'active').get();

    for (const subDoc of subsSnap.docs) {
      const sub = subDoc.data();
      if (!subFollowsGame(sub, game)) continue;
      if (!sub.types?.changes) continue;
      try {
        const tmpl = cancelEmail({ to: sub.email, name: sub.name, leagueId, token: sub.token, lang: sub.lang, game });
        await send(resend, tmpl);
        await db.collection('leagues').doc(leagueId).collection('emailLog').add({
          type: 'cancel', subId: subDoc.id, gameId, sentAt: FieldValue.serverTimestamp(), status: 'sent',
        });
      } catch (e) {
        console.error('cancel alert send error', subDoc.id, e);
      }
    }
  }
);
