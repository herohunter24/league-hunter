// NLS-only decorative row of league photos (2/3 panels), used behind the category view and picker.
export function LeagueAmbient({ photos, className }) {
  return (
    <div className={'lg-amb ' + (className || '')} aria-hidden="true">
      <div className="lg-amb-row">
        {photos.map(p => (
          <div className="lg-amb-p" key={p.src}>
            <img src={p.src} width={p.w} height={p.h} alt="" loading="lazy" decoding="async" style={{ objectPosition: p.pos }} />
          </div>
        ))}
      </div>
    </div>
  );
}
