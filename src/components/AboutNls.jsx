import { useEffect, useRef } from 'react';
import { LEAGUE_PHOTOS } from '../config/leaguePhotos.js';

// NLS-only "À propos" full-screen view (same overlay pattern as PotmExplainer).
export function AboutNls({ t, lang, onClose }) {
  const rootRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') { onCloseRef.current(); return; }
      if (e.key !== 'Tab' || !rootRef.current) return;
      const els = rootRef.current.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      const inside = rootRef.current.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (!inside || document.activeElement === last)) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (closeRef.current) closeRef.current.focus();
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);

  const locale = lang === 'fr' ? 'fr-CA' : 'en-CA';
  const photo = ph => (
    <img key={ph.src} src={ph.src} alt="" width={ph.w} height={ph.h} loading="lazy" decoding="async" />
  );

  return (
    <div className="potm-how about-nls" role="dialog" aria-modal="true" aria-labelledby="about-nls-title" ref={rootRef}>
      <button className="potm-how-close about-close" ref={closeRef} onClick={onClose} aria-label={t.aboutClose}>{'✕'}</button>
      <div className="potm-how-inner">
        <div className="sec-kicker">{t.aboutKicker}</div>
        <h1 className="potm-how-title" id="about-nls-title">{t.aboutTitle}</h1>
        <p className="potm-how-lead">{t.aboutLead}</p>

        <section className="potm-how-sec"><h2>{t.aboutMissionT}</h2><p>{t.aboutMissionP}</p></section>

        <section className="potm-how-sec">
          <h2>{t.aboutValuesT}</h2>
          <div className="mission-values">
            {[[t.val1Name, t.val1Line], [t.val2Name, t.val2Line], [t.val3Name, t.val3Line]].map(([n, l]) => (
              <div className="mv-item" key={n}>
                <div className="mv-name">{n}</div>
                <div className="mv-line">{l}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="potm-how-sec">
          <div className="mission-stats">
            <div className="sec-kicker">{t.missionStatsKicker}</div>
            <div className="ms-grid">
              {[[12, '', t.statCats], [140, '+', t.statTeams], [1500, '+', t.statYouth], [500, '+', t.statGames], [2, t.statsViewsSuffix, t.statViews]].map(([n, suf, lbl]) => (
                <div className="ms-item" key={lbl}>
                  <span className="ms-num"><span data-count={n}>{n.toLocaleString(locale)}</span>{suf && <span>{suf}</span>}</span>
                  <span className="ms-lbl">{lbl}</span>
                </div>
              ))}
            </div>
          </div>
          <p>{t.aboutStatsP}</p>
        </section>

        <div className="about-gal" aria-hidden="true">
          <div className="about-gal-row">{LEAGUE_PHOTOS.about.portraits.map(photo)}</div>
          <div className="about-gal-row about-gal-wide">{LEAGUE_PHOTOS.about.wide.map(photo)}</div>
        </div>

        <section className="potm-how-sec"><h2>{t.aboutImpactT}</h2><p>{t.aboutImpactP}</p></section>

        <section className="potm-how-sec">
          <div className="mission-share">
            <span className="msh-title">{t.shareTitle}</span>
            <span className="msh-p">{t.shareP}</span>
          </div>
        </section>

        <section className="potm-how-sec"><h2>{t.aboutCommunityT}</h2><p>{t.aboutCommunityP}</p></section>

        <div className="about-foot"><button className="btn mission-more" onClick={onClose}>{t.aboutClose}</button></div>
      </div>
    </div>
  );
}
