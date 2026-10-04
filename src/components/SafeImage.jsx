import { useState } from 'react';

export function SafeImage({ src, alt, fallback, ...imgProps }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return fallback ?? null;
  return <img src={src} alt={alt} onError={() => setFailed(true)} {...imgProps} />;
}

// img src instead of inline SVG so html2canvas renders it correctly in PNG exports
const SILHOUETTE_SRC = `data:image/svg+xml,${encodeURIComponent('<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4.5" fill="#8888a2"/><path d="M3 22c0-5 4-9 9-9s9 4 9 9" fill="#8888a2"/></svg>')}`;

export function PlayerSilhouette() {
  return (
    <img
      src={SILHOUETTE_SRC}
      alt=""
      aria-hidden="true"
      style={{ width: '54%', height: '54%', opacity: 0.55, flexShrink: 0, objectFit: 'contain' }}
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
