import { TIERS } from '../lib/tiers.js';
import { formatHeight, formatWeight } from '../lib/data.js';
import { TeamBadge } from './TeamBadge.jsx';
import { SafeImage, PlayerSilhouette } from './SafeImage.jsx';

const fmtN = (n, lg) => (+(n || 0)).toLocaleString(lg === 'fr' ? 'fr-CA' : 'en-CA', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function PlayerCard({ p, lang, t, onShare, onOpen, teams, units }) {
  const tier = TIERS[p.tier];
  const team = (teams || []).find(tm => tm.name === p.team);
  const initials = p.name.split(' ').map(w => w[0]).join('');
  const fh = formatHeight(p.height, units);
  const fw = formatWeight(p.weight, units);
  return (
    <div className={`pcard ${tier.cls}`} id={`pcard-${p.id}`} onClick={onOpen ? () => onOpen(p) : undefined}>
      <div className="pcard-inner">
        <div className="pc-top">
          <span className="pc-league">NLS</span>
          <div className="pc-tier-block">
            <div className="pc-tier">{tier.label}</div>
            <div className="pc-arch">{(p.arch[lang] || '').charAt(0).toUpperCase() + (p.arch[lang] || '').slice(1).toLowerCase()}</div>
          </div>
        </div>
        <div className="pc-photo">
          <SafeImage
            src={p.photoUrl}
            alt={p.name}
            loading="lazy"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            fallback={<PlayerSilhouette />}
          />
        </div>
        <div className="pc-bottom">
          <div className="pc-name">{p.number ? `#${p.number} ` : ''}{p.name}</div>
          <div className="pc-meta" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <TeamBadge team={team} size={16} />
            <span>{p.team}{p.pos ? ` · ${p.pos}` : ''}</span>
          </div>
          {(fh || fw) && <div className="pc-meta" style={{ marginTop: 2, opacity: 0.55 }}>{fh}{fh && fw ? ' • ' : ''}{fw}</div>}
        </div>
        <div className="pc-stats">
          <div className="pc-stat"><div className="pc-stat-v">{fmtN(p.ppg, lang)}</div><div className="pc-stat-k">{t.ppg}</div></div>
          <div className="pc-stat"><div className="pc-stat-v">{fmtN(p.rpg, lang)}</div><div className="pc-stat-k">{t.rpg}</div></div>
          <div className="pc-stat"><div className="pc-stat-v">{fmtN(p.apg, lang)}</div><div className="pc-stat-k">{t.apg}</div></div>
        </div>
      </div>
      {onShare && <button className="pc-share" title={t.download} onClick={e => { e.stopPropagation(); onShare(p); }}>⤓</button>}
    </div>
  );
}
