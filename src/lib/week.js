// Outils de semaine pour le Calendrier (vue « Par semaine · toute la ligue »).
// Fonctions pures — dates 'YYYY-MM-DD', calculs en UTC pour éviter les sauts d'heure (DST).

const TZ = 'America/Toronto';

// Date d'aujourd'hui à Montréal/Toronto, format 'YYYY-MM-DD'
export function torontoToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// Minutes depuis minuit à Montréal/Toronto
export function torontoNowMinutes() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = type => +((parts.find(p => p.type === type) || {}).value || 0);
  return (get('hour') % 24) * 60 + get('minute');
}

export function addDays(ymd, n) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Lundi de la semaine (lun–dim)
export function weekStart(ymd) {
  const d = new Date(ymd + 'T00:00:00Z');
  return addDays(ymd, -((d.getUTCDay() + 6) % 7));
}

// Heure du match → minutes depuis minuit ; null si illisible
export function timeToMinutes(t) {
  // Format québécois : « 19h00 », « 19 h 00 », « 19h »
  const q = /(\d{1,2})\s*h\s*(\d{2})?/i.exec(t || '');
  if (q && !/\d{1,2}:\d{2}/.test(t)) { const h = +q[1], mm = q[2] ? +q[2] : 0; if (h < 24 && mm < 60) return h * 60 + mm; }
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(t || ''); if (!m) return null; let h = +m[1] % 12; if (!m[3] || m[3].toUpperCase() === 'PM') h += (m[3] ? 12 : +m[1] - (+m[1] % 12)); return h * 60 + +m[2];
}

// 'final' | 'pending' (joué, score pas encore entré) | 'upcoming' — recalculé à chaque rendu
export function gameWeekStatus(g, today, nowMin) {
  if (g.hs != null && g.as != null) return 'final';
  if (g.date < today) return 'pending';
  if (g.date > today) return 'upcoming';
  const m = timeToMinutes(g.time);
  return m !== null && m <= nowMin ? 'pending' : 'upcoming';
}

export function fmtWeekLabel(startYmd, lang, todayYmd, t) {
  const endYmd = addDays(startYmd, 6);
  const locale = lang === 'fr' ? 'fr-CA' : 'en-CA';
  const sy = startYmd.slice(0, 4), ey = endYmd.slice(0, 4), ty = (todayYmd || '').slice(0, 4);
  const withYear = sy !== ey || sy !== ty;
  const fmt = (ymd, opts) => new Date(ymd + 'T12:00').toLocaleDateString(locale, opts);
  // FR : le 1er du mois → « 1er »
  const fixFirst = (str, ymd) => (lang === 'fr' && ymd.slice(8, 10) === '01' ? str.replace(/^1(?!\d)/, '1er') : str);
  const full = ymd => fmt(ymd, withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' });
  const sameMonth = startYmd.slice(0, 7) === endYmd.slice(0, 7);
  let a = full(startYmd), b = full(endYmd);
  if (sameMonth) {
    if (lang === 'fr') a = String(+startYmd.slice(8, 10));
    else { a = fmt(startYmd, { day: 'numeric', month: 'short' }); b = String(+endYmd.slice(8, 10)) + (withYear ? ', ' + ey : ''); }
  }
  if (lang === 'fr') { a = fixFirst(a, startYmd); b = fixFirst(b, endYmd); }
  return t.weekLabel.replace('{a}', a).replace('{b}', b);
}
