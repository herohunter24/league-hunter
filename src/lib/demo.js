export const DEMO_TEAMS = [
  { id: 1, name: 'Dynastie MTL',     emoji: '👑', color: '#e8b54a', w: 15, l: 3,  pf: 1632, pa: 1421, last5: [1,1,1,0,1] },
  { id: 2, name: 'Vipères Laval',    emoji: '🐍', color: '#34d27b', w: 14, l: 4,  pf: 1588, pa: 1402, last5: [1,1,0,1,1] },
  { id: 3, name: 'Tonnerre Québec',  emoji: '⚡', color: '#7fb8ff', w: 11, l: 7,  pf: 1494, pa: 1457, last5: [0,1,1,1,0] },
  { id: 4, name: 'Phénix Longueuil', emoji: '🔥', color: '#ff6b1a', w: 9,  l: 9,  pf: 1440, pa: 1448, last5: [1,0,1,0,0] },
  { id: 5, name: 'Loups du Nord',    emoji: '🐺', color: '#b9b9c4', w: 6,  l: 12, pf: 1377, pa: 1503, last5: [0,0,1,0,1] },
  { id: 6, name: 'Royaux Verdun',    emoji: '🏰', color: '#c084fc', w: 3,  l: 15, pf: 1298, pa: 1576, last5: [0,0,0,1,0] },
];

export const DEMO_PLAYERS = [
  { id: 1,  name: 'Marcus Bélanger',   team: 'Dynastie MTL',     pos: 'Meneur',  tier: 'legend',   arch: { fr: 'ICÔNE',      en: 'ICON' },      ppg: 28.4, rpg: 5.2,  apg: 9.1, spg: 2.1, bpg: 0.4, rp: 9650, gp: 18, pctRank: 99.5 },
  { id: 2,  name: 'David Tremblay',    team: 'Vipères Laval',    pos: 'Ailier',  tier: 'amethyst', arch: { fr: 'FINISSEUR',  en: 'CLOSER' },    ppg: 24.7, rpg: 7.8,  apg: 4.3, spg: 1.4, bpg: 1.1, rp: 6200, gp: 18, pctRank: 97.8 },
  { id: 3,  name: 'Kevin Nzeza',       team: 'Dynastie MTL',     pos: 'Centre',  tier: 'diamond',  arch: { fr: 'SNIPER',     en: 'SNIPER' },    ppg: 22.1, rpg: 11.4, apg: 2.2, spg: 0.8, bpg: 2.3, rp: 3150, gp: 17, pctRank: 94.5 },
  { id: 4,  name: 'Jean-Phil Roy',     team: 'Tonnerre Québec',  pos: 'Arrière', tier: 'diamond',  arch: { fr: 'SNIPER',     en: 'SNIPER' },    ppg: 21.8, rpg: 3.6,  apg: 5.5, spg: 1.7, bpg: 0.3, rp: 2580, gp: 16, pctRank: 93.2 },
  { id: 5,  name: 'Samuel Okafor',     team: 'Vipères Laval',    pos: 'Centre',  tier: 'ruby',     arch: { fr: 'PILIER',     en: 'ANCHOR' },    ppg: 16.2, rpg: 12.7, apg: 1.8, spg: 0.6, bpg: 2.8, rp: 1480, gp: 18, pctRank: 87.3 },
  { id: 6,  name: 'Alex Gagné',        team: 'Phénix Longueuil', pos: 'Meneur',  tier: 'ruby',     arch: { fr: 'CRÉATEUR',   en: 'PLAYMAKER' }, ppg: 15.9, rpg: 4.1,  apg: 8.4, spg: 1.9, bpg: 0.2, rp: 1180, gp: 17, pctRank: 85.4 },
  { id: 7,  name: 'Thierry Lavoie',    team: 'Dynastie MTL',     pos: 'Ailier',  tier: 'gold',     arch: { fr: 'MARQUEUR',   en: 'SCORER' },    ppg: 14.6, rpg: 6.3,  apg: 3.1, spg: 1.1, bpg: 0.7, rp: 760,  gp: 16, pctRank: 76.2 },
  { id: 8,  name: 'Mathieu Côté',      team: 'Tonnerre Québec',  pos: 'Ailier',  tier: 'gold',     arch: { fr: 'REBONDEUR',  en: 'REBOUNDER' }, ppg: 12.8, rpg: 9.6,  apg: 2.4, spg: 0.9, bpg: 1.2, rp: 620,  gp: 18, pctRank: 72.5 },
  { id: 9,  name: 'Ibrahim Diallo',    team: 'Loups du Nord',    pos: 'Arrière', tier: 'gold',     arch: { fr: 'MARQUEUR',   en: 'SCORER' },    ppg: 13.5, rpg: 3.2,  apg: 4.7, spg: 1.5, bpg: 0.3, rp: 510,  gp: 15, pctRank: 70.3 },
  { id: 10, name: 'Olivier Fortin',    team: 'Phénix Longueuil', pos: 'Centre',  tier: 'silver',   arch: { fr: 'DÉFENSEUR',  en: 'DEFENDER' },  ppg: 9.4,  rpg: 8.1,  apg: 1.2, spg: 0.7, bpg: 1.6, rp: 320,  gp: 17, pctRank: 58.1 },
  { id: 11, name: 'William Lessard',   team: 'Royaux Verdun',    pos: 'Meneur',  tier: 'silver',   arch: { fr: 'CRÉATEUR',   en: 'PLAYMAKER' }, ppg: 10.2, rpg: 2.8,  apg: 6.3, spg: 1.3, bpg: 0.1, rp: 250,  gp: 16, pctRank: 53.6 },
  { id: 12, name: 'Nathan Bouchard',   team: 'Loups du Nord',    pos: 'Ailier',  tier: 'bronze',   arch: { fr: 'BATAILLEUR', en: 'GRINDER' },   ppg: 6.7,  rpg: 4.5,  apg: 1.9, spg: 0.8, bpg: 0.5, rp: 95,   gp: 14, pctRank: 35.0 },
  { id: 13, name: 'Émile Sanon',       team: 'Royaux Verdun',    pos: 'Arrière', tier: 'bronze',   arch: { fr: 'BATAILLEUR', en: 'GRINDER' },   ppg: 5.9,  rpg: 2.1,  apg: 2.6, spg: 0.6, bpg: 0.2, rp: 60,   gp: 13, pctRank: 18.0 },
  { id: 14, name: 'Lucas Pelletier',   team: 'Vipères Laval',    pos: 'Arrière', tier: 'silver',   arch: { fr: 'DÉFENSEUR',  en: 'DEFENDER' },  ppg: 8.8,  rpg: 3.4,  apg: 3.8, spg: 1.0, bpg: 0.4, rp: 210,  gp: 16, pctRank: 50.8 },
];

