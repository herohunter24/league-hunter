import { SafeImage, TeamInitials } from './SafeImage.jsx';

export function TeamBadge({ team, size = 24 }) {
  if (!team) return <span style={{ fontSize: Math.round(size * 0.72), lineHeight: 1 }}>🏀</span>;
  return (
    <span className="team-logo-small" style={{ width: size, height: size }}>
      <SafeImage
        src={team.logoUrl}
        alt={team.name || ''}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        fallback={<TeamInitials name={team.name} color={team.color} size={size} />}
      />
    </span>
  );
}
