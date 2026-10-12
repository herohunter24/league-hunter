import { useState, useRef, useEffect, useCallback } from 'react';
import { TIERS } from '../lib/tiers.js';
import { SafeImage, PlayerSilhouette, isLegacyOrange } from './SafeImage.jsx';
import { formatHeight, formatWeight } from '../lib/data.js';
import lhMark from '../assets/league-hunter-mark-white.svg';

const fmtN = (n, lg) => (+(n || 0)).toLocaleString(lg === 'fr' ? 'fr-CA' : 'en-CA', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Inline badge — always renders as initials circle with inline styles (survives html2canvas)
const LEGACY_RE = /^#?(ff6b1a|ff8d4d|e84e00)$/i;
function CardBadge({ team, size = 11 }) {
  const bg = team?.color && !LEGACY_RE.test(team.color) ? team.color : '#C9A24A';
  const initials = team ? (team.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: bg, color: '#000', fontWeight: 800, fontSize: Math.round(size * 0.45),
      lineHeight: `${size}px`, textAlign: 'center', flexShrink: 0,
      userSelect: 'none', verticalAlign: 'middle',
    }}>{initials}</span>
  );
}

const HOLO_OP = { bronze: 0, silver: 0.28, gold: 0.52, emerald: 0.55, sapphire: 0.58, ruby: 0.58, amethyst: 0.68, diamond: 1, legend: 1 };

/* Tiers that get 3D tilt (±8°). Bronze/silver/gold stay flat per spec. */
const TILT_TIERS = new Set(['emerald','sapphire','ruby','amethyst','champion','diamond','legend','platinum']);

let orientationPermission = 'unknown';

function useHolo(tierId) {
  const ref = useRef(null);
  const rafId = useRef(null);
  const reduce = useRef(false);
  const hovered = useRef(false);
  const tiltCleanup = useRef(null);
  const hasTilt = TILT_TIERS.has(tierId);

  const apply = useCallback((x, y) => {
    const el = ref.current;
    if (!el || reduce.current) return;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      el.style.setProperty('--holo-x', `${x * 100}%`);
      el.style.setProperty('--holo-y', `${y * 100}%`);
      if (hasTilt) {
        const rx = (y - 0.5) * 16;  /* ±8° */
        const ry = (x - 0.5) * -16;
        el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-10px) scale(1.02)`;
      }
    });
  }, [hasTilt]);

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

    const onTilt = e => {
      if (!e.beta || !e.gamma || hovered.current) return;
      apply(Math.max(0, Math.min(1, (e.gamma + 45) / 90)), Math.max(0, Math.min(1, (e.beta + 45) / 90)));
    };
    const setupTilt = () => {
      window.addEventListener('deviceorientation', onTilt, { passive: true });
      tiltCleanup.current = () => window.removeEventListener('deviceorientation', onTilt);
    };

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
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
      setupTilt();
    }

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

/* Season display: number < 100 → "02", otherwise show as-is */
function formatSeason(season) {
  if (!season) return String(new Date().getFullYear());
  const n = Number(season);
  if (!isNaN(n) && n > 0 && n < 100) return String(n).padStart(2, '0');
  return String(season);
}

// Steps: 0=card-logo.png, 1=card-logo.svg, 2=league logo from meta, 3=text
function cardLogoSrc(leagueId, leagueLogoUrl, step) {
  if (leagueId && step === 0) return `/leagues/${leagueId}/card-logo.png`;
  if (leagueId && step === 1) return `/leagues/${leagueId}/card-logo.svg`;
  if (step <= 2 && leagueLogoUrl) return leagueLogoUrl;
  return null;
}

export function PlayerCard({ p, lang, t, onOpen, teams, units, isDemo, leagueId, leagueLogoUrl = '', leagueName = '', season }) {
  const tier = TIERS[p.tier];
  const team = (teams || []).find(tm => tm.name === p.team);
  const teamColor = (team && team.color && !isLegacyOrange(team.color)) ? team.color : 'var(--gold)';
  const holoRef = useHolo(p.tier);
  const [logoStep, setLogoStep] = useState(0);

  const logoSrc = cardLogoSrc(leagueId, leagueLogoUrl, logoStep);
  const showLogoText = !logoSrc;

  const hw = [formatHeight(p.height, units), formatWeight(p.weight, units)].filter(Boolean).join(' · ');
  const seasonLabel = formatSeason(season);
  const footerLine1 = leagueName
    ? `${leagueName} · ${lang === 'fr' ? 'Saison' : 'Season'} ${seasonLabel}`
    : '';

  return (
    <div
      className={`pcard ${tier.cls}`}
      id={`pcard-${p.id}`}
      ref={holoRef}
      style={{ '--holo-op': HOLO_OP[p.tier] ?? 0.5, cursor: onOpen ? 'pointer' : 'default' }}
      onClick={onOpen ? () => onOpen(p) : undefined}
    >
      <div className="pcard-inner">
        {/* Holographic glare — full card, masked lighter over photo zone */}
        <div className="pc-holo" aria-hidden="true" />
        {isDemo && <div className="pc-exemple-pill" aria-hidden="true">EXEMPLE</div>}

        {/* ── PHOTO ZONE — clean, photo only ── */}
        <div className="pc-photo-zone">
          <div className="pc-photo">
            <SafeImage
              src={p.photoUrl}
              alt={p.name}
              loading="lazy"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
              fallback={<PlayerSilhouette />}
            />
          </div>

          {/* Card logo — outside filter context so mix-blend-mode works against card bg */}
          <div className="pc-logo-wrap">
            {(!showLogoText && logoSrc)
              ? <img
                  key={logoStep}
                  src={logoSrc}
                  alt={leagueName || ''}
                  className="pc-logo-img"
                  crossOrigin="anonymous"
                  onError={() => setLogoStep(s => s + 1)}
                />
              : leagueName
                ? <span className="pc-league-text">{leagueName}</span>
                : null
            }
          </div>

          {/* Top bar — tier + archetype right; filter for text readability */}
          <div className="pc-top">
            <div className="pc-tier-block">
              <div className="pc-tier">{lang === 'fr' ? tier.labelFr : tier.label}</div>
              <div className="pc-arch">{(p.arch[lang] || '').toUpperCase()}</div>
            </div>
          </div>

          {/* Jersey number — outlined, bottom-left corner, partly cropped */}
          {p.number && (
            <div className="pc-jersey-corner" aria-hidden="true">{p.number}</div>
          )}
        </div>

        {/* ── INFO BAND — bottom 38% ── */}
        <div className="pc-info-band">
          <div className="pc-accent-line" style={{ background: teamColor }} />
          <div className="pc-bottom">
            <div className="pc-name">
              {p.number ? <span className="pc-num">#{p.number}</span> : null}{p.name}
            </div>
            <div className="pc-meta">
              <CardBadge team={team} size={11} />
              <span>{p.team}{p.pos ? ` · ${p.pos}` : ''}</span>
            </div>
            {hw && <div className="pc-meta" style={{ marginTop: 1 }}>{hw}</div>}
          </div>
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
          <div className="pc-footer">
            <div className="pc-footer-league">{footerLine1}</div>
            <div className="pc-footer-brand">
              <span>Powered by</span>
              <img src={lhMark} className="pc-lh-mark" alt="" aria-hidden="true" />
              <span>League Hunter</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
