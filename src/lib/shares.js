import { FUNCTIONS_URL } from './alerts.js';
import { LEAGUE_ID } from './firebase.js';

// Mois courant (heure de Toronto/Montréal) au format "YYYY-MM"
export function monthKey(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit' }).formatToParts(d);
  const y = parts.find(x => x.type === 'year')?.value;
  const m = parts.find(x => x.type === 'month')?.value;
  return `${y}-${m}`;
}

// Compte un partage de carte réussi (fire-and-forget, n'échoue jamais côté UI)
export function recordShare(playerId) {
  if (!LEAGUE_ID || playerId == null) return;
  try {
    fetch(`${FUNCTIONS_URL}/nlsCardShare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: String(LEAGUE_ID), playerId: String(playerId) }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* ignore */ }
}
