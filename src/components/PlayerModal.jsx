import { useState, useEffect } from 'react';
import { LEAGUE_ID } from '../lib/firebase.js';
import { getPlayerProgression } from '../lib/rp.js';
import { scoutingReport } from '../lib/scouting.js';
import { PlayerCard } from './PlayerCard.jsx';
import { TeamBadge } from './TeamBadge.jsx';

export function PlayerModal({ p, teams, units, lang, t, games, onClose, onShare }) {
  const [report, setReport] = useState(null);
  useEffect(() => { setReport(null); }, [p.id, lang]);
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const team = (teams || []).find(tm => tm.name === p.team);
  const pid = p.id;
  const pGames = (games || [])
    .filter(g => g.hs !== null && g.playerStats && g.playerStats[pid] !== undefined)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const sumK = k => pGames.reduce((s, g) => s + (+((g.playerStats[pid] || {})[k] || 0)), 0);
  const fgPct = sumK('fga') > 0 ? (sumK('fgm') / sumK('fga') * 100).toFixed(1) : null;
  const ftPct = sumK('fta') > 0 ? (sumK('ftm') / sumK('fta') * 100).toFixed(1) : null;
  const prog = getPlayerProgression(p.rp);
  const statCells = [
    ['PTS/G', p.ppg.toFixed(1)], ['REB/G', p.rpg.toFixed(1)], ['AST/G', p.apg.toFixed(1)],
    ['STL/G', (p.spg || 0).toFixed(1)], ['BLK/G', (p.bpg || 0).toFixed(1)],
    ...(fgPct !== null ? [['FG%', fgPct + '%']] : []),
    ...(ftPct !== null ? [['FT%', ftPct + '%']] : []),
    [t.gp, String(p.gp || 0)],
  ];

  const fmtDate = (d, lang) => new Date(d + 'T12:00').toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="modal-ov" onClick={e => { if (e.target.classList.contains('modal-ov')) onClose(); }}>
      <div className="pmodal" style={{ position: 'relative' }}>
        <button className="pmodal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="pmodal-body">
          <div className="pmodal-left">
            <PlayerCard p={p} lang={lang} t={t} teams={teams} units={units} onShare={onShare} />
          </div>
          <div className="pmodal-right">
            <div className="pm-name">{p.number ? `#${p.number} ` : ''}{p.name}</div>
            <div className="pm-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TeamBadge team={team} size={18} />
              <span>{p.team}{p.pos ? ' · ' + p.pos : ''} · {p.arch[lang]}</span>
            </div>

            {!report && <button className="pm-scout-btn" onClick={() => setReport(scoutingReport(p, pGames, fgPct, lang))}>{t.scoutBtn}</button>}
            {report && (
              <div className="pm-report">
                <div className="pm-report-h">📋 {t.scoutTitle}</div>
                {report}
              </div>
            )}

            <div className="pm-section-t">{t.seasonStats}</div>
            <div className="pm-stats-grid">
              {statCells.map(([k, v]) => (
                <div key={k} className="pm-stat"><div className="pm-stat-v">{v}</div><div className="pm-stat-k">{k}</div></div>
              ))}
            </div>

            <div className="pm-section-t">{t.tierProgress}</div>
            <div className="pm-prog-head">
              <span className="pm-prog-tier">{prog.curIcon} {prog.curLabel}</span>
              {!prog.isMax && <span className="pm-prog-tier" style={{ color: 'var(--ink-soft)' }}>{prog.nextIcon} {prog.nextLabel}</span>}
            </div>
            <div className="pm-prog-bar"><div className="pm-prog-fill" style={{ width: prog.pct + '%' }}></div></div>
            <div className="pm-prog-need">{prog.isMax ? t.maxTier : t.rpToReach(prog.rpNeeded, prog.nextLabel)}</div>

            <div className="pm-section-t">{t.gameLog}</div>
            {pGames.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="pm-log">
                  <thead><tr><th>Date</th><th>{t.opponent}</th><th style={{ textAlign: 'center' }}>{t.ppg}</th><th style={{ textAlign: 'center' }}>{t.rpg}</th><th style={{ textAlign: 'center' }}>{t.apg}</th></tr></thead>
                  <tbody>
                    {pGames.map(g => {
                      const opp = g.home === p.team ? g.away : g.home;
                      const st = g.playerStats[pid] || {};
                      return (
                        <tr key={g.id}>
                          <td style={{ color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{fmtDate(g.date, lang)}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{opp}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{+(st.points || 0)}</td>
                          <td style={{ textAlign: 'center' }}>{+(st.rebounds || 0)}</td>
                          <td style={{ textAlign: 'center' }}>{+(st.assists || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="pm-prog-need" style={{ textAlign: 'left' }}>{t.noGamesYet}</div>
            )}

            <div className="pm-actions">
              <button className="pm-btn" style={{ background: 'var(--orange)', color: '#000' }} onClick={() => onShare(p)}>⤓ {t.download}</button>
              <button className="pm-btn" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }} onClick={() => {
                const url = `${location.origin}${location.pathname}?league=${LEAGUE_ID || ''}&player=${p.id}`;
                if (navigator.share) navigator.share({ title: p.name, url }).catch(() => {});
                else navigator.clipboard.writeText(url).then(() => {}).catch(() => {});
              }}>🔗 {t.share}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
