// Bilingual HTML email templates — NLS brand (black/gold/off-white)

const BASE_URL = process.env.NLS_PUBLIC_URL || 'https://nls-creation.vercel.app';

const LOGO_URL = 'https://www.nlscreation.com/cdn/shop/files/NLSBlack.png';

function shell(content, unsubLink, prefsLink) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>NLS</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:'Inter',Arial,sans-serif;color:#F4F1EA;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border:1px solid #1E1E1E;border-radius:8px;overflow:hidden;">
  <!-- Header -->
  <tr><td style="background:#0A0A0A;padding:28px 40px;border-bottom:2px solid #C9A24A;text-align:center;">
    <span style="font-family:'Arial Black',Arial,sans-serif;font-size:26px;font-weight:900;letter-spacing:0.08em;color:#C9A24A;">NLS</span>
    <span style="font-family:'Arial Black',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.15em;color:#F4F1EA;display:block;margin-top:2px;">NO LIMITS SHOWCASES</span>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:36px 40px 28px;">
    ${content}
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#0A0A0A;padding:20px 40px;border-top:1px solid #1E1E1E;text-align:center;">
    <p style="font-size:11px;color:#555;margin:0 0 8px;">NLS Création · Quebec, Canada</p>
    ${unsubLink ? `<a href="${unsubLink}" style="font-size:11px;color:#888;text-decoration:underline;margin:0 8px;">Se désabonner / Unsubscribe</a>` : ''}
    ${prefsLink ? `<a href="${prefsLink}" style="font-size:11px;color:#888;text-decoration:underline;margin:0 8px;">Gérer mes alertes / Manage alerts</a>` : ''}
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function btn(text, url) {
  return `<a href="${url}" style="display:inline-block;background:#C9A24A;color:#0A0A0A;font-family:'Arial Black',Arial,sans-serif;font-size:14px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:4px;margin:20px 0;">${text}</a>`;
}

function manageUrl(leagueId, token) {
  return `${BASE_URL}/nls-public.html?league=${leagueId}&manage=${token}`;
}

function confirmUrl(leagueId, token) {
  return `${BASE_URL}/nls-public.html?league=${leagueId}&manage=${token}&action=confirm`;
}

// ── CONFIRMATION (double opt-in) ─────────────────────────────────────────────
export function confirmEmail({ to, name, leagueId, token, lang }) {
  const first = name || (lang === 'fr' ? 'Joueur' : 'Fan');
  const url = confirmUrl(leagueId, token);
  const fr = `
    <h1 style="font-family:'Arial Black',Arial,sans-serif;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;color:#F4F1EA;margin:0 0 16px;">Confirme ton abonnement</h1>
    <p style="font-size:15px;color:#C8C5BC;line-height:1.7;margin:0 0 12px;">Bonjour ${first},</p>
    <p style="font-size:15px;color:#C8C5BC;line-height:1.7;margin:0 0 24px;">Clique sur le bouton ci-dessous pour confirmer ton inscription aux alertes de matchs NLS.</p>
    ${btn('Confirmer mon abonnement', url)}
    <p style="font-size:12px;color:#555;margin:20px 0 0;">Ce lien expire dans 48 heures. Si tu n'as pas demandé cet abonnement, ignore simplement ce courriel.</p>`;
  const en = `
    <h1 style="font-family:'Arial Black',Arial,sans-serif;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;color:#F4F1EA;margin:0 0 16px;">Confirm your subscription</h1>
    <p style="font-size:15px;color:#C8C5BC;line-height:1.7;margin:0 0 12px;">Hi ${first},</p>
    <p style="font-size:15px;color:#C8C5BC;line-height:1.7;margin:0 0 24px;">Click the button below to confirm your NLS game alerts subscription.</p>
    ${btn('Confirm my subscription', url)}
    <p style="font-size:12px;color:#555;margin:20px 0 0;">This link expires in 48 hours. If you didn't sign up, just ignore this email.</p>`;
  const content = lang === 'fr' ? fr : en;
  const subject = lang === 'fr' ? 'Confirme tes alertes NLS' : 'Confirm your NLS alerts';
  return { to, subject, html: shell(content, null, null) };
}

// ── WELCOME (post-confirmation) ──────────────────────────────────────────────
export function welcomeEmail({ to, name, leagueId, token, lang }) {
  const first = name || (lang === 'fr' ? 'joueur' : 'fan');
  const prefs = manageUrl(leagueId, token);
  const fr = `
    <h1 style="font-family:'Arial Black',Arial,sans-serif;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;color:#C9A24A;margin:0 0 16px;">Tu es abonné(e) !</h1>
    <p style="font-size:15px;color:#C8C5BC;line-height:1.7;margin:0 0 24px;">Merci ${first}. Tu recevras maintenant des alertes pour les matchs que tu suis.</p>
    <p style="font-size:14px;color:#888;margin:0;">Tu peux modifier tes préférences ou te désabonner en tout temps via le lien en bas de chaque courriel.</p>`;
  const en = `
    <h1 style="font-family:'Arial Black',Arial,sans-serif;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;color:#C9A24A;margin:0 0 16px;">You're subscribed!</h1>
    <p style="font-size:15px;color:#C8C5BC;line-height:1.7;margin:0 0 24px;">Thanks ${first}. You'll now receive alerts for the games you follow.</p>
    <p style="font-size:14px;color:#888;margin:0;">You can update your preferences or unsubscribe at any time via the link in every email.</p>`;
  const subject = lang === 'fr' ? 'Bienvenue aux alertes NLS !' : 'Welcome to NLS alerts!';
  return { to, subject, html: shell(lang === 'fr' ? fr : en, prefs, prefs) };
}

