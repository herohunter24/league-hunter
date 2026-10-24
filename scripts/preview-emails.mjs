// Render every alert email (FR + EN) with sample data into a folder for visual review.
// Usage: node scripts/preview-emails.mjs [outDir]   (default: email-preview)
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  confirmEmail, welcomeEmail, scoreEmail, changeEmail, cancelEmail, announcementEmail,
} from '../functions/templates.js';

const out = process.argv[2] || 'email-preview';
mkdirSync(out, { recursive: true });

const base = { to: 'alex@example.com', name: 'Alex', firstName: 'Alex', leagueId: 'demo', token: 'demo-token' };
const game = {
  home: 'Lions de Laval', away: 'Titans de Montréal', hs: 68, as: 61,
  date: '2026-11-08', time: '19:30', venue: 'Collège St-Jean-Vianney', categoryLabel: 'U15 Masculin · Or',
};
const changed = { ...game, hs: null, as: null, date: '2026-11-15', venue: 'Collège de Bois-de-Boulogne' };
const changes = [
  { field: 'date', from: '2026-11-08', to: '2026-11-15' },
  { field: 'venue', from: 'Collège St-Jean-Vianney', to: 'Collège de Bois-de-Boulogne' },
];
const annBody = 'Bonjour à tous,\nLes matchs de samedi sont maintenus.\nTest d\'échappement : <b>ceci ne doit pas être en gras</b> & "guillemets".';

const emails = {
  confirm: lang => confirmEmail({ ...base, lang }),
  welcome: lang => welcomeEmail({ ...base, lang }),
  score: lang => scoreEmail({ ...base, lang, game }),
  change: lang => changeEmail({ ...base, lang, game: changed, changes }),
  cancel: lang => cancelEmail({ ...base, lang, game: { ...game, hs: null, as: null } }),
  announcement: lang => announcementEmail({ ...base, lang, subject: 'Annonce : horaire de samedi', body: annBody }),
};

const items = [];
for (const [name, fn] of Object.entries(emails)) {
  for (const lang of ['fr', 'en']) {
    const e = fn(lang);
    writeFileSync(join(out, `${name}-${lang}.html`), e.html);
    writeFileSync(join(out, `${name}-${lang}.txt`), `Subject: ${e.subject}\n\n${e.text}\n`);
    items.push({ name, lang, subject: e.subject });
  }
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
writeFileSync(join(out, 'index.html'), `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Email previews</title></head>
<body style="font-family:Arial,sans-serif;padding:24px"><h1>NLS alert email previews</h1><ul>
${items.map(i => `<li><b>${i.name} (${i.lang.toUpperCase()})</b> – ${esc(i.subject)} – <a href="${i.name}-${i.lang}.html">HTML</a> · <a href="${i.name}-${i.lang}.txt">Text</a></li>`).join('\n')}
</ul></body></html>\n`);
console.log(`Wrote ${items.length} emails to ${out}`);
