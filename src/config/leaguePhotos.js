// NLS-only league photos (public/images/league). Rendered only when the loaded league is NLS.
// `pos` is the object-position used when a photo is cropped into a 2/3 portrait panel.
const P = '/images/league/';
const ballon   = { src: P + 'league-ballon.webp',   pos: '50% 20%', w: 801,  h: 1200 };
const banc     = { src: P + 'league-banc.webp',     pos: '50% 15%', w: 800,  h: 1200 };
const joueuses = { src: P + 'league-joueuses.webp', pos: '14% 50%', w: 1200, h: 800 };
const matchF   = { src: P + 'league-match-f.webp',  pos: '58% 50%', w: 1200, h: 802 };

export const LEAGUE_PHOTOS = {
  // ambient panel rows (category view + category picker)
  amb: { f: [ballon, matchF, joueuses], m: [banc, ballon, joueuses], picker: [banc, ballon, matchF] },
  // "À propos" gallery — shown uncropped
  about: { portraits: [ballon, banc], wide: [joueuses, matchF] },
};
