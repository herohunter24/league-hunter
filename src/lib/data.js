import { TIER_TO_NLS, TIER_ORDER } from './tiers.js';
import { getTierId, calcPlayerRP } from './rp.js';

export function formatHeight(height, units) {
  if (!height && height !== 0) return '';
  if (units === 'metric') return `${height} cm`;
  const ft = Math.floor(height / 12);
  const inches = height % 12;
  return `${ft}'${inches}"`;
}

export function formatWeight(weight, units) {
  if (!weight && weight !== 0) return '';
  return units === 'metric' ? `${weight} kg` : `${weight} lbs`;
}

export function deriveArchetype(tierNls, ppg, rpg, apg) {
  if (tierNls === 'legend')   return { fr: 'ICÔNE',     en: 'ICON' };
  if (tierNls === 'champion') return { fr: 'FINISSEUR', en: 'CLOSER' };
  const best = Math.max(ppg, rpg, apg);
  if (best === apg && apg > 0) return { fr: 'CRÉATEUR',  en: 'PLAYMAKER' };
  if (best === rpg && rpg > 0) return { fr: 'REBONDEUR', en: 'REBOUNDER' };
  if (ppg >= 18)               return { fr: 'SNIPER',    en: 'SNIPER' };
  if (ppg > 0)                 return { fr: 'MARQUEUR',  en: 'SCORER' };
  return { fr: 'BATAILLEUR', en: 'GRINDER' };
}

export function buildLiveViewData(meta, rawTeams, rawPlayers, rawGames) {
  const units = (meta && meta.units) || 'imperial';
  const leagueLike = { season: meta && meta.season, playerMilestones: meta && meta.playerMilestones };

  const games = (rawGames || []).map(g => {
    const hs = (g.homeScore !== undefined && g.homeScore !== null && g.homeScore !== '') ? +g.homeScore : null;
    const as = (g.awayScore !== undefined && g.awayScore !== null && g.awayScore !== '') ? +g.awayScore : null;
    return { id: g.id, date: g.date || '', time: g.time || '', home: g.home || '', away: g.away || '', venue: g.venue || '', categoryId: g.categoryId != null ? String(g.categoryId) : '', hs, as, playerStats: g.playerStats || {} };
  });

  const played = games.filter(g => g.hs !== null && g.as !== null).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const teams = (rawTeams || []).map((tm, i) => {
    const results = [];
    let pf = 0, pa = 0;
    played.forEach(g => {
      if (g.home === tm.name) { results.push(g.hs > g.as ? 1 : 0); pf += g.hs; pa += g.as; }
      else if (g.away === tm.name) { results.push(g.as > g.hs ? 1 : 0); pf += g.as; pa += g.hs; }
    });
    const w = results.filter(r => r).length;
    return { id: tm.id || i, name: tm.name || '', emoji: tm.emoji || '🏀', logoUrl: tm.logoUrl || '', color: tm.color || '#C9A24A', categoryId: tm.categoryId != null ? String(tm.categoryId) : '', w, l: results.length - w, pf, pa, last5: results.slice(-5) };
  });

  const players = (rawPlayers || []).map(p => {
    const pid = String(p.id);
    const pGames = games.filter(g => g.playerStats && g.playerStats[pid] !== undefined);
    const gp = pGames.length;
    const sum = k => pGames.reduce((s, g) => s + (+((g.playerStats[pid] || {})[k] || 0)), 0);
    const ppg = gp ? sum('points') / gp : 0;
    const rpg = gp ? sum('rebounds') / gp : 0;
    const apg = gp ? sum('assists') / gp : 0;
    const spg = gp ? sum('steals') / gp : 0;
    const bpg = gp ? sum('blocks') / gp : 0;
    const rp = calcPlayerRP({ ...p, id: pid }, games, leagueLike);
    const tierNls = TIER_TO_NLS[getTierId(rp)] || 'bronze';
    return {
      id: pid, name: p.name || '', team: p.team || '', pos: p.position || '',
      number: p.number || '', photoUrl: p.photoUrl || '',
      height: p.height, weight: p.weight, categoryId: p.categoryId != null ? String(p.categoryId) : '',
      tier: tierNls, arch: deriveArchetype(tierNls, ppg, rpg, apg),
      ppg, rpg, apg, spg, bpg, gp, rp,
    };
  });

  const rawCats = ((meta && meta.categories) || []).map(c => ({ id: String(c.id), name: c.displayName || c.name || 'Catégorie', ageLabel: c.name || '', gender: c.gender || null, division: c.division || null }));
  const catOrder = ((meta && meta.categoryOrder) || []).map(String);
  const categories = catOrder.length
    ? [...rawCats].sort((a, b) => { const ia = catOrder.indexOf(a.id), ib = catOrder.indexOf(b.id); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); })
    : rawCats;

  return { teams, players, games, units, categories, ps: (meta && meta.publicSettings) || {}, meta };
}
