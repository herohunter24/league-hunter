import { useRef, useEffect, useCallback } from 'react';
import { TIERS } from '../lib/tiers.js';
import { TeamBadge } from './TeamBadge.jsx';
import { SafeImage, PlayerSilhouette } from './SafeImage.jsx';

const fmtN = (n, lg) => (+(n || 0)).toLocaleString(lg === 'fr' ? 'fr-CA' : 'en-CA', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const HOLO_TIERS = new Set(['platinum', 'diamond', 'champion', 'legend']);

function useHolo(tierKey) {
  const ref = useRef(null);
  const rafId = useRef(null);
  const reduce = useRef(false);

  const apply = useCallback((x, y) => {
    const el = ref.current;
    if (!el || reduce.current) return;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const rx = (y - 0.5) * 22;
      const ry = (x - 0.5) * -22;
      el.style.setProperty('--holo-x', `${x * 100}%`);
      el.style.setProperty('--holo-y', `${y * 100}%`);
      el.style.setProperty('--rx', `${rx}deg`);
      el.style.setProperty('--ry', `${ry}deg`);
      el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
  }, []);

  const reset = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      el.style.setProperty('--holo-x', '50%');
      el.style.setProperty('--holo-y', '50%');
      el.style.transform = '';
    });
  }, []);

  useEffect(() => {
    if (!HOLO_TIERS.has(tierKey)) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduce.current = mq.matches;
    const onMq = e => { reduce.current = e.matches; };
    mq.addEventListener('change', onMq);

    const el = ref.current;
    if (!el) return;

    const onMove = e => {
      const rect = el.getBoundingClientRect();
      apply((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
    };
    const onLeave = () => reset();

    const onTilt = e => {
      if (!e.beta || !e.gamma) return;
      apply((e.gamma + 45) / 90, (e.beta + 45) / 90);
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    window.addEventListener('deviceorientation', onTilt, { passive: true });

    // Auto shimmer when no interaction
    let shimDir = 1, shimPos = 0;
    let shimTimer = null;
    const startShimmer = () => {
      if (reduce.current) return;
      shimTimer = setInterval(() => {
        shimPos = (shimPos + 0.004 * shimDir + 1) % 1;
        if (shimPos > 0.85) shimDir = -1;
        if (shimPos < 0.15) shimDir = 1;
        if (rafId.current) return; // active interaction
        const innerEl = el.querySelector('.pc-holo');
        if (innerEl) innerEl.style.setProperty('--holo-x', `${shimPos * 100}%`);
      }, 80);
    };
    startShimmer();

    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('deviceorientation', onTilt);
      mq.removeEventListener('change', onMq);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (shimTimer) clearInterval(shimTimer);
    };
  }, [tierKey, apply, reset]);

  return ref;
}

export function PlayerCard({ p, lang, t, onShare, onOpen, teams }) {
  const tier = TIERS[p.tier];
  const team = (teams || []).find(tm => tm.name === p.team);
  const holoRef = useHolo(p.tier);

  const cardEl = HOLO_TIERS.has(p.tier) ? holoRef : undefined;

  return (
    <div
      className={`pcard ${tier.cls}`}
      id={`pcard-${p.id}`}
      ref={cardEl}
      onClick={onOpen ? () => onOpen(p) : undefined}
    >
      {/* Jersey number watermark */}
      {p.number && <div className="pc-jersey-bg">{p.number}</div>}

      <div className="pcard-inner">
        {/* Holographic overlay (platinum/diamond/champion/legend) */}
        {HOLO_TIERS.has(p.tier) && <div className="pc-holo" aria-hidden="true" />}

        {/* Top bar */}
        <div className="pc-top">
          <div className="pc-league-badge">
            <span className="pc-league-text">NLS</span>
            <span className="pc-season-text">2026</span>
          </div>
          <div className="pc-tier-block">
            <div className="pc-tier">{tier.label}</div>
            <div className="pc-arch">{(p.arch[lang] || '').toUpperCase()}</div>
          </div>
          {onShare && (
            <button className="pc-share" title={t.download} onClick={e => { e.stopPropagation(); onShare(p); }}>
              ⤓
            </button>
          )}
        </div>

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

        {/* Bottom info */}
        <div className="pc-bottom">
          <div className="pc-name">{p.number ? <span className="pc-num">#{p.number}</span> : null}{p.name}</div>
          <div className="pc-meta">
            <TeamBadge team={team} size={14} />
            <span>{p.team}{p.pos ? ` · ${p.pos}` : ''}</span>
          </div>
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
        <div className="pc-setline">NLS · 2026</div>
      </div>
    </div>
  );
}