// ── GAME REMINDER ─────────────────────────────────────────────────────────────
export function reminderEmail({ to, name, leagueId, token, lang, game }) {
  const prefs = manageUrl(leagueId, token);
  const unsub = `${prefs}&unsub=1`;
  const gameDate = new Date(game.date + 'T12:00').toLocaleDateString(
    lang === 'fr' ? 'fr-CA' : 'en-CA',
    { weekday: 'long', day: 'numeric', month: 'long' }
  );
  const fr = `
    <p style="font-size:11px;font-weight:700;letter-spacing:0.2em;color:#C9A24A;text-transform:uppercase;margin:0 0 12px;">Rappel de match · 24h</p>
    <h1 style="font-family:'Arial Black',Arial,sans-serif;font-size:20px;font-weight:900;color:#F4F1EA;margin:0 0 20px;">${game.home} vs ${game.away}</h1>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #1E1E1E;font-size:13px;color:#888;">Date</td><td style="padding:10px 0;border-bottom:1px solid #1E1E1E;font-size:14px;color:#F4F1EA;text-align:right;">${gameDate.charAt(0).toUpperCase() + gameDate.slice(1)}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #1E1E1E;font-size:13px;color:#888;">Heure</td><td style="padding:10px 0;border-bottom:1px solid #1E1E1E;font-size:14px;color:#F4F1EA;text-align:right;">${game.time || 'À confirmer'}</td></tr>
      <tr><td style="padding:10px 0;font-size:13px;color:#888;">Lieu</td><td style="padding:10px 0;font-size:14px;color:#F4F1EA;text-align:right;">${game.venue || 'À confirmer'}</td></tr>
    </table>`;
  const en = `
    <p style="font-size:11px;font-weight:700;letter-spacing:0.2em;color:#C9A24A;text-transform:uppercase;margin:0 0 12px;">Game Reminder · 24h</p>
    <h1 style="font-family:'Arial Black',Arial,sans-serif;font-size:20px;font-weight:900;color:#F4F1EA;margin:0 0 20px;">${game.home} vs ${game.away}</h1>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #1E1E1E;font-size:13px;color:#888;">Date</td><td style="padding:10px 0;border-bottom:1px solid #1E1E1E;font-size:14px;color:#F4F1EA;text-align:right;">${gameDate.charAt(0).toUpperCase() + gameDate.slice(1)}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #1E1E1E;font-size:13px;color:#888;">Time</td><td style="padding:10px 0;border-bottom:1px solid #1E1E1E;font-size:14px;color:#F4F1EA;text-align:right;">${game.time || 'TBD'}</td></tr>
      <tr><td style="padding:10px 0;font-size:13px;color:#888;">Venue</td><td style="padding:10px 0;font-size:14px;color:#F4F1EA;text-align:right;">${game.venue || 'TBD'}</td></tr>
    </table>`;
  const subject = lang === 'fr'
    ? `Rappel : ${game.home} vs ${game.away} demain`
    : `Reminder: ${game.home} vs ${game.away} tomorrow`;
  return { to, subject, html: shell(lang === 'fr' ? fr : en, unsub, prefs) };
}

