// Logos des clubs NLS (fichiers dans public/logo/teams/).
// Un logo s'applique à toutes les équipes du club, peu importe la catégorie
// (ex. « REBELS BF », « REBELS JM », « CB ELITE (2) CM »).
// Un logo téléversé dans l'admin (team.logoUrl) a toujours priorité.

const CLUB_LOGOS = {
  '3KBM': '3kbm',
  'AGBU': 'agbu',
  'BLUEHOUNDS': 'bluehounds',
  'BREAKPOINT': 'breakpoint',
  'C.B.O. CAVALIERS': 'cavaliers',
  'CB ELITE': 'cb-elite',
  'C.S.S.': 'css',
  'COBRAS': 'cobras',
  'CSJV': 'csjv',
  'CSS': 'css',
  'DALBE-VIAU': 'dalbe-viau',
  'DROPOFF': 'dropoff',
  'FUSION': 'fusion',
  'GD ELITE': 'gd-elite',
  'GILAS': 'gilas',
  'LEGACY': 'legacy',
  'LEVEL UP': 'level-up',
  'MATRIX': 'matrix',
  'MENTOR SPORT': 'btb-elite',
  'MTG': 'mtg',
  'NEMESIS': 'nemesis',
  'NFNL': 'nfnl',
  'NORDSTAR': 'nordstar',
  'NSL SELECT': 'nsl-select',
  'PHEBUS': 'phebus',
  'PINK PANTHERS': 'pink-panthers',
  'PREMIER PAS': 'premier-pas',
  'REBELS': 'rebels',
  'REVOLUTION': 'revolution',
  'ROM BBALL': 'rom-bball',
  'SAGESSE': 'sagesse',
  'SSM': 'ssm',
  'UPHILL': 'uphill',
};

// « DALBÉ-VIAU (2) BM » -> « DALBE-VIAU »
export function clubKey(teamName) {
  return String(teamName || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\(\d+\)/g, ' ')
    .replace(/\s+(BF|BM|CF|CM|JF|JM)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function clubLogoUrl(teamName) {
  const file = CLUB_LOGOS[clubKey(teamName)];
  return file ? `/logo/teams/${file}.webp` : '';
}
