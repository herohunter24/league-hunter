import { useState, useEffect } from 'react';
import { loadPrefs, savePrefs, unsubscribe, confirmSub } from '../lib/alerts.js';

export function AlertsManage({ leagueId, token, action, lang, t, teams, categories }) {
  const [sub, setSub]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);
  const [unsubDone, setUnsubDone] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Confirmation flow
  useEffect(() => {
    if (action !== 'confirm') return;
    confirmSub({ token, league: leagueId })
      .then(r => { if (r.ok) setConfirmed(true); else setError(t.alertsManageError); })
      .catch(() => setError(t.alertsManageError))
      .finally(() => setLoading(false));
  }, [action, token, leagueId]);

  // Load prefs
  useEffect(() => {
    if (action === 'confirm') return;
    loadPrefs({ token, league: leagueId })
      .then(r => {
        if (r.ok) setSub(r.sub);
        else setError(t.alertsManageError);
      })
      .catch(() => setError(t.alertsManageError))
      .finally(() => setLoading(false));
  }, [token, leagueId, action]);

  // Handle ?unsub=1 deep-link from emails
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('unsub') === '1' && token) {
      handleUnsub();
    }
  }, [token]);

  function updateSub(patch) { setSub(s => ({ ...s, ...patch })); }
  function toggleCat(id) { updateSub({ categories: sub.categories.includes(id) ? sub.categories.filter(x => x !== id) : [...sub.categories, id] }); }
  function toggleTeam(nm) { updateSub({ teams: sub.teams.includes(nm) ? sub.teams.filter(x => x !== nm) : [...sub.teams, nm] }); }
  function toggleType(k) { updateSub({ types: { ...sub.types, [k]: !sub.types[k] } }); }

  async function handleSave(e) {
    e.preventDefault();
    try {
      await savePrefs({ token, leagueId, categories: sub.categories, teams: sub.teams, types: sub.types, lang: sub.lang });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError(t.alertsManageError); }
  }

  async function handleUnsub() {
    if (!confirm(t.alertsUnsubConfirm)) return;
    try {
      await unsubscribe({ token, leagueId });
      setUnsubDone(true);
    } catch { setError(t.alertsManageError); }
  }

  if (loading) return (
    <div className="manage-page">
      <div className="manage-loading">{t.alertsManageLoading}</div>
    </div>
  );

  if (confirmed) return (
    <div className="manage-page">
      <div className="manage-confirmed">
        <div className="manage-confirmed-icon" aria-hidden="true">✓</div>
        <h1 className="manage-confirmed-title">{t.alertsConfirmedTitle}</h1>
        <p className="manage-confirmed-sub">{t.alertsConfirmedSub}</p>
        <a href={window.location.pathname + '?league=' + leagueId} className="btn">{t.alertsBackToSite}</a>
      </div>
    </div>
  );

  if (unsubDone) return (
    <div className="manage-page">
      <div className="manage-confirmed">
        <h1 className="manage-confirmed-title">{t.alertsUnsubDoneTitle}</h1>
        <p className="manage-confirmed-sub">{t.alertsUnsubDoneSub}</p>
        <a href={window.location.pathname + '?league=' + leagueId} className="btn">{t.alertsBackToSite}</a>
      </div>
    </div>
  );

  if (error) return (
    <div className="manage-page">
      <div className="manage-error">{error}</div>
      <a href={window.location.pathname + '?league=' + leagueId} className="btn" style={{ marginTop: 20 }}>{t.alertsBackToSite}</a>
    </div>
  );

  if (!sub) return null;

  return (
    <div className="manage-page">
      <div className="manage-card">
        <div className="alerts-kicker" aria-hidden="true">{t.alertsKicker}</div>
        <h1 className="manage-title">{t.alertsPrefsTitle}</h1>
        {sub.email && <p className="manage-email">{sub.email}</p>}

        <form onSubmit={handleSave}>
          {/* Categories */}
          {categories.length > 0 && (
            <div className="alerts-field">
              <div className="alerts-label">{t.alertsCats}</div>
              <div className="alerts-chips">
                {categories.map(c => (
                  <button key={c.id} type="button"
                    className={`alerts-chip${sub.categories.includes(c.id) ? ' selected' : ''}`}
                    onClick={() => toggleCat(c.id)}>{c.name}</button>
                ))}
              </div>
              {sub.categories.length === 0 && <div className="alerts-hint">{t.alertsAllCats}</div>}
            </div>
          )}

          {/* Teams */}
          {teams.length > 0 && (
            <div className="alerts-field">
              <div className="alerts-label">{t.alertsTeams}</div>
              <div className="alerts-chips">
                {teams.slice(0, 20).map(tm => (
                  <button key={tm.id} type="button"
                    className={`alerts-chip${sub.teams.includes(tm.name) ? ' selected' : ''}`}
                    onClick={() => toggleTeam(tm.name)}>{tm.name}</button>
                ))}
              </div>
              {sub.teams.length === 0 && <div className="alerts-hint">{t.alertsAllTeams}</div>}
            </div>
          )}

          {/* Types */}
          <div className="alerts-field">
            <div className="alerts-label">{t.alertsTypes}</div>
            <div className="alerts-checks">
              {[['reminder', t.alertsTypeReminder], ['scores', t.alertsTypeScore], ['changes', t.alertsTypeChange]].map(([k, label]) => (
                <label key={k} className="alerts-check-row">
                  <input type="checkbox" checked={sub.types?.[k] ?? true} onChange={() => toggleType(k)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="manage-btns">
            <button type="submit" className="btn alerts-btn">
              {saved ? (lang === 'fr' ? 'Enregistré ✓' : 'Saved ✓') : t.alertsSave}
            </button>
          </div>
        </form>

        <div className="manage-sep" />
        <button type="button" className="manage-unsub-btn" onClick={handleUnsub}>
          {t.alertsUnsub}
        </button>
        <div className="manage-back">
          <a href={window.location.pathname + '?league=' + leagueId}>{t.alertsBackToSite}</a>
        </div>
      </div>
    </div>
  );
}
