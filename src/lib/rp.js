import { RANK_TIERS, TIER_TO_NLS, TIERS, NLS_TIER_ICON } from './tiers.js';

export function getTierId(rp) {
  let tier = RANK_TIERS[0];
  for (const t of RANK_TIERS) { if (rp >= t.minRP) tier = t; }
  return tier.id;
}

export function getPlayerProgression(rp) {
  rp = rp || 0;
  let idx = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) { if (rp >= RANK_TIERS[i].minRP) idx = i; }
  const cur = RANK_TIERS[idx];
  const next = RANK_TIERS[idx + 1] || null;
  const curNls = TIER_TO_NLS[cur.id] || 'bronze';
  if (!next) return { rp, curNls, curLabel: TIERS[curNls].label, curIcon: NLS_TIER_ICON[curNls], nextNls: null, rpNeeded: 0, pct: 100, isMax: true };
  const nextNls = TIER_TO_NLS[next.id] || 'legend';
  const span = next.minRP - cur.minRP;
  const into = rp - cur.minRP;
  const pct = span > 0 ? Math.max(0, Math.min(100, Math.round((into / span) * 100))) : 0;
  return {
    rp, curNls, curLabel: TIERS[curNls].label, curIcon: NLS_TIER_ICON[curNls],
    nextNls, nextLabel: TIERS[nextNls].label, nextIcon: NLS_TIER_ICON[nextNls],
    rpNeeded: Math.max(0, next.minRP - rp), pct, isMax: false,
  };
}

export function calcPlayerRP(player, allGames, league) {
  const season  = (league && league.season) || {};
  const resetAt = season.resetAt || 0;
  const pid     = String(player.id);
  const milData = ((league && league.playerMilestones) || {})[pid] || {};
  const achieved = new Set(milData.milestones || []);
  const games = [...(allGames || [])]
    .filter(g => {
      if (!g.playerStats || g.playerStats[pid] === undefined) return false;
      if (resetAt) { const gt = new Date((g.date||'9999')+'T00:00').getTime(); if (gt < resetAt) return false; }
      return true;
    })
    .sort((a,b) => (a.date||'').localeCompare(b.date||''));
  if (!games.length) return 0;
  const baseScores = games.map(g => {
    const ps = g.playerStats[pid] || {};
    return Math.max(0,
      (+(ps.points||0))*1.0 + (+(ps.rebounds||0))*0.7 + (+(ps.assists||0))*1.2 +
      (+(ps.steals||0))*1.5 + (+(ps.blocks||0))*1.5 - (+(ps.turnovers||0))*1.0);
  });
  const avg = baseScores.reduce((s,x)=>s+x,0) / baseScores.length;
  let aStr = 0, bStr = 0;
  const adjusted = baseScores.map(s => {
    if (s >= avg) { aStr++; bStr = 0; } else { bStr++; aStr = 0; }
    let m = 1;
    if (s >= avg) {
      if (aStr>=7) m=1.70; else if (aStr>=6) m=1.50; else if (aStr>=5) m=1.35;
      else if (aStr>=4) m=1.25; else if (aStr>=3) m=1.15; else if (aStr>=2) m=1.08;
    } else if (bStr >= 3) m = 0.95;
    return s * m;
  });
  let total = adjusted.reduce((s,x)=>s+x,0);
  let milRP = 0;
  const gp = games.length;
  if (gp>=1  && !achieved.has('games_1'))  milRP+=5;
  if (gp>=5  && !achieved.has('games_5'))  milRP+=15;
  if (gp>=10 && !achieved.has('games_10')) milRP+=30;
  if (gp>=15 && !achieved.has('games_15')) milRP+=60;
  if (gp>=20 && !achieved.has('games_20')) milRP+=120;
  let h15=achieved.has('pts_15'),h20=achieved.has('pts_20'),h30=achieved.has('pts_30'),h40=achieved.has('pts_40');
  let hDD=achieved.has('double_double'),hTD=achieved.has('triple_double'),hQD=achieved.has('quad_double');
  let hW3=achieved.has('ws_3'),hW5=achieved.has('ws_5'),hW8=achieved.has('ws_8'),hW10=achieved.has('ws_10');
  let wStr = 0;
  games.forEach(g => {
    const ps = g.playerStats[pid]||{}; const pts=+(ps.points||0),reb=+(ps.rebounds||0),ast=+(ps.assists||0),stl=+(ps.steals||0),blk=+(ps.blocks||0);
    if (!h15&&pts>=15){milRP+=15;h15=true;} if (!h20&&pts>=20){milRP+=35;h20=true;}
    if (!h30&&pts>=30){milRP+=80;h30=true;} if (!h40&&pts>=40){milRP+=200;h40=true;}
    const t10=[pts,reb,ast,stl,blk].filter(v=>v>=10).length;
    if (!hDD&&t10>=2){milRP+=40;hDD=true;} if (!hTD&&t10>=3){milRP+=120;hTD=true;} if (!hQD&&t10>=4){milRP+=500;hQD=true;}
    const hs=parseInt(g.homeScore),as2=parseInt(g.awayScore);
    const won=!isNaN(hs)&&!isNaN(as2)&&((g.home===player.team&&hs>as2)||(g.away===player.team&&as2>hs));
    if (won) wStr++; else wStr=0;
    if (!hW3&&wStr>=3){milRP+=20;hW3=true;} if (!hW5&&wStr>=5){milRP+=45;hW5=true;}
    if (!hW8&&wStr>=8){milRP+=100;hW8=true;} if (!hW10&&wStr>=10){milRP+=250;hW10=true;}
  });
  const adjTotal = (milData.rpAdjustments||[]).reduce((s,a)=>s+(+(a.amount||0)),0);
  return Math.max(0, Math.round(total + milRP + adjTotal));
}
