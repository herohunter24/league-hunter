export function TeamBadge({ team, size = 24 }) {
  if (team && team.logoUrl) {
    return (
      <span className="team-logo-small" style={{ width: size, height: size }}>
        <img src={team.logoUrl} alt={team.name || ''} loading="lazy" />
      </span>
    );
  }
  return <span style={{ fontSize: Math.round(size * 0.72), lineHeight: 1 }}>{(team && team.emoji) || '🏀'}</span>;
}
