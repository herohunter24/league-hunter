import { useState } from 'react';
import { subscribe } from '../lib/alerts.js';
import { TeamFollowPicker, FollowList } from './TeamFollowPicker.jsx';

export function AlertsModal({ leagueId, lang, t, teams, categories, onClose }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [follows, setFollows]     = useState([]);
  const [picking, setPicking]     = useState(true);
  const [types, setTypes]         = useState({ scores: true, changes: true });
  const [consent, setConsent]     = useState(false);
  const [honeypot, setHoneypot]   = useState('');
  const [busy, setBusy]           = useState(false);
  const [done, setDone]           = useState(false);
  const [err, setErr]             = useState('');

  function toggleType(k) { setTypes(p => ({ ...p, [k]: !p[k] })); }
  function addFollow(f) {
    setFollows(p => p.some(x => x.categoryId === f.categoryId && x.team === f.team) ? p : [...p, f]);
    setPicking(false);
  }
  function removeFollow(f) {
    const next = follows.filter(x => !(x.categoryId === f.categoryId && x.team === f.team));
    setFollows(next);
    if (next.length === 0) setPicking(true);
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = firstName.trim() && lastName.trim() && emailOk && follows.length > 0 && consent && !busy;

  async function submit(e) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !emailOk) { setErr(t.alertsNeedFields); return; }
    if (follows.length === 0) { setErr(t.alertsNeedTeam); return; }
    if (!consent) { setErr(t.alertsNeedConsent); return; }
    setBusy(true); setErr('');
    try {
      const res = await subscribe({
        leagueId, email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim(),
        follows, types, lang, honeypot,
      });
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

            <div className="alerts-field alerts-row2">
              <div>
                <label className="alerts-label" htmlFor="al-first">{t.alertsFirstName} *</label>
                <input id="al-first" type="text" className="alerts-inp" required
                  value={firstName} onChange={e => setFirstName(e.target.value)}
                  autoComplete="given-name" maxLength={60} />
              </div>
              <div>
                <label className="alerts-label" htmlFor="al-last">{t.alertsLastName} *</label>
                <input id="al-last" type="text" className="alerts-inp" required
                  value={lastName} onChange={e => setLastName(e.target.value)}
                  autoComplete="family-name" maxLength={60} />
              </div>
            </div>

            <div className="alerts-field">
              <label className="alerts-label" htmlFor="al-email">{t.alertsEmail} *</label>
              <input
                id="al-email" type="email" className="alerts-inp" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="ton@courriel.com"
                autoComplete="email"
              />
            </div>

            {/* Teams to follow */}
            <div className="alerts-field">
              <div className="alerts-label">{t.alertsTeams} *</div>
              <FollowList follows={follows} categories={categories} lang={lang} onRemove={removeFollow} />
              {picking ? (
                <TeamFollowPicker
                  categories={categories} teams={teams} follows={follows} lang={lang} t={t}
                  onAdd={addFollow}
                  onCancel={follows.length ? () => setPicking(false) : null}
                />
              ) : (
                <button type="button" className="alerts-add-btn" onClick={() => setPicking(true)}>
                  {t.alertsAddTeam}
                </button>
              )}
            </div>

            {/* Alert types */}
            <div className="alerts-field">
              <div className="alerts-label">{t.alertsTypes}</div>
              <div className="alerts-checks">
                {[
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

            <button type="submit" className="btn alerts-btn" disabled={!canSubmit}>
              {busy ? '…' : t.alertsSubmit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
