import { useState } from 'react';
import { subscribe } from '../lib/alerts.js';

export function AlertsModal({ leagueId, lang, t, teams, categories, onClose }) {
  const [email, setEmail]       = useState('');
  const [name, setName]         = useState('');
  const [selCats, setSelCats]   = useState([]);
  const [selTeams, setSelTeams] = useState([]);
  const [types, setTypes]       = useState({ reminder: true, scores: true, changes: true });
  const [consent, setConsent]   = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [busy, setBusy]         = useState(false);
  const [done, setDone]         = useState(false);
  const [err, setErr]           = useState('');

  function toggleCat(id) { setSelCats(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); }
  function toggleTeam(id) { setSelTeams(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); }
  function toggleType(k) { setTypes(p => ({ ...p, [k]: !p[k] })); }

  async function submit(e) {
    e.preventDefault();
    if (!consent) { setErr(t.alertsNeedConsent); return; }
    setBusy(true); setErr('');
    try {
      const res = await subscribe({ leagueId, email, name, categories: selCats, teams: selTeams, types, lang, honeypot });
      if (res.ok) setDone(true);
      else setErr(t.alertsError);
    } catch {
      setErr(t.alertsError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-ov alerts-modal-ov" onClick={e => { if (e.target.classList.contains('modal-ov')) onClose(); }}>
      <div className="modal-bx alerts-modal-bx" role="dialog" aria-modal="true" aria-labelledby="alerts-title">
        <button className="modal-close" onClick={onClose} aria-label="Fermer">✕</button>

        {done ? (
          <div className="alerts-done">
            <div className="alerts-done-icon" aria-hidden="true">✓</div>
            <div className="alerts-done-title">{t.alertsDoneTitle}</div>
            <p className="alerts-done-sub">{t.alertsDoneSub} <strong>{email}</strong></p>
            <button className="btn alerts-btn" onClick={onClose}>{t.alertsDoneClose}</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="alerts-kicker" aria-hidden="true">{t.alertsKicker}</div>
            <h2 id="alerts-title" className="alerts-title">{t.alertsTitle}</h2>
            <p className="alerts-sub">{t.alertsSub}</p>

            {/* Honeypot — hidden from real users */}
            <input
              type="text" name="website" value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
              autoComplete="off" tabIndex={-1}
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
              aria-hidden="true"
            />

            <div className="alerts-field">
              <label className="alerts-label" htmlFor="al-email">{t.alertsEmail} *</label>
              <input
                id="al-email" type="email" className="alerts-inp" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="ton@courriel.com"
                autoComplete="email"
              />
            </div>

            <div className="alerts-field">
              <label className="alerts-label" htmlFor="al-name">{t.alertsName}</label>
              <input
                id="al-name" type="text" className="alerts-inp"
                value={name} onChange={e => setName(e.target.value)}
                placeholder={lang === 'fr' ? 'Prénom (optionnel)' : 'First name (optional)'}
                autoComplete="given-name"
              />
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="alerts-field">
                <div className="alerts-label">{t.alertsCats}</div>
                <div className="alerts-chips">
                  {categories.map(c => (
                    <button
                      key={c.id} type="button"
                      className={`alerts-chip${selCats.includes(c.id) ? ' selected' : ''}`}
                      onClick={() => toggleCat(c.id)}
                    >{c.name}</button>
                  ))}
                </div>
                {categories.length > 0 && selCats.length === 0 && (
                  <div className="alerts-hint">{t.alertsAllCats}</div>
                )}
              </div>
            )}

            {/* Teams */}
            {teams.length > 0 && (
              <div className="alerts-field">
                <div className="alerts-label">{t.alertsTeams}</div>
                <div className="alerts-chips">
                  {teams.slice(0, 20).map(tm => (
                    <button
                      key={tm.id} type="button"
                      className={`alerts-chip${selTeams.includes(tm.name) ? ' selected' : ''}`}
                      onClick={() => toggleTeam(tm.name)}
                    >{tm.name}</button>
                  ))}
                </div>
                {selTeams.length === 0 && (
                  <div className="alerts-hint">{t.alertsAllTeams}</div>
                )}
              </div>
            )}

            {/* Alert types */}
            <div className="alerts-field">
              <div className="alerts-label">{t.alertsTypes}</div>
              <div className="alerts-checks">
                {[
                  ['reminder', t.alertsTypeReminder],
                  ['scores',   t.alertsTypeScore],
                  ['changes',  t.alertsTypeChange],
                ].map(([k, label]) => (
                  <label key={k} className="alerts-check-row">
                    <input
                      type="checkbox" checked={types[k]}
                      onChange={() => toggleType(k)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Privacy + consent */}
            <div className="alerts-privacy">{t.alertsPrivacy}</div>
            <label className="alerts-consent-row">
              <input
                type="checkbox" required
                checked={consent} onChange={e => setConsent(e.target.checked)}
              />
              <span className="alerts-consent-text">{t.alertsConsent}</span>
            </label>

            {err && <div className="alerts-err" role="alert">{err}</div>}

            <button
              type="submit" className="btn alerts-btn"
              disabled={busy || !email || !consent}
            >
              {busy ? '…' : t.alertsSubmit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