/** Four fictional showcase cards shown when the live league has no real players yet. */
export const DEMO_SHOWCASE_PLAYERS = [
  { id: 'demo-bronze',  name: 'Joueur Exemple',  team: 'Équipe Exemple', pos: '', tier: 'bronze',  arch: { fr: '', en: '' }, ppg: 4.2,  rpg: 2.1, apg: 1.0, spg: 0, bpg: 0, rp: 0, gp: 5,  pctRank: 25,   photoUrl: '', number: '', height: null, weight: null },
  { id: 'demo-gold',    name: 'Joueuse Exemple', team: 'Équipe Exemple', pos: '', tier: 'gold',    arch: { fr: '', en: '' }, ppg: 12.5, rpg: 5.3, apg: 3.2, spg: 0, bpg: 0, rp: 0, gp: 8,  pctRank: 75,   photoUrl: '', number: '', height: null, weight: null },
  { id: 'demo-diamond', name: 'Joueur Exemple',  team: 'Équipe Exemple', pos: '', tier: 'diamond', arch: { fr: '', en: '' }, ppg: 21.0, rpg: 8.0, apg: 5.0, spg: 0, bpg: 0, rp: 0, gp: 10, pctRank: 94.0, photoUrl: '', number: '', height: null, weight: null },
  { id: 'demo-legend',  name: 'Joueuse Exemple', team: 'Équipe Exemple', pos: '', tier: 'legend',  arch: { fr: '', en: '' }, ppg: 30.5, rpg: 11.2, apg: 7.5, spg: 0, bpg: 0, rp: 0, gp: 12, pctRank: 99.5, photoUrl: '', number: '', height: null, weight: null },
];

