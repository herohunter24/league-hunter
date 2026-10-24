// Bilingual HTML + plain-text email templates — NLS League game alerts.
// Light, table-based layout with inline styles only (email-client safe).

const BASE_URL = process.env.NLS_PUBLIC_URL || 'https://nlsshowcases.com';
const LOGO_URL = BASE_URL + '/logo/nls-crest.png';           // 766x925
const LOGO_SMALL_URL = BASE_URL + '/logo/nls-logo-black.png'; // 371x189
const LH_URL = 'https://league-hunter.vercel.app';
const NLS_CONTACT_EMAIL = 'info@nlscreation.com';

const FONT = 'Arial,Helvetica,sans-serif';
const GOLD = '#C9A24A';
const GOLD_DARK = '#8B6F32';

// ── Helpers ──────────────────────────────────────────────────────────────────
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtDate(date, lang) {
  if (!date) return '';
  const m = String(date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(date);
  if (isNaN(d)) return String(date);
  return d.toLocaleDateString(lang !== 'en' ? 'fr-CA' : 'en-CA',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const catLabel = game => game.categoryLabel || '';
const isFr = lang => lang !== 'en';
const vs = lang => (isFr(lang) ? 'contre' : 'vs');

function manageUrl(leagueId, token) {
  return `${BASE_URL}/?manage=${token}`;
}

function confirmUrl(leagueId, token) {
  return `${BASE_URL}/?manage=${token}&action=confirm`;
}

function links(leagueId, token) {
  if (!token) return { manage: null, unsub: null };
  const manage = manageUrl(leagueId, token);
  return { manage, unsub: manage + '&unsub=1' };
}

const REASON = {
  subscribed: {
    fr: 'Vous recevez ce courriel parce que vous êtes abonné(e) aux alertes de matchs de la Ligue NLS.',
    en: 'You are receiving this email because you subscribed to NLS League game alerts.',
  },
  confirm: {
    fr: "Ce courriel fait suite à une demande d'abonnement faite avec cette adresse.",
    en: 'This email follows a subscription request made with this address.',
  },
  test: {
    fr: 'Envoi test – aucun lien de gestion.',
    en: 'Test send – no management links.',
  },
};
const reasonText = (key, lang) => REASON[key][isFr(lang) ? 'fr' : 'en'];

// ── Building blocks (each returns { html, text }) ────────────────────────────
function para(str, extraStyle = '') {
  return {
    html: `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:#333333;${extraStyle}">${esc(str)}</p>`,
    text: str,
  };
}

function small(str) {
  return {
    html: `<p style="margin:0 0 16px;font-family:${FONT};font-size:13px;line-height:1.6;color:#6B6B6B;">${esc(str)}</p>`,
    text: str,
  };
}

function button(label, url) {
  return {
    html: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 8px;"><tr><td bgcolor="${GOLD}" style="padding:13px 26px;background:${GOLD};"><a href="${esc(url)}" style="font-family:${FONT};font-size:14px;font-weight:bold;color:#111111;text-decoration:none;">${esc(label)}</a></td></tr></table>`
      + `<p style="margin:0 0 16px;font-family:${FONT};font-size:12px;line-height:1.5;color:#6B6B6B;word-break:break-all;">${esc(url)}</p>`,
    text: `${label}\n${url}`,
  };
}

// rows: [{ label, value, previous? }] — empty values are omitted
function details(rows, lang) {
  const list = rows.filter(r => r.value !== undefined && r.value !== null && String(r.value) !== '');
  if (!list.length) return { html: '', text: '' };
  const prevLabel = isFr(lang) ? 'Auparavant' : 'Previously';
  const sep = isFr(lang) ? ' : ' : ': ';
  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:8px 0 20px;">`
    + list.map(r => `<tr><td width="34%" valign="top" style="width:34%;border-top:1px solid #ECEAE4;padding:10px 0;font-family:${FONT};font-size:13px;color:#6B6B6B;">${esc(r.label)}</td>`
      + `<td valign="top" style="border-top:1px solid #ECEAE4;padding:10px 0;font-family:${FONT};font-size:15px;font-weight:bold;color:#111111;">${esc(r.value)}`
      + (r.previous !== undefined ? `<div style="font-size:12px;font-weight:normal;color:#8A8A8A;margin-top:3px;">${esc(prevLabel)}${esc(sep)}${esc(r.previous || '—')}</div>` : '')
      + `</td></tr>`).join('')
    + `</table>`;
  const text = list.map(r => `${r.label}${sep}${r.value}` + (r.previous !== undefined ? ` (${prevLabel}${sep}${r.previous || '—'})` : '')).join('\n');
  return { html, text };
}

function scoreBlock(game) {
  const winHome = game.hs > game.as;
  const winAway = game.as > game.hs;
  const row = (team, score, win, first) => `<tr>`
    + `<td style="padding:14px 18px;${first ? '' : 'border-top:1px solid #ECEAE4;'}${win ? `border-left:3px solid ${GOLD};` : 'border-left:3px solid #FAF8F3;'}font-family:${FONT};font-size:16px;color:#111111;${win ? 'font-weight:bold;' : ''}">${esc(team)}</td>`
    + `<td align="right" style="padding:14px 18px;${first ? '' : 'border-top:1px solid #ECEAE4;'}font-family:${FONT};font-size:26px;font-weight:bold;color:#111111;text-align:right;">${esc(score)}</td></tr>`;
  return {
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FAF8F3" style="width:100%;background:#FAF8F3;border:1px solid #ECEAE4;margin:4px 0 16px;">`
      + row(game.home, game.hs, winHome, true) + row(game.away, game.as, winAway, false) + `</table>`,
    text: `${game.home} ${game.hs}\n${game.away} ${game.as}`,
  };
}

function gameRows(game, lang) {
  const fr = isFr(lang);
  return [
    { key: 'category', label: fr ? 'Catégorie' : 'Category', value: catLabel(game) },
    { key: 'date', label: 'Date', value: fmtDate(game.date, lang) },
    { key: 'time', label: fr ? 'Heure' : 'Time', value: game.time || '' },
    { key: 'venue', label: fr ? 'Lieu' : 'Venue', value: game.venue || '' },
  ];
}

// ── Shared layout ────────────────────────────────────────────────────────────
// blocks: array of { html, text }
function layout({ lang, preheader, kicker, title, blocks, manage, unsub, reason }) {
  const fr = isFr(lang);
  const brand = fr ? 'LIGUE NLS · ALERTES DE MATCHS' : 'NLS LEAGUE · GAME ALERTS';
  const notice = fr
    ? ['Ce courriel a été envoyé automatiquement. Veuillez ne pas y répondre : les réponses ne sont pas consultées. Pour toute question, veuillez communiquer directement avec la Ligue NLS à ', ' ou sur nlsshowcases.com.']
    : ['This is an automated message. Please do not reply; replies are not monitored. For any questions, please contact the NLS League directly at ', ' or on nlsshowcases.com.'];
  const manageLabel = fr ? 'Gérer mes alertes' : 'Manage my alerts';
  const unsubLabel = fr ? 'Me désabonner' : 'Unsubscribe';
  const powered = fr ? 'Propulsé par League Hunter' : 'Powered by League Hunter';
  const org = 'Ligue NLS – No Limits Showcases · Québec';
  const linkStyle = 'color:#555555;text-decoration:underline;';

  const linkParts = [];
  if (manage) linkParts.push(`<a href="${esc(manage)}" style="${linkStyle}">${esc(manageLabel)}</a>`);
  if (unsub) linkParts.push(`<a href="${esc(unsub)}" style="${linkStyle}">${esc(unsubLabel)}</a>`);

  const html = `<!DOCTYPE html>
<html lang="${fr ? 'fr' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F2;">
<span style="display:none;font-size:1px;color:#F4F4F2;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(preheader || '')}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F4F2" style="width:100%;background:#F4F4F2;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E4E2DC;font-family:${FONT};">
<tr><td align="center" style="padding:28px 24px 20px;border-bottom:3px solid ${GOLD};text-align:center;">
<img src="${LOGO_URL}" width="72" height="87" alt="Ligue NLS – No Limits Showcases" style="display:block;margin:0 auto;border:0;outline:none;">
<div style="margin-top:10px;font-family:${FONT};font-size:11px;letter-spacing:2px;color:${GOLD_DARK};font-weight:bold;">${esc(brand)}</div>
</td></tr>
<tr><td style="padding:32px 32px 8px;">
<p style="margin:0 0 8px;font-family:${FONT};font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:${GOLD_DARK};font-weight:bold;">${esc(kicker)}</p>
<h1 style="margin:0 0 20px;font-family:${FONT};font-size:20px;font-weight:bold;color:#111111;line-height:1.3;">${esc(title)}</h1>
${blocks.map(b => b.html).filter(Boolean).join('\n')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:24px 0;"><tr><td bgcolor="#F7F5EF" style="background:#F7F5EF;border-left:3px solid ${GOLD};padding:12px 16px;font-family:${FONT};font-size:13px;line-height:1.6;color:#555555;">${esc(notice[0])}<a href="mailto:${NLS_CONTACT_EMAIL}" style="color:#555555;text-decoration:underline;">${NLS_CONTACT_EMAIL}</a>${esc(notice[1])}</td></tr></table>
</td></tr>
<tr><td align="center" bgcolor="#FAFAF8" style="background:#FAFAF8;border-top:1px solid #ECEAE4;padding:20px 24px;text-align:center;font-family:${FONT};font-size:12px;color:#777777;line-height:1.6;">
<img src="${LOGO_SMALL_URL}" width="64" height="33" alt="NLS" style="display:block;margin:0 auto 10px;border:0;outline:none;">
${reason ? `<div>${esc(reason)}</div>` : ''}
<div>${esc(org)}</div>
${linkParts.length ? `<div>${linkParts.join(' · ')}</div>` : ''}
<div><a href="${LH_URL}" style="${linkStyle}">${esc(powered)}</a></div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const textLines = [
    brand,
    '',
    kicker.toUpperCase(),
    title,
    '',
    blocks.map(b => b.text).filter(Boolean).join('\n\n'),
    '',
    '---',
    notice[0] + NLS_CONTACT_EMAIL + notice[1],
    '---',
    reason || '',
    org,
  ];
  const sep = fr ? ' : ' : ': ';
  if (manage) textLines.push(`${manageLabel}${sep}${manage}`);
  if (unsub) textLines.push(`${unsubLabel}${sep}${unsub}`);
  textLines.push(`${powered}${sep}${LH_URL}`);
  const text = textLines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');

  return { html, text };
}

// ── CONFIRMATION (double opt-in) ─────────────────────────────────────────────
export function confirmEmail({ to, name, leagueId, token, lang }) {
  const fr = isFr(lang);
  const url = confirmUrl(leagueId, token);
  const subject = fr ? 'Ligue NLS – Confirmez votre abonnement aux alertes' : 'NLS League – Please confirm your game alerts subscription';
  const { html, text } = layout({
    lang,
    preheader: fr ? 'Un clic pour activer vos alertes de matchs.' : 'One click to activate your game alerts.',
    kicker: fr ? 'Confirmation requise' : 'Confirmation required',
    title: fr ? 'Confirmez votre abonnement' : 'Confirm your subscription',
    blocks: [
      para(fr ? (name ? `Bonjour ${name},` : 'Bonjour,') : (name ? `Hello ${name},` : 'Hello,')),
      para(fr
        ? "Une demande d'abonnement aux alertes de matchs de la Ligue NLS a été faite avec cette adresse courriel. Pour l'activer, veuillez cliquer sur le bouton ci-dessous."
        : 'A request to receive NLS League game alerts was made with this email address. To activate it, please click the button below.'),
      button(fr ? 'Confirmer mon abonnement' : 'Confirm my subscription', url),
      small(fr
        ? "Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer ce courriel ; aucune alerte ne vous sera envoyée."
        : 'If you did not make this request, please ignore this email; no alerts will be sent.'),
    ],
    manage: null, unsub: null,
    reason: reasonText('confirm', lang),
  });
  return { to, subject, html, text };
}

// ── WELCOME (post-confirmation) ──────────────────────────────────────────────
export function welcomeEmail({ to, name, leagueId, token, lang }) {
  const fr = isFr(lang);
  const { manage, unsub } = links(leagueId, token);
  const subject = fr ? 'Ligue NLS – Abonnement confirmé' : 'NLS League – Subscription confirmed';
  const greet = fr ? (name ? `Bonjour ${name}, ` : 'Bonjour, ') : (name ? `Hello ${name}, ` : 'Hello, ');
  const { html, text } = layout({
    lang,
    preheader: fr ? 'Vos alertes de matchs sont maintenant actives.' : 'Your game alerts are now active.',
    kicker: fr ? 'Abonnement actif' : 'Subscription active',
    title: fr ? 'Abonnement confirmé' : 'Subscription confirmed',
    blocks: [
      para(greet + (fr
        ? "votre abonnement est maintenant actif. Vous recevrez un courriel lorsqu'un résultat est publié ou qu'un match de vos équipes est modifié ou annulé."
        : 'your subscription is now active. You will receive an email when a result is posted or when a game involving your teams is changed or cancelled.')),
      para(fr
        ? "Vous pouvez modifier vos équipes ou vous désabonner en tout temps à l'aide des liens au bas de ce courriel."
        : 'You may change your teams or unsubscribe at any time using the links at the bottom of this email.'),
      manage ? button(fr ? 'Gérer mes alertes' : 'Manage my alerts', manage) : { html: '', text: '' },
    ],
    manage, unsub,
    reason: reasonText('subscribed', lang),
  });
  return { to, subject, html, text };
}

// ── SCORE RESULT ─────────────────────────────────────────────────────────────
export function scoreEmail({ to, name, leagueId, token, lang, game }) {
  const fr = isFr(lang);
  const { manage, unsub } = links(leagueId, token);
  const winner = game.hs > game.as ? game.home : game.as > game.hs ? game.away : null;
  const subject = fr
    ? `Résultat final : ${game.home} ${game.hs} – ${game.as} ${game.away}`
    : `Final score: ${game.home} ${game.hs} – ${game.as} ${game.away}`;
  const { html, text } = layout({
    lang,
    preheader: [catLabel(game), fmtDate(game.date, lang)].filter(Boolean).join(' · '),
    kicker: fr ? 'Résultat final' : 'Final score',
    title: `${game.home} ${vs(lang)} ${game.away}`,
    blocks: [
      scoreBlock(game),
      para(winner
        ? (fr ? `Victoire : ${winner}` : `Winner: ${winner}`)
        : (fr ? 'Match nul' : 'Tie game'), 'font-weight:bold;color:#111111;'),
      details(gameRows(game, lang), lang),
      button(fr ? 'Consulter le classement et l\'horaire' : 'View standings and schedule', BASE_URL),
    ],
    manage, unsub,
    reason: reasonText('subscribed', lang),
  });
  return { to, subject, html, text };
}

// ── SCHEDULE CHANGE ──────────────────────────────────────────────────────────
export function changeEmail({ to, name, leagueId, token, lang, game, changes }) {
  const fr = isFr(lang);
  const { manage, unsub } = links(leagueId, token);
  const byField = {};
  for (const c of changes || []) byField[c.field] = c;
  const fmt = (field, v) => (field === 'date' ? fmtDate(v, lang) : (v ?? ''));
  const rows = gameRows(game, lang).map(r => (byField[r.key]
    ? { ...r, previous: fmt(r.key, byField[r.key].from) }
    : r));
  if (byField.status) {
    rows.push({ key: 'status', label: fr ? 'Statut' : 'Status', value: game.status || '—', previous: byField.status.from || '' });
  }
  const subject = fr
    ? `Changement à l'horaire : ${game.home} contre ${game.away}`
    : `Schedule change: ${game.home} vs ${game.away}`;
  const { html, text } = layout({
    lang,
    preheader: [catLabel(game), fmtDate(game.date, lang)].filter(Boolean).join(' · '),
    kicker: fr ? "Changement à l'horaire" : 'Schedule change',
    title: `${game.home} ${vs(lang)} ${game.away}`,
    blocks: [
      para(fr
        ? 'Les informations de ce match ont été modifiées. Voici les détails à jour.'
        : 'The details of this game have been updated. The current information is below.'),
      details(rows, lang),
      button(fr ? "Consulter l'horaire" : 'View schedule', BASE_URL),
    ],
    manage, unsub,
    reason: reasonText('subscribed', lang),
  });
  return { to, subject, html, text };
}

// ── GAME CANCELLED ───────────────────────────────────────────────────────────
export function cancelEmail({ to, name, leagueId, token, lang, game }) {
  const fr = isFr(lang);
  const { manage, unsub } = links(leagueId, token);
  const subject = fr
    ? `Match annulé : ${game.home} contre ${game.away}`
    : `Game cancelled: ${game.home} vs ${game.away}`;
  const { html, text } = layout({
    lang,
    preheader: [catLabel(game), fmtDate(game.date, lang)].filter(Boolean).join(' · '),
    kicker: fr ? 'Match annulé' : 'Game cancelled',
    title: `${game.home} ${vs(lang)} ${game.away}`,
    blocks: [
      para(fr ? 'Le match suivant a été annulé par la ligue.' : 'The following game has been cancelled by the league.'),
      details(gameRows(game, lang), lang),
      para(fr
        ? "Veuillez consulter le site de la ligue pour l'horaire à jour."
        : 'Please check the league website for the updated schedule.'),
    ],
    manage, unsub,
    reason: reasonText('subscribed', lang),
  });
  return { to, subject, html, text };
}

// ── ANNOUNCEMENT ─────────────────────────────────────────────────────────────
export function announcementEmail({ to, leagueId, token, subject, body, lang }) {
  const fr = isFr(lang);
  const { manage, unsub } = links(leagueId, token);
  const raw = String(body || '');
  const { html, text } = layout({
    lang,
    preheader: raw.split('\n')[0].slice(0, 120),
    kicker: fr ? 'Message de la Ligue NLS' : 'Message from the NLS League',
    title: subject,
    blocks: [{
      html: `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:#333333;">${esc(raw).replace(/\r?\n/g, '<br>')}</p>`,
      text: raw,
    }],
    manage, unsub,
    reason: reasonText(token ? 'subscribed' : 'test', lang),
  });
  return { to, subject, html, text };
}
