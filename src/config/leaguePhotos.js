// NLS-only league photos (public/images/league). Rendered only when the loaded league is NLS.
// `pos` is the object-position used when a photo is cropped into an ambient panel.
const P = '/images/league/';
const ballon   = { src: P + 'league-ballon.webp',   pos: '50% 20%', w: 801,  h: 1200 };
const banc     = { src: P + 'league-banc.webp',     pos: '50% 15%', w: 800,  h: 1200 };
const joueuses = { src: P + 'league-joueuses.webp', pos: '14% 50%', w: 1200, h: 800 };
const matchF   = { src: P + 'league-match-f.webp',  pos: '58% 50%', w: 1200, h: 802 };
const dunk         = { src: P + 'action-dunk.webp',          pos: '55% 12%', w: 934, h: 1400 };
const tir          = { src: P + 'action-tir.webp',           pos: '50% 28%', w: 934, h: 1400 };
const penetration  = { src: P + 'action-penetration.webp',   pos: '48% 35%', w: 934, h: 1400 };
const fillesCourse = { src: P + 'action-filles-course.webp', pos: '52% 22%', w: 933, h: 1400 };

export const LEAGUE_PHOTOS = {
  // ambient panel rows (category view + category picker)
  amb: { picker: [dunk, tir, penetration], m: [tir, dunk, penetration], f: [fillesCourse, matchF, joueuses] },
  // "À propos" gallery — shown uncropped
  about: { portraits: [ballon, banc], action: [dunk, tir, penetration, fillesCourse], wide: [joueuses, matchF] },
};
