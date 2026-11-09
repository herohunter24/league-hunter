// Rapport de dépistage : parle de tout le jeu (points, rebonds, passes, défense, tirs, régularité),
// pas seulement du scoring. Les phrases changent selon le profil du joueur.
export function scoutingReport(p, pGames, fgPct, lang) {
  const fr = lang === 'fr';
  const f = n => (+(n || 0)).toLocaleString(fr ? 'fr-CA' : 'en-CA', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const name = p.name;
  const ppg = p.ppg || 0, rpg = p.rpg || 0, apg = p.apg || 0, spg = p.spg || 0, bpg = p.bpg || 0, tpg = p.tpg || 0;
  const fg = fgPct != null && fgPct !== '' && !isNaN(parseFloat(fgPct)) ? parseFloat(fgPct) : null;
  const gp = p.gp || pGames.length;

  if (gp < 3) {
    return fr ? 'Pas encore assez de matchs.' : 'Not enough games yet.';
  }

  const small = gp < 5;
  const seed = String(p.id).split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const pick = (arr, salt) => arr[(seed + salt) % arr.length];
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

  // Apport total par match (même idée que le tier) — sert pour la tendance et la régularité
  const ps = g => g.playerStats[p.id] || {};
  const impact = pGames.map(g => {
    const s = ps(g);
    return (+(s.points || 0)) + (+(s.rebounds || 0)) + (+(s.assists || 0)) * 1.5 + ((+(s.steals || 0)) + (+(s.blocks || 0))) * 2;
  });
  const pts = pGames.map(g => +(ps(g).points || 0));
  const recent = impact.slice(0, 3), before = impact.slice(3, 8);
  const improving = impact.length >= 5 && avg(recent) > avg(before) * 1.2 + 1;
  const last5 = pts.slice(0, 5);
  const lo = last5.length ? Math.min(...last5) : 0, hi = last5.length ? Math.max(...last5) : 0;
  const ddCount = pGames.filter(g => { const s = ps(g); return [s.points, s.rebounds, s.assists, s.steals, s.blocks].filter(v => +(v || 0) >= 10).length >= 2; }).length;

  // Profil : chaque secteur comparé à un repère de la ligue
  const bench = { pts: 14, reb: 7, ast: 4, def: 2.5 };
  const lvl = { pts: ppg / bench.pts, reb: rpg / bench.reb, ast: apg / bench.ast, def: (spg + bpg) / bench.def };
  const order = Object.entries(lvl).sort((a, b) => b[1] - a[1]);
  const lead = order[0][0];
  const spread = order[0][1] - order[order.length - 1][1];
  // Aucun secteur au-dessus de la moitié du repère : rapport neutre (pas de « joueur complet » exagéré)
  const category = order[0][1] < 0.5 ? 'steady'
    : spread < 0.45 ? 'balanced'
    : lead === 'pts' ? 'scorer' : lead === 'reb' ? 'rebounder' : lead === 'ast' ? 'playmaker' : 'defender';

  const OPEN = fr ? {
    steady: [
      `${name} a joué ${gp} matchs cette saison : ${f(ppg)} point${ppg >= 2 ? 's' : ''}, ${f(rpg)} rebond${rpg >= 2 ? 's' : ''} et ${f(apg)} passe${apg >= 2 ? 's' : ''} par match.`,
    ],
    scorer: [
      `${name} est d'abord un marqueur : ${f(ppg)} points par match.`,
      `Ce qui saute aux yeux, c'est sa capacité à mettre le ballon dans le panier, ${f(ppg)} points par soir.`,
      `${name} est l'arme offensive de son équipe avec ${f(ppg)} points par match.`,
    ],
    rebounder: [
      `${name} gagne ses matchs dans la raquette : ${f(rpg)} rebonds par match.`,
      `Le point fort de ${name}, c'est le rebond, ${f(rpg)} prises par soir.`,
      `${name} est un travailleur près du panier, ${f(rpg)} rebonds de moyenne.`,
    ],
    playmaker: [
      `${name} fait jouer les autres : ${f(apg)} passes décisives par match.`,
      `Le ballon circule mieux quand ${name} est sur le terrain, ${f(apg)} passes par soir.`,
      `${name} a la vision d'un vrai meneur, ${f(apg)} passes de moyenne.`,
    ],
    defender: [
      `${name} fait sa marque en défense : ${f(spg)} interceptions et ${f(bpg)} contres par match.`,
      `Ce qui ressort chez ${name}, c'est son impact défensif, ${f(spg + bpg)} ballons volés ou bloqués par soir.`,
    ],
    balanced: [
      `${name} est un joueur complet : ${f(ppg)} points, ${f(rpg)} rebonds et ${f(apg)} passes par match.`,
      `Difficile de mettre ${name} dans une case, il contribue partout (${f(ppg)} pts, ${f(rpg)} rbds, ${f(apg)} passes).`,
    ],
  } : {
    steady: [
      `${name} has played ${gp} games this season: ${f(ppg)} points, ${f(rpg)} rebounds and ${f(apg)} assists per game.`,
    ],
    scorer: [
      `${name} is a scorer first: ${f(ppg)} points per game.`,
      `What jumps out is how he puts the ball in the basket, ${f(ppg)} points a night.`,
      `${name} is his team's main offensive weapon at ${f(ppg)} PPG.`,
    ],
    rebounder: [
      `${name} wins games in the paint: ${f(rpg)} rebounds per game.`,
      `${name}'s calling card is rebounding, ${f(rpg)} boards a night.`,
      `${name} does the dirty work around the rim, ${f(rpg)} RPG.`,
    ],
    playmaker: [
      `${name} makes everyone better: ${f(apg)} assists per game.`,
      `The ball moves better when ${name} is on the floor, ${f(apg)} assists a night.`,
      `${name} sees the floor like a real point guard, ${f(apg)} APG.`,
    ],
    defender: [
      `${name} makes his mark on defense: ${f(spg)} steals and ${f(bpg)} blocks per game.`,
      `What stands out with ${name} is the defensive impact, ${f(spg + bpg)} steals or blocks a night.`,
    ],
    balanced: [
      `${name} is a complete player: ${f(ppg)} points, ${f(rpg)} rebounds and ${f(apg)} assists per game.`,
      `Hard to put ${name} in one box, he contributes everywhere (${f(ppg)}/${f(rpg)}/${f(apg)}).`,
    ],
  };

  const S = [];
  S.push(pick(OPEN[category], 1));
  if (category === 'steady') {
    if (ddCount > 0) S.push(fr ? `Il compte ${ddCount} double-double${ddCount > 1 ? 's' : ''} cette saison.` : `He has ${ddCount} double-double${ddCount > 1 ? 's' : ''} this season.`);
    if (improving) S.push(fr ? `La tendance est bonne : son apport a nettement monté sur ses 3 derniers matchs.` : `The trend is good: his overall impact is clearly up over his last 3 games.`);
    S.push(fr ? `Un joueur qui continue de prendre de l'expérience.` : `A player who keeps gaining experience.`);
    return S.join(' ');
  }

  // Attaque : volume, efficacité, 3 points, régularité
  if (lead !== 'pts' || category === 'balanced') {
    S.push(fr
      ? (ppg >= 10 ? `Il reste une menace au pointage avec ${f(ppg)} points par match.` : ppg >= 5 ? `Au pointage, il ajoute ${f(ppg)} points par match.` : `Il ajoute ${f(ppg)} points par match, mais son impact se mesure surtout ailleurs.`)
      : (ppg >= 10 ? `He's still a scoring threat at ${f(ppg)} PPG.` : ppg >= 5 ? `He chips in ${f(ppg)} points per game.` : `He adds ${f(ppg)} PPG, but his impact shows up mostly elsewhere.`));
  }
  const shot = [];
  if (fg != null) shot.push(fr ? `${String(fg).replace('.', ',')} % au tir` : `${fg}% from the field`);
  if (tpg >= 0.5) shot.push(fr ? `${f(tpg)} panier${tpg >= 2 ? 's' : ''} de 3 par match` : `${f(tpg)} threes a game`);
  if (shot.length) S.push(fr ? `Côté tir : ${shot.join(' et ')}.` : `Shooting-wise: ${shot.join(' and ')}.`);
  if (last5.length >= 3 && ppg >= 5) {
    const tight = hi - lo <= Math.max(6, ppg * 0.6);
    S.push(fr
      ? (tight ? `Il est régulier : entre ${lo} et ${hi} points sur ses ${last5.length} derniers matchs.` : `Il peut prendre feu offensivement : jusqu'à ${hi} points sur ses ${last5.length} derniers matchs.`)
      : (tight ? `He's consistent: between ${lo} and ${hi} points over his last ${last5.length}.` : `He can get hot offensively: up to ${hi} points over his last ${last5.length}.`));
  }

  // Rebond
  if (lead !== 'reb' && rpg >= 1) {
    S.push(fr
      ? (rpg >= 7 ? `Au rebond, il est dominant avec ${f(rpg)} prises par match.` : rpg >= 4 ? `Il fait sa part au rebond (${f(rpg)} par match).` : `Il ajoute ${f(rpg)} rebond${rpg >= 2 ? 's' : ''} par match.`)
      : (rpg >= 7 ? `On the glass he's dominant at ${f(rpg)} RPG.` : rpg >= 4 ? `He does his part on the boards (${f(rpg)} RPG).` : `He adds ${f(rpg)} RPG.`));
  }

  // Passe
  if (lead !== 'ast' && apg >= 1) {
    S.push(fr
      ? (apg >= 4 ? `Il distribue aussi le jeu, ${f(apg)} passes décisives par match.` : apg >= 2 ? `Il trouve ses coéquipiers à l'occasion (${f(apg)} passes par match).` : `Il ajoute ${f(apg)} passe${apg >= 2 ? 's' : ''} décisive${apg >= 2 ? 's' : ''} par match.`)
      : (apg >= 4 ? `He also runs the offense, ${f(apg)} assists per game.` : apg >= 2 ? `He finds teammates now and then (${f(apg)} APG).` : `He adds ${f(apg)} APG.`));
  }

  // Défense
  if (lead !== 'def' && (spg + bpg) > 0) {
    S.push(fr
      ? ((spg + bpg) >= 2 ? `En défense, il dérange : ${f(spg)} interceptions et ${f(bpg)} contres par match.` : `Il contribue aussi en défense (${f(spg)} int., ${f(bpg)} contres par match).`)
      : ((spg + bpg) >= 2 ? `Defensively he's a problem: ${f(spg)} steals and ${f(bpg)} blocks per game.` : `He contributes on defense too (${f(spg)} STL, ${f(bpg)} BLK per game).`));
  }

  if (ddCount > 0) S.push(fr ? `Il compte déjà ${ddCount} double-double${ddCount > 1 ? 's' : ''} cette saison.` : `He already has ${ddCount} double-double${ddCount > 1 ? 's' : ''} this season.`);

  if (improving) S.push(fr ? `La tendance est bonne : son apport a nettement monté sur ses 3 derniers matchs.` : `The trend is good: his overall impact is clearly up over his last 3 games.`);

  // Conclusion : ton de recrutement, on met la force en avant
  const AREA = fr
    ? { pts: 'au pointage', reb: 'au rebond', ast: 'à la passe', def: 'en défense' }
    : { pts: 'scoring', reb: 'rebounding', ast: 'playmaking', def: 'defense' };
  if (category !== 'balanced') {
    S.push(fr
      ? `Un profil intéressant pour une équipe qui cherche de l'aide ${AREA[lead]}.`
      : `An interesting profile for any team looking for help in ${AREA[lead]}.`);
  }
  S.push(small
    ? (fr ? `Un joueur à suivre de près (${gp} matchs joués jusqu'ici).` : `A player worth following closely (${gp} games played so far).`)
    : pick(fr
      ? [`Une base solide sur laquelle un programme peut bâtir.`, `Un joueur qui mérite l'attention des recruteurs.`, `Les outils sont là pour continuer à progresser.`]
      : [`A solid foundation for any program to build on.`, `A player who deserves recruiters' attention.`, `The tools are there to keep growing.`], 3));

  return S.join(' ');
}
