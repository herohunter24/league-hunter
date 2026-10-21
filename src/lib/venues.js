// Adresses des gymnases NLS. Le nom du lieu entré dans Website X est reconnu
// même s'il est écrit un peu différemment (accents, tirets, majuscules).
const VENUES = [
  { keys: ['vianney'], name: 'Collège St-Jean-Vianney', address: '12630 Boul. Gouin E, Montréal, QC H1C 1B9' },
  { keys: ['boulogne'], name: 'Collège de Bois-de-Boulogne', address: '10555 Ave de Bois-de-Boulogne, Montréal, QC H4N 1K7' },
  { keys: ['dalbe'], name: 'École secondaire Dalbé-Viau', address: '740 Rue Esther-Blondin, Lachine, QC H8S 1P1' },
  { keys: ['pointe aux trembles'], name: 'École secondaire de la Pointe-aux-Trembles', address: '15200 Rue Sherbrooke E, Montréal, QC H1A 3P9' },
];

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function findVenue(venue) {
  const n = norm(venue);
  return VENUES.find(v => v.keys.some(k => n.includes(k))) || null;
}

// Lien Google Maps (ouvre l'app sur téléphone). Avec l'adresse exacte quand on la connaît.
export function mapsUrl(venue) {
  const v = findVenue(venue);
  const q = v ? `${v.name}, ${v.address}` : venue;
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
}

export function venueAddress(venue) {
  const v = findVenue(venue);
  return v ? v.address : '';
}
