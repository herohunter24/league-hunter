import { useState, useRef, useEffect, useCallback } from 'react';
import { TIERS } from '../lib/tiers.js';
import { TeamBadge } from './TeamBadge.jsx';
import { SafeImage, PlayerSilhouette, isLegacyOrange } from './SafeImage.jsx';
import { NLS_LOGO_WHITE } from '../config/league.js';
import { formatHeight, formatWeight } from '../lib/data.js';

const fmtN = (n, lg) => (+(n || 0)).toLocaleString(lg === 'fr' ? 'fr-CA' : 'en-CA', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pad3 = n => String(n || 0).padStart(3, '0');

// Holo opacity per tier — all tiers get the effect, scaled by prestige
const HOLO_OP = { bronze: 0.25, silver: 0.4, gold: 0.72, platinum: 1, diamond: 1, champion: 1, legend: 1 };

// Module-level iOS orientation permission state shared across all cards
let orientationPermission = 'unknown'; // 'unknown' | 'requesting' | 'granted' | 'denied'

function useHolo() {
  const ref = useRef(null);
  const rafId = useRef(null);
  const reduce = useRef(false);
  const hovered = useRef(false);
  const tiltCleanup = useRef(null);

  const apply = useCallback((x, y) => {
    const el = ref.current;
    if (!el || reduce.current) return;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      const rx = (y - 0.5) * 22;
      const ry = (x - 0.5) * -22;
      el.style.setProperty('--holo-x', `${x * 100}%`);
      el.style.setProperty('--holo-y', `${y * 100}%`);
      el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
  }, []);

  const reset = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }
    el.style.transform = '';
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduce.current = mq.matches;
    const onMq = e => { reduce.current = e.matches; };
    mq.addEventListener('change', onMq);

    const el = ref.current;
    if (!el) return;

    const onMove = e => {
      hovered.current = true;
      const rect = el.getBoundingClientRect();
      apply((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
    };
    const onLeave = () => { hovered.current = false; reset(); };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);

    // DeviceOrientation with iOS 13+ permission handling
    const onTilt = e => {
      if (!e.beta || !e.gamma || hovered.current) return;
      apply(Math.max(0, Math.min(1, (e.gamma + 45) / 90)), Math.max(0, Math.min(1, (e.beta + 45) / 90)));
    };
    const setupTilt = () => {
      window.addEventListener('deviceorientation', onTilt, { passive: true });
      tiltCleanup.current = () => window.removeEventListener('deviceorientation', onTilt);
    };

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ — must request permission from a user gesture
      if (orientationPermission === 'granted') {
        setupTilt();
      } else if (orientationPermission === 'unknown') {
        const handlePermClick = () => {
          if (orientationPermission !== 'unknown') return;
          orientationPermission = 'requesting';
          DeviceOrientationEvent.requestPermission()
            .then(state => {
              orientationPermission = state === 'granted' ? 'granted' : 'denied';
              if (state === 'granted') setupTilt();
            })
            .catch(() => { orientationPermission = 'denied'; });
        };
        el.addEventListener('click', handlePermClick, { once: true, capture: true });
      }
    } else if (typeof DeviceOrientationEvent !== 'undefined') {
      // Android / desktop — no permission needed
      setupTilt();
    }

    // Slow auto-shimmer with random initial phase — only runs while card is visible
    let shimPos = 0.18 + Math.random() * 0.64;
    let shimDir = Math.random() > 0.5 ? 1 : -1;
    let shimTimer = null;

    const startShimmer = () => {
      if (shimTimer || reduce.current) return;
      shimTimer = setInterval(() => {
        if (hovered.current) return;
        shimPos += 0.004 * shimDir;
        if (shimPos > 0.82) shimDir = -1;
        if (shimPos < 0.18) shimDir = 1;
        el.style.setProperty('--holo-x', `${shimPos * 100}%`);
      }, 100);
    };
    const stopShimmer = () => {
      if (shimTimer) { clearInterval(shimTimer); shimTimer = null; }
    };

    // IntersectionObserver: only animate when visible
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) startShimmer(); else stopShimmer(); });
    }, { threshold: 0, rootMargin: '80px' });
    observer.observe(el);

    return () => {
      observer.disconnect();
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      mq.removeEventListener('change', onMq);
      if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }
      stopShimmer();
      if (tiltCleanup.current) { tiltCleanup.current(); tiltCleanup.current = null; }
    };
  }, [apply, reset]);

  return ref;
}

