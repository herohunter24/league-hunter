import { useState } from 'react';

export function SafeImage({ src, alt, fallback, ...imgProps }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return fallback ?? null;
  return <img src={src} alt={alt} onError={() => setFailed(true)} {...imgProps} />;
}

export function PlayerSilhouette() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '52%', height: '52%', opacity: 0.35, flexShrink: 0 }}>
      <circle cx="12" cy="8" r="4.5" fill="#8888a2" />
      <path d="M3 22c0-5 4-9 9-9s9 4 9 9" fill="#8888a2" />
    </svg>
  );
}

export function TeamInitials({ name, color, size }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%',
      background: color || '#ff6b1a', color: '#fff',
      fontWeight: 800, fontSize: Math.round(size * 0.38),
      flexShrink: 0, lineHeight: 1, userSelect: 'none',
    }}>
      {initials}
    </span>
  );
}
