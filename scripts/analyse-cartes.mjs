// Lecture seule (API REST publique Firestore) — aucune écriture.
import { buildLiveViewData } from '../src/lib/data.js';
const LID='1781288565754', BASE=`https://firestore.googleapis.com/v1/projects/league-hunter/databases/(default)/documents/leagues/${LID}`;
const val=v=>{if(!v)return null;const k=Object.keys(v)[0],x=v[k];
 if(k==='mapValue')return Object.fromEntries(Object.entries(x.fields||{}).map(([a,b])=>[a,val(b)]));
 if(k==='arrayValue')return (x.values||[]).map(val); if(k==='integerValue')return +x; if(k==='doubleValue')return x; if(k==='nullValue')return null; return x;};
const doc=d=>({id:d.name.split('/').pop(),...val({mapValue:d})});
async function list(path){let out=[],tok='';do{const r=await (await fetch(`${BASE}${path}?pageSize=300${tok?'&pageToken='+tok:''}`)).json();(r.documents||[]).forEach(d=>out.push(doc(d)));tok=r.nextPageToken||'';}while(tok);return out;}
const meta=val({mapValue:(await (await fetch(BASE)).json())});
const teams=await list('/teams'), players=await list('/players'), games=await list('/games');
for(const g of games){const ps=await list(`/games/${g.id}/playerStats`);g.playerStats=Object.fromEntries(ps.map(p=>{const{id,...r}=p;return[id,r];}));}
const v=buildLiveViewData(meta,teams,players,games);
const catName=Object.fromEntries((meta.categories||[]).map(c=>[String(c.id),c.displayName||c.name]));
const teamCat=Object.fromEntries(teams.map(t=>[t.name,String(t.categoryId??'')]));
// moyenne par match brute (sans bonus de série) pour chaque joueur
const raw=p=>{const gs=v.games.filter(g=>g.playerStats[p.id]!==undefined);if(!gs.length)return null;
 const s=gs.map(g=>{const x=g.playerStats[p.id]||{};return Math.max(0,(+x.points||0)+(+x.rebounds||0)*.7+(+x.assists||0)*1.2+(+x.steals||0)*1.5+(+x.blocks||0)*1.5-(+x.turnovers||0));});
 return {gp:gs.length,avg:s.reduce((a,b)=>a+b,0)/s.length,zeroGames:s.filter(x=>x===0).length,ppg:gs.reduce((a,g)=>a+(+(g.playerStats[p.id]||{}).points||0),0)/gs.length};};
const rows=v.players.map(p=>({...p,cat:p.categoryId||teamCat[p.team]||'',r:raw(p)}));
const byTier={};rows.forEach(p=>byTier[p.tier]=(byTier[p.tier]||0)+1);
const gpDist={};rows.forEach(p=>{const k=p.r?p.r.gp:0;gpDist[k]=(gpDist[k]||0)+1;});
const avgs=rows.filter(p=>p.r).map(p=>p.r.avg).sort((a,b)=>a-b);
const q=f=>avgs.length?avgs[Math.min(avgs.length-1,Math.floor(f*avgs.length))].toFixed(1):'-';
const cats={};rows.forEach(p=>{const c=catName[p.cat]||p.cat||'?';cats[c]=cats[c]||{players:0,withGames:0,ge3:0,tiers:{}};cats[c].players++;if(p.r){cats[c].withGames++;if(p.r.gp>=3)cats[c].ge3++;}cats[c].tiers[p.tier]=(cats[c].tiers[p.tier]||0)+1;});
console.log(JSON.stringify({players:rows.length,gamesTotal:games.length,gamesWithStats:games.filter(g=>Object.keys(g.playerStats).length).length,
 byTier,gpDist,avgQuantiles:{p10:q(.1),p25:q(.25),p50:q(.5),p75:q(.75),p90:q(.9),p95:q(.95),max:avgs.length?avgs[avgs.length-1].toFixed(1):'-'},
 playersWithAllZeroGames:rows.filter(p=>p.r&&p.r.zeroGames===p.r.gp).length,
 cats,top15:rows.filter(p=>p.r).sort((a,b)=>b.r.avg-a.r.avg).slice(0,15).map(p=>({n:p.name,cat:catName[p.cat]||'',gp:p.r.gp,avg:+p.r.avg.toFixed(1),ppg:+p.r.ppg.toFixed(1),tier:p.tier}))},null,1));
