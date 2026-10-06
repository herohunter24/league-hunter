// Cloud Functions base URL — update after deploying
export const FUNCTIONS_URL = 'https://us-east1-league-hunter.cloudfunctions.net';

export async function subscribe({ leagueId, email, name, categories, teams, types, lang, honeypot }) {
  const r = await fetch(`${FUNCTIONS_URL}/nlsSubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leagueId, email, name, categories, teams, types, lang, honeypot }),
  });
  return r.json();
}

export async function confirmSub({ token, league }) {
  const r = await fetch(`${FUNCTIONS_URL}/nlsConfirm?token=${encodeURIComponent(token)}&league=${encodeURIComponent(league)}`);
  return r.json();
}

export async function loadPrefs({ token, league }) {
  const r = await fetch(`${FUNCTIONS_URL}/nlsPrefs?token=${encodeURIComponent(token)}&league=${encodeURIComponent(league)}`);
  return r.json();
}

export async function savePrefs({ token, leagueId, categories, teams, types, lang }) {
  const r = await fetch(`${FUNCTIONS_URL}/nlsPrefs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, leagueId, categories, teams, types, lang }),
  });
  return r.json();
}

export async function unsubscribe({ token, leagueId }) {
  const r = await fetch(`${FUNCTIONS_URL}/nlsUnsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, leagueId }),
  });
  return r.json();
}
