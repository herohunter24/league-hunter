export const DEMO_TEAMS = [
  { id: 1, name: 'Dynastie MTL',     emoji: '👑', color: '#e8b54a', w: 15, l: 3,  pf: 1632, pa: 1421, last5: [1,1,1,0,1] },
  { id: 2, name: 'Vipères Laval',    emoji: '🐍', color: '#34d27b', w: 14, l: 4,  pf: 1588, pa: 1402, last5: [1,1,0,1,1] },
  { id: 3, name: 'Tonnerre Québec',  emoji: '⚡', color: '#7fb8ff', w: 11, l: 7,  pf: 1494, pa: 1457, last5: [0,1,1,1,0] },
  { id: 4, name: 'Phénix Longueuil', emoji: '🔥', color: '#ff6b1a', w: 9,  l: 9,  pf: 1440, pa: 1448, last5: [1,0,1,0,0] },
  { id: 5, name: 'Loups du Nord',    emoji: '🐺', color: '#b9b9c4', w: 6,  l: 12, pf: 1377, pa: 1503, last5: [0,0,1,0,1] },
  { id: 6, name: 'Royaux Verdun',    emoji: '🏰', color: '#c084fc', w: 3,  l: 15, pf: 1298, pa: 1576, last5: [0,0,0,1,0] },
];

export const DEMO_PLAYERS = [
  { id: 1,  name: 'Marcus Bélanger',   team: 'Dynastie MTL',     pos: 'Meneur',  tier: 'legend',   arch: { fr: 'ICÔNE',      en: 'ICON' },      ppg: 28.4, rpg: 5.2,  apg: 9.1, spg: 2.1, bpg: 0.4, rp: 9650, gp: 18 },
  { id: 2,  name: 'David Tremblay',    team: 'Vipères Laval',    pos: 'Ailier',  tier: 'champion', arch: { fr: 'FINISSEUR',  en: 'CLOSER' },    ppg: 24.7, rpg: 7.8,  apg: 4.3, spg: 1.4, bpg: 1.1, rp: 6200, gp: 18 },
  { id: 3,  name: 'Kevin Nzeza',       team: 'Dynastie MTL',     pos: 'Centre',  tier: 'diamond',  arch: { fr: 'SNIPER',     en: 'SNIPER' },    ppg: 22.1, rpg: 11.4, apg: 2.2, spg: 0.8, bpg: 2.3, rp: 3150, gp: 17 },
  { id: 4,  name: 'Jean-Phil Roy',     team: 'Tonnerre Québec',  pos: 'Arrière', tier: 'diamond',  arch: { fr: 'SNIPER',     en: 'SNIPER' },    ppg: 21.8, rpg: 3.6,  apg: 5.5, spg: 1.7, bpg: 0.3, rp: 2580, gp: 16 },
  { id: 5,  name: 'Samuel Okafor',     team: 'Vipères Laval',    pos: 'Centre',  tier: 'platinum', arch: { fr: 'PILIER',     en: 'ANCHOR' },    ppg: 16.2, rpg: 12.7, apg: 1.8, spg: 0.6, bpg: 2.8, rp: 1480, gp: 18 },
  { id: 6,  name: 'Alex Gagné',        team: 'Phénix Longueuil', pos: 'Meneur',  tier: 'platinum', arch: { fr: 'CRÉATEUR',   en: 'PLAYMAKER' }, ppg: 15.9, rpg: 4.1,  apg: 8.4, spg: 1.9, bpg: 0.2, rp: 1180, gp: 17 },
  { id: 7,  name: 'Thierry Lavoie',    team: 'Dynastie MTL',     pos: 'Ailier',  tier: 'gold',     arch: { fr: 'MARQUEUR',   en: 'SCORER' },    ppg: 14.6, rpg: 6.3,  apg: 3.1, spg: 1.1, bpg: 0.7, rp: 760,  gp: 16 },
  { id: 8,  name: 'Mathieu Côté',      team: 'Tonnerre Québec',  pos: 'Ailier',  tier: 'gold',     arch: { fr: 'REBONDEUR',  en: 'REBOUNDER' }, ppg: 12.8, rpg: 9.6,  apg: 2.4, spg: 0.9, bpg: 1.2, rp: 620,  gp: 18 },
  { id: 9,  name: 'Ibrahim Diallo',    team: 'Loups du Nord',    pos: 'Arrière', tier: 'gold',     arch: { fr: 'MARQUEUR',   en: 'SCORER' },    ppg: 13.5, rpg: 3.2,  apg: 4.7, spg: 1.5, bpg: 0.3, rp: 510,  gp: 15 },
  { id: 10, name: 'Olivier Fortin',    team: 'Phénix Longueuil', pos: 'Centre',  tier: 'silver',   arch: { fr: 'DÉFENSEUR',  en: 'DEFENDER' },  ppg: 9.4,  rpg: 8.1,  apg: 1.2, spg: 0.7, bpg: 1.6, rp: 320,  gp: 17 },
  { id: 11, name: 'William Lessard',   team: 'Royaux Verdun',    pos: 'Meneur',  tier: 'silver',   arch: { fr: 'CRÉATEUR',   en: 'PLAYMAKER' }, ppg: 10.2, rpg: 2.8,  apg: 6.3, spg: 1.3, bpg: 0.1, rp: 250,  gp: 16 },
  { id: 12, name: 'Nathan Bouchard',   team: 'Loups du Nord',    pos: 'Ailier',  tier: 'bronze',   arch: { fr: 'BATAILLEUR', en: 'GRINDER' },   ppg: 6.7,  rpg: 4.5,  apg: 1.9, spg: 0.8, bpg: 0.5, rp: 95,   gp: 14 },
  { id: 13, name: 'Émile Sanon',       team: 'Royaux Verdun',    pos: 'Arrière', tier: 'bronze',   arch: { fr: 'BATAILLEUR', en: 'GRINDER' },   ppg: 5.9,  rpg: 2.1,  apg: 2.6, spg: 0.6, bpg: 0.2, rp: 60,   gp: 13 },
  { id: 14, name: 'Lucas Pelletier',   team: 'Vipères Laval',    pos: 'Arrière', tier: 'silver',   arch: { fr: 'DÉFENSEUR',  en: 'DEFENDER' },  ppg: 8.8,  rpg: 3.4,  apg: 3.8, spg: 1.0, bpg: 0.4, rp: 210,  gp: 16 },
];

