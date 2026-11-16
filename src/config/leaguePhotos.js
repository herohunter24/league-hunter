// NLS-only league photos (public/images/league). Rendered only when the loaded league is NLS.
const P = '/images/league/';
const ballon   = { src: P + 'league-ballon.webp',   pos: '50% 22%', w: 801,  h: 1200 };
const banc     = { src: P + 'league-banc.webp',     pos: '50% 25%', w: 800,  h: 1200 };
const joueuses = { src: P + 'league-joueuses.webp', pos: '50% 35%', w: 1200, h: 800 };
const matchF   = { src: P + 'league-match-f.webp',  pos: '50% 30%', w: 1200, h: 802 };

export const LEAGUE_PHOTOS = {
  f: [joueuses, matchF],       // ambient layer, girls' categories
  m: [banc, ballon],           // ambient layer, every other category
  collage: [ballon, banc, joueuses], // landing mission collage
};