// ── SCORE RESULT ─────────────────────────────────────────────────────────────
export function scoreEmail({ to, name, leagueId, token, lang, game }) {
  const prefs = manageUrl(leagueId, token);
  const unsub = `${prefs}&unsub=1`;
  const winner = game.hs > game.as ? game.home : game.as > game.hs ? game.away : null;
  const fr = `
    <p style="font-size:11px;font-weight:700;letter-spacing:0.2em;color:#C9A24A;text-transform:uppercase;margin:0 0 12px;">Résultat final</p>
    <h1 style="font-family:'Arial Black',Arial,sans-serif;font-size:20px;font-weight:900;color:#F4F1EA;margin:0 0 20px;">${game.home} vs ${game.away}</h1>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:12px;background:#0A0A0A;border-radius:6px;overflow:hidden;">
      <tr>
        <td style="padding:16px 20px;font-size:15px;font-weight:700;color:#F4F1EA;">${game.home}</td>
        <td style="padding:16px 20px;font-size:26px;font-weight:900;color:#C9A24A;text-align:right;">${game.hs}</td>
      </tr>
      <tr style="border-top:1px solid #1E1E1E;">
        <td style="padding:16px 20px;font-size:15px;font-weight:700;color:#F4F1EA;">${game.away}</td>
        <td style="padding:16px 20px;font-size:26px;font-weight:900;color:#C9A24A;text-align:right;">${game.as}</td>
      </tr>
    </table>
    ${winner ? `<p style="font-size:13px;color:#888;margin:8px 0 0;">Victoire de ${winner}</p>` : '<p style="font-size:13px;color:#888;margin:8px 0 0;">Match nul</p>'}`;
  const en = `
    <p style="font-size:11px;font-weight:700;letter-spacing:0.2em;color:#C9A24A;text-transform:uppercase;margin:0 0 12px;">Final Score</p>
    <h1 style="font-family:'Arial Black',Arial,sans-serif;font-size:20px;font-weight:900;color:#F4F1EA;margin:0 0 20px;">${game.home} vs ${game.away}</h1>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:12px;background:#0A0A0A;border-radius:6px;overflow:hidden;">
      <tr>
        <td style="padding:16px 20px;font-size:15px;font-weight:700;color:#F4F1EA;">${game.home}</td>
        <td style="padding:16px 20px;font-size:26px;font-weight:900;color:#C9A24A;text-align:right;">${game.hs}</td>
      </tr>
      <tr style="border-top:1px solid #1E1E1E;">
        <td style="padding:16px 20px;font-size:15px;font-weight:700;color:#F4F1EA;">${game.away}</td>
        <td style="padding:16px 20px;font-size:26px;font-weight:900;color:#C9A24A;text-align:right;">${game.as}</td>
      </tr>
    </table>
    ${winner ? `<p style="font-size:13px;color:#888;margin:8px 0 0;">${winner} wins</p>` : '<p style="font-size:13px;color:#888;margin:8px 0 0;">Tie game</p>'}`;
  const subject = lang === 'fr'
    ? `Résultat : ${game.home} ${game.hs} – ${game.as} ${game.away}`
    : `Score: ${game.home} ${game.hs} – ${game.as} ${game.away}`;
  return { to, subject, html: shell(lang === 'fr' ? fr : en, unsub, prefs) };
}

// ── SCHEDULE CHANGE ──────────────────────────────────────────────────────────
export function changeEmail({ to, name, leagueId, token, lang, game, changes }) {
  const prefs = manageUrl(leagueId, token);
  const unsub = `${prefs}&unsub=1`;
  const changeRows = changes.map(({ field, from, to: toVal }) => {
    const labels = { date: lang === 'fr' ? 'Date' : 'Date', time: lang === 'fr' ? 'Heure' : 'Time', venue: lang === 'fr' ? 'Lieu' : 'Venue', status: 'Statut/Status' };
    return `<tr style="border-top:1px solid #1E1E1E;"><td style="padding:10px 16px;font-size:13px;color:#888;">${labels[field] || field}</td><td style="padding:10px 16px;font-size:13px;color:#888;text-decoration:line-through;">${from || '—'}</td><td style="padding:10px 16px;font-size:13px;color:#C9A24A;">${toVal || '—'}</td></tr>`;
  }).join('');
  const content = `
    <p style="font-size:11px;font-weight:700;letter-spacing:0.2em;color:#C9A24A;text-transform:uppercase;margin:0 0 12px;">${lang === 'fr' ? 'Changement de match' : 'Game Update'}</p>
    <h1 style="font-family:'Arial Black',Arial,sans-serif;font-size:20px;font-weight:900;color:#F4F1EA;margin:0 0 20px;">${game.home} vs ${game.away}</h1>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#0A0A0A;border-radius:6px;overflow:hidden;margin-bottom:16px;">
      <tr style="background:#111;"><td style="padding:8px 16px;font-size:11px;font-weight:700;letter-spacing:0.1em;color:#555;text-transform:uppercase;">${lang === 'fr' ? 'Champ' : 'Field'}</td><td style="padding:8px 16px;font-size:11px;font-weight:700;letter-spacing:0.1em;color:#555;text-transform:uppercase;">${lang === 'fr' ? 'Avant' : 'Before'}</td><td style="padding:8px 16px;font-size:11px;font-weight:700;letter-spacing:0.1em;color:#555;text-transform:uppercase;">${lang === 'fr' ? 'Après' : 'After'}</td></tr>
      ${changeRows}
    </table>`;
  const subject = lang === 'fr'
    ? `Changement : ${game.home} vs ${game.away}`
    : `Update: ${game.home} vs ${game.away}`;
  return { to, subject, html: shell(content, unsub, prefs) };
}

// ── ANNOUNCEMENT ─────────────────────────────────────────────────────────────
export function announcementEmail({ to, leagueId, token, subject, body }) {
  const prefs = token ? manageUrl(leagueId, token) : null;
  const unsub = prefs ? `${prefs}&unsub=1` : null;
  const content = `<div style="font-size:15px;color:#C8C5BC;line-height:1.75;">${body.replace(/\n/g, '<br/>')}</div>`;
  return { to, subject, html: shell(content, unsub, prefs) };
}
