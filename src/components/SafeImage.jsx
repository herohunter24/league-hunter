import { useState, useEffect } from 'react';

// Show fallback while photo loads; swap to photo only on successful onLoad.
// This ensures the silhouette is visible immediately — never a blank photo zone.
export function SafeImage({ src, alt, fallback, ...imgProps }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'loaded' | 'failed'
  useEffect(() => { setStatus('loading'); }, [src]);

  if (!src || status === 'failed') return fallback ?? null;

  return (
    <>
      {status !== 'loaded' && (fallback ?? null)}
      <img
        src={src}
        alt={alt}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('failed')}
        {...imgProps}
        style={{ ...imgProps.style, display: status === 'loaded' ? undefined : 'none' }}
      />
    </>
  );
}

// Canvas-drawn PNG — html2canvas renders it correctly (SVG data URIs are not rendered by html2canvas)
let _silhouettePng = null;
export function getSilhouettePng() {
  if (_silhouettePng) return _silhouettePng;
  try {
    const c = document.createElement('canvas');
    c.width = 120; c.height = 120;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#8888a2';
    ctx.beginPath(); ctx.arc(60, 38, 20, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, 110);
    ctx.quadraticCurveTo(10, 64, 60, 64);
    ctx.quadraticCurveTo(110, 64, 110, 110);
    ctx.closePath(); ctx.fill();
    _silhouettePng = c.toDataURL('image/png');
  } catch {
    _silhouettePng = `data:image/svg+xml,${encodeURIComponent('<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4.5" fill="#8888a2"/><path d="M3 22c0-5 4-9 9-9s9 4 9 9" fill="#8888a2"/></svg>')}`;
  }
  return _silhouettePng;
}

export function PlayerSilhouette() {
  return (
    <img
      src={getSilhouettePng()}
      alt=""
      aria-hidden="true"
      style={{ width: '60%', height: '60%', opacity: 0.7, flexShrink: 0, objectFit: 'contain' }}
    />
  );
}

const LEGACY_ORANGE = /^#?(ff6b1a|ff8d4d|e84e00)$/i;
export const isLegacyOrange = color => !color || LEGACY_ORANGE.test(color);

export function TeamInitials({ name, color, size }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const bg = (!color || LEGACY_ORANGE.test(color)) ? '#C9A24A' : color;
  return (
    <span style={{
      display: 'inline-block', textAlign: 'center',
      width: size, height: size, borderRadius: '50%',
      background: bg, color: '#000',
      fontWeight: 800, fontSize: Math.round(size * 0.38),
      lineHeight: `${size}px`, flexShrink: 0, userSelect: 'none',
    }}>
      {initials}
    </span>
  );
}