/** One example card per tier — shown on the hidden ?tiers=preview test page. */
export const DEMO_ALL_TIERS_PLAYERS = [
  { id: 'pt-bronze',   name: 'Joueur Exemple', team: 'Équipe Exemple', pos: '', tier: 'bronze',   arch: { fr: 'BATAILLEUR', en: 'GRINDER'   }, ppg: 5.0,  rpg: 2.0, apg: 1.0, spg: 0, bpg: 0, rp: 0, gp: 4,  pctRank: 12,   photoUrl: '', number: '', height: null, weight: null },
  { id: 'pt-silver',   name: 'Joueur Exemple', team: 'Équipe Exemple', pos: '', tier: 'silver',   arch: { fr: 'DÉFENSEUR',  en: 'DEFENDER'  }, ppg: 7.5,  rpg: 4.0, apg: 2.0, spg: 0, bpg: 0, rp: 0, gp: 6,  pctRank: 35,   photoUrl: '', number: '', height: null, weight: null },
  { id: 'pt-gold',     name: 'Joueur Exemple', team: 'Équipe Exemple', pos: '', tier: 'gold',     arch: { fr: 'MARQUEUR',   en: 'SCORER'    }, ppg: 12.0, rpg: 5.0, apg: 3.0, spg: 0, bpg: 0, rp: 0, gp: 8,  pctRank: 52,   photoUrl: '', number: '', height: null, weight: null },
  { id: 'pt-emerald',  name: 'Joueur Exemple', team: 'Équipe Exemple', pos: '', tier: 'emerald',  arch: { fr: 'REBONDEUR',  en: 'REBOUNDER' }, ppg: 14.5, rpg: 7.5, apg: 2.5, spg: 0, bpg: 0, rp: 0, gp: 10, pctRank: 65,   photoUrl: '', number: '', height: null, weight: null },
  { id: 'pt-sapphire', name: 'Joueur Exemple', team: 'Équipe Exemple', pos: '', tier: 'sapphire', arch: { fr: 'CRÉATEUR',   en: 'PLAYMAKER' }, ppg: 17.0, rpg: 4.5, apg: 6.0, spg: 0, bpg: 0, rp: 0, gp: 12, pctRank: 77,   photoUrl: '', number: '', height: null, weight: null },
  { id: 'pt-ruby',     name: 'Joueur Exemple', team: 'Équipe Exemple', pos: '', tier: 'ruby',     arch: { fr: 'SNIPER',     en: 'SNIPER'    }, ppg: 20.0, rpg: 5.0, apg: 3.5, spg: 0, bpg: 0, rp: 0, gp: 14, pctRank: 86,   photoUrl: '', number: '', height: null, weight: null },
  { id: 'pt-amethyst', name: 'Joueur Exemple', team: 'Équipe Exemple', pos: '', tier: 'amethyst', arch: { fr: 'FINISSEUR',  en: 'CLOSER'    }, ppg: 23.5, rpg: 7.0, apg: 4.5, spg: 0, bpg: 0, rp: 0, gp: 15, pctRank: 92,   photoUrl: '', number: '', height: null, weight: null },
  { id: 'pt-diamond',  name: 'Joueur Exemple', team: 'Équipe Exemple', pos: '', tier: 'diamond',  arch: { fr: 'SNIPER',     en: 'SNIPER'    }, ppg: 27.0, rpg: 9.0, apg: 5.0, spg: 0, bpg: 0, rp: 0, gp: 16, pctRank: 96,   photoUrl: '', number: '', height: null, weight: null },
  { id: 'pt-legend',   name: 'Joueur Exemple', team: 'Équipe Exemple', pos: '', tier: 'legend',   arch: { fr: 'ICÔNE',      en: 'ICON'      }, ppg: 31.0, rpg: 11.0, apg: 8.0, spg: 0, bpg: 0, rp: 0, gp: 18, pctRank: 99.5, photoUrl: '', number: '', height: null, weight: null },
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