export const DEMO_GAMES = [
  { id: 1,  date: '2026-06-14', time: '19:00', home: 'Dynastie MTL',     away: 'Vipères Laval',    venue: 'Centre Pierre-Charbonneau',           hs: null, as: null },
  { id: 2,  date: '2026-06-15', time: '14:00', home: 'Tonnerre Québec',  away: 'Phénix Longueuil', venue: 'PEPS Université Laval',               hs: null, as: null },
  { id: 3,  date: '2026-06-16', time: '20:00', home: 'Loups du Nord',    away: 'Royaux Verdun',    venue: 'Complexe sportif Claude-Robillard',   hs: null, as: null },
  { id: 4,  date: '2026-06-21', time: '19:00', home: 'Vipères Laval',    away: 'Tonnerre Québec',  venue: 'Centre sportif Laval',                hs: null, as: null },
  { id: 5,  date: '2026-06-08', time: '19:00', home: 'Dynastie MTL',     away: 'Phénix Longueuil', venue: 'Centre Pierre-Charbonneau',           hs: 98,   as: 84   },
  { id: 6,  date: '2026-06-07', time: '15:00', home: 'Vipères Laval',    away: 'Loups du Nord',    venue: 'Centre sportif Laval',                hs: 91,   as: 76   },
  { id: 7,  date: '2026-06-06', time: '20:00', home: 'Royaux Verdun',    away: 'Tonnerre Québec',  venue: 'Auditorium de Verdun',                hs: 72,   as: 88   },
  { id: 8,  date: '2026-05-31', time: '19:00', home: 'Phénix Longueuil', away: 'Vipères Laval',    venue: 'Collège Champlain',                   hs: 80,   as: 95   },
  { id: 9,  date: '2026-05-30', time: '14:00', home: 'Tonnerre Québec',  away: 'Dynastie MTL',     venue: 'PEPS Université Laval',               hs: 79,   as: 102  },
  { id: 10, date: '2026-05-29', time: '20:00', home: 'Loups du Nord',    away: 'Phénix Longueuil', venue: 'Complexe sportif Claude-Robillard',   hs: 83,   as: 77   },
];
