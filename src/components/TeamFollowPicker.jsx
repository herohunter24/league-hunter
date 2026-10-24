import { useState } from 'react';

// Step-by-step team picker for alerts: genre → division → catégorie → équipe.
// categories: [{ id, name, gender: 'm'|'f'|null, division: 'gold'|'diamond', age }]
// teams:      [{ id, name, categoryId }]
// onAdd({ categoryId, team }) is called when a team is chosen.
export function TeamFollowPicker({ categories, teams, follows, lang, t, onAdd, onCancel }) {
  const [gender, setGender] = useState(null);
  const [division, setDivision] = useState(null);
  const [catId, setCatId] = useState(null);

  const fr = lang === 'fr';
  const genderCats = categories.filter(c => c.gender === gender);
  const divisions = ['gold', 'diamond'].filter(d => genderCats.some(c => c.division === d));
  // Auto-select the division when the genre has only one
  const effDivision = division || (divisions.length === 1 ? divisions[0] : null);
  const ageCats = genderCats.filter(c => c.division === effDivision)
    .sort((a, b) => (a.ageNum ?? Infinity) - (b.ageNum ?? Infinity));
  const catTeams = teams
    .filter(tm => String(tm.categoryId) === String(catId))
    .sort((a, b) => a.name.localeCompare(b.name));
  const isFollowed = name => follows.some(f => f.categoryId === String(catId) && f.team === name);

  function reset() { setGender(null); setDivision(null); setCatId(null); }

  const step = (label, items, selected, onPick) => (
    <div className="alerts-field">
      <div className="alerts-label">{label}</div>
      <div className="alerts-chips">
        {items.map(([key, text, disabled]) => (
          <button key={key} type="button" disabled={disabled}
            className={`alerts-chip${selected === key ? ' selected' : ''}`}
            onClick={() => onPick(key)}>{text}</button>
        ))}
      </div>
    </div>
  );

  if (categories.length === 0) {
    return (
      <div className="alerts-picker">
        <div className="alerts-hint">{fr ? "Aucune catégorie disponible pour l'instant." : 'No categories available yet.'}</div>
        {onCancel && (
          <button type="button" className="alerts-link-btn" onClick={() => { reset(); onCancel(); }}>
            {fr ? 'Annuler' : 'Cancel'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="alerts-picker">
      {step(fr ? '1. Genre' : '1. Gender',
        ['m', 'f'].map(g => [g, g === 'm' ? t.pickerMale : t.pickerFemale, !categories.some(c => c.gender === g)]),
        gender, g => { setGender(g); setDivision(null); setCatId(null); })}

      {gender && step(fr ? '2. Division' : '2. Division',
        ['gold', 'diamond'].map(d => [d, d === 'gold' ? t.divGold : t.divDiamond, !divisions.includes(d)]),
        effDivision, d => { setDivision(d); setCatId(null); })}

      {gender && effDivision && step(fr ? '3. Catégorie' : '3. Category',
        ageCats.map(c => [c.id, c.age || c.name, !teams.some(tm => String(tm.categoryId) === String(c.id))]),
        catId, id => setCatId(id))}

      {catId && step(fr ? '4. Équipe' : '4. Team',
        catTeams.map(tm => [tm.name, tm.name + (isFollowed(tm.name) ? ' ✓' : ''), isFollowed(tm.name)]),
        null, name => { onAdd({ categoryId: String(catId), team: name }); reset(); })}

      {catId && catTeams.length === 0 && (
        <div className="alerts-hint">{fr ? 'Aucune équipe dans cette catégorie.' : 'No teams in this category.'}</div>
      )}

      {onCancel && (
        <button type="button" className="alerts-link-btn" onClick={() => { reset(); onCancel(); }}>
          {fr ? 'Annuler' : 'Cancel'}
        </button>
      )}
    </div>
  );
}

// List of followed teams with a remove button.
export function FollowList({ follows, categories, lang, onRemove }) {
  const catName = id => (categories.find(c => String(c.id) === String(id)) || {}).name || '';
  if (!follows.length) return null;
  return (
    <ul className="alerts-follow-list">
      {follows.map(f => (
        <li key={f.categoryId + '|' + f.team} className="alerts-follow-item">
          <span>
            <strong>{f.team}</strong>
            <span className="alerts-follow-cat"> · {catName(f.categoryId)}</span>
          </span>
          <button type="button" className="alerts-follow-del"
            aria-label={lang === 'fr' ? 'Retirer' : 'Remove'}
            onClick={() => onRemove(f)}>✕</button>
        </li>
      ))}
    </ul>
  );
}