export function PlayerCard({ p, lang, t, onShare, onOpen, teams, units, cardNumber, cardTotal }) {
  const tier = TIERS[p.tier];
  const team = (teams || []).find(tm => tm.name === p.team);
  const teamColor = (team && team.color && !isLegacyOrange(team.color)) ? team.color : 'var(--gold)';
  const holoRef = useHolo();
  const [logoOk, setLogoOk] = useState(true);

  const setLine = cardNumber && cardTotal
    ? `NLS · ${lang === 'fr' ? 'Saison' : 'Season'} 2026 · ${pad3(cardNumber)}/${pad3(cardTotal)}`
    : `NLS · 2026`;

  const hw = [formatHeight(p.height, units), formatWeight(p.weight, units)].filter(Boolean).join(' · ');

  return (
    <div
      className={`pcard ${tier.cls}`}
      id={`pcard-${p.id}`}
      ref={holoRef}
      style={{ '--holo-op': HOLO_OP[p.tier] ?? 0.5 }}
      onClick={onOpen ? () => onOpen(p) : undefined}
    >
      <div className="pcard-inner">
        {/* Holographic glare overlay — all tiers, opacity scaled by HOLO_OP */}
        <div className="pc-holo" aria-hidden="true" />

        {/* Jersey number watermark — inside inner so it clips correctly */}
        {p.number && <div className="pc-jersey-bg" aria-hidden="true">{p.number}</div>}

        {/* Top bar */}
        <div className="pc-top">
          <div className="pc-league-badge">
            {logoOk
              ? <img src={NLS_LOGO_WHITE} alt="NLS" className="pc-logo-img" crossOrigin="anonymous" onError={() => setLogoOk(false)} />
              : <span className="pc-league-text">NLS</span>
            }
            <span className="pc-season-text">2026</span>
          </div>
          <div className="pc-tier-block">
            <div className="pc-tier">{tier.label}</div>
            <div className="pc-arch">{(p.arch[lang] || '').toUpperCase()}</div>
          </div>
        </div>

        {/* Share button — absolutely positioned so it doesn't overlap tier block */}
        {onShare && (
          <button className="pc-share" title={t.download} onClick={e => { e.stopPropagation(); onShare(p); }}>
            ⤓
          </button>
        )}

        {/* Player photo */}
        <div className="pc-photo">
          <SafeImage
            src={p.photoUrl}
            alt={p.name}
            loading="lazy"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
            fallback={<PlayerSilhouette />}
          />
        </div>

        {/* Team color accent line */}
        <div className="pc-accent-line" style={{ background: teamColor }} />

        {/* Bottom info */}
        <div className="pc-bottom">
          <div className="pc-name">{p.number ? <span className="pc-num">#{p.number}</span> : null}{p.name}</div>
          <div className="pc-meta">
            <TeamBadge team={team} size={14} />
            <span>{p.team}{p.pos ? ` · ${p.pos}` : ''}</span>
          </div>
          {hw && <div className="pc-meta" style={{ marginTop: 2 }}>{hw}</div>}
        </div>

        {/* Stats bar */}
        <div className="pc-stats">
          <div className="pc-stat">
            <div className="pc-stat-v">{fmtN(p.ppg, lang)}</div>
            <div className="pc-stat-k">{t.ppg}</div>
          </div>
          <div className="pc-stat">
            <div className="pc-stat-v">{fmtN(p.rpg, lang)}</div>
            <div className="pc-stat-k">{t.rpg}</div>
          </div>
          <div className="pc-stat">
            <div className="pc-stat-v">{fmtN(p.apg, lang)}</div>
            <div className="pc-stat-k">{t.apg}</div>
          </div>
        </div>

        {/* Set line */}
        <div className="pc-setline">{setLine}</div>
      </div>
    </div>
  );
}
