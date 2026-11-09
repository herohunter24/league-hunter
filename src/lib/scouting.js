// Rapport de dépistage : ton de recrutement (on vend le joueur), parle de tout le jeu
// (points, rebonds, passes, défense), pas seulement du scoring.
// Règle : une stat sous 1,5 par match n'est jamais mentionnée. Pas de phrase négative.
// Plusieurs gabarits par phrase ; le choix dépend du joueur (stable d'une visite à l'autre).
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

  const MIN = 1.5; // sous ce seuil par match, on n'en parle pas
  const small = gp < 5;
  const seed = String(p.id).split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const pick = (arr, salt) => arr[(seed + salt) % arr.length];
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  const pl = (n, word) => `${f(n)} ${word}${n >= 2 ? 's' : ''}`; // accord fr : 1,5 rebond / 2,0 rebonds
  const def = spg + bpg;

  // Apport total par match (même idée que le tier) — sert pour la tendance
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

  // Défense : on ne nomme que ce qui dépasse le seuil
  const defTxt = () => {
    const parts = [];
    if (spg >= MIN) parts.push(fr ? pl(spg, 'interception') : `${f(spg)} steals`);
    if (bpg >= MIN) parts.push(fr ? pl(bpg, 'contre') : `${f(bpg)} blocks`);
    if (!parts.length) return fr ? `${f(def)} ballons volés ou bloqués` : `${f(def)} steals plus blocks`;
    return parts.join(fr ? ' et ' : ' and ');
  };

  // Profil : chaque secteur comparé à un repère de la ligue
  const bench = { pts: 14, reb: 7, ast: 4, def: 2.5 };
  const val = { pts: ppg, reb: rpg, ast: apg, def };
  const lvl = { pts: ppg / bench.pts, reb: rpg / bench.reb, ast: apg / bench.ast, def: def / bench.def };
  const order = Object.entries(lvl).sort((a, b) => b[1] - a[1]);
  const lead = order[0][0];
  const spread = order[0][1] - order[order.length - 1][1];
  const category = (order[0][1] < 0.5 || val[lead] < MIN) ? 'steady'
    : spread < 0.45 ? 'balanced'
    : lead === 'pts' ? 'scorer' : lead === 'reb' ? 'rebounder' : lead === 'ast' ? 'playmaker' : 'defender';

  // Stats à citer (≥ 1,5) pour les résumés
  const listed = [];
  if (ppg >= MIN) listed.push(fr ? pl(ppg, 'point') : `${f(ppg)} points`);
  if (rpg >= MIN) listed.push(fr ? pl(rpg, 'rebond') : `${f(rpg)} rebounds`);
  if (apg >= MIN) listed.push(fr ? pl(apg, 'passe') : `${f(apg)} assists`);
  if (def >= MIN) listed.push(defTxt());
  const joinList = arr => arr.length <= 1 ? (arr[0] || '') : arr.slice(0, -1).join(', ') + (fr ? ' et ' : ' and ') + arr[arr.length - 1];

  const S = [];

  // ── Joueur au profil discret : résumé neutre, rien d'exagéré ──────────────
  if (category === 'steady') {
    S.push(listed.length
      ? pick(fr ? [
          `${name} a joué ${gp} matchs cette saison, avec ${joinList(listed)} par match.`,
          `En ${gp} matchs, ${name} apporte ${joinList(listed)} par match.`,
          `${name} compte ${gp} matchs cette saison : ${joinList(listed)} par match.`,
        ] : [
          `${name} has played ${gp} games this season, with ${joinList(listed)} per game.`,
          `Over ${gp} games, ${name} brings ${joinList(listed)} per game.`,
          `${name} has ${gp} games this season: ${joinList(listed)} per game.`,
        ], 1)
      : pick(fr ? [
          `${name} a joué ${gp} matchs cette saison avec son équipe.`,
          `${name} fait partie de la rotation de son équipe, avec ${gp} matchs joués cette saison.`,
        ] : [
          `${name} has played ${gp} games this season with his team.`,
          `${name} is part of his team's rotation, with ${gp} games played this season.`,
        ], 1));
    if (ddCount > 0) S.push(fr ? `Il compte ${ddCount} double-double${ddCount > 1 ? 's' : ''} cette saison.` : `He has ${ddCount} double-double${ddCount > 1 ? 's' : ''} this season.`);
    if (improving) S.push(fr ? `La tendance est bonne : son apport a nettement monté sur ses 3 derniers matchs.` : `The trend is good: his overall impact is clearly up over his last 3 games.`);
    S.push(pick(fr ? [
      `Un joueur qui continue de prendre de l'expérience.`,
      `Il gagne en expérience match après match.`,
      `Un joueur d'équipe qui continue de se développer.`,
    ] : [
      `A player who keeps gaining experience.`,
      `He's gaining experience game after game.`,
      `A team player who keeps developing.`,
    ], 7));
    return S.join(' ');
  }

  // ── Phrase d'ouverture : la plus grande force ─────────────────────────────
  const OPEN = fr ? {
    scorer: [
      `${name} est d'abord un marqueur : ${f(ppg)} points par match.`,
      `Ce qui saute aux yeux chez ${name}, c'est sa capacité à mettre le ballon dans le panier, ${f(ppg)} points par soir.`,
      `${name} est l'arme offensive de son équipe avec ${f(ppg)} points par match.`,
      `Avec ${f(ppg)} points par match, ${name} est une option offensive fiable pour son équipe.`,
      `${name} sait trouver le chemin du panier : ${f(ppg)} points de moyenne.`,
    ],
    rebounder: [
      `${name} gagne ses matchs dans la raquette : ${f(rpg)} rebonds par match.`,
      `Le point fort de ${name}, c'est le rebond, ${f(rpg)} prises par soir.`,
      `${name} est un travailleur près du panier, ${f(rpg)} rebonds de moyenne.`,
      `${name} contrôle les planches : ${f(rpg)} rebonds par match.`,
      `Peu de ballons lui échappent sous le panier : ${name} capte ${f(rpg)} rebonds par match.`,
    ],
    playmaker: [
      `${name} fait jouer les autres : ${f(apg)} passes décisives par match.`,
      `Le ballon circule mieux quand ${name} est sur le terrain, ${f(apg)} passes par soir.`,
      `${name} a la vision d'un vrai meneur, ${f(apg)} passes de moyenne.`,
      `${name} rend ses coéquipiers meilleurs : ${f(apg)} passes décisives par match.`,
      `Créateur de jeu, ${name} distribue ${f(apg)} passes décisives par match.`,
    ],
    defender: [
      `${name} fait sa marque en défense : ${defTxt()} par match.`,
      `Ce qui ressort chez ${name}, c'est son impact défensif, ${f(def)} ballons volés ou bloqués par soir.`,
      `${name} est un défenseur qui dérange l'adversaire : ${defTxt()} par match.`,
      `En défense, ${name} change des possessions : ${defTxt()} par match.`,
    ],
    balanced: [
      `${name} est un joueur complet : ${joinList(listed)} par match.`,
      `Difficile de mettre ${name} dans une case, il contribue partout (${joinList(listed)} par match).`,
      `${name} touche à tout sur le terrain : ${joinList(listed)} par match.`,
      `Polyvalent, ${name} aide son équipe de plusieurs façons : ${joinList(listed)} par match.`,
    ],
  } : {
    scorer: [
      `${name} is a scorer first: ${f(ppg)} points per game.`,
      `What jumps out with ${name} is how he puts the ball in the basket, ${f(ppg)} points a night.`,
      `${name} is his team's main offensive weapon at ${f(ppg)} PPG.`,
      `At ${f(ppg)} points per game, ${name} is a reliable offensive option for his team.`,
      `${name} knows how to find the basket: ${f(ppg)} PPG.`,
    ],
    rebounder: [
      `${name} wins games in the paint: ${f(rpg)} rebounds per game.`,
      `${name}'s calling card is rebounding, ${f(rpg)} boards a night.`,
      `${name} does the dirty work around the rim, ${f(rpg)} RPG.`,
      `${name} controls the glass: ${f(rpg)} rebounds per game.`,
      `Not much gets past him under the rim: ${name} grabs ${f(rpg)} boards per game.`,
    ],
    playmaker: [
      `${name} makes everyone better: ${f(apg)} assists per game.`,
      `The ball moves better when ${name} is on the floor, ${f(apg)} assists a night.`,
      `${name} sees the floor like a real point guard, ${f(apg)} APG.`,
      `${name} makes his teammates better: ${f(apg)} assists per game.`,
      `A playmaker, ${name} hands out ${f(apg)} assists per game.`,
    ],
    defender: [
      `${name} makes his mark on defense: ${defTxt()} per game.`,
      `What stands out with ${name} is the defensive impact, ${f(def)} steals or blocks a night.`,
      `${name} is a disruptive defender: ${defTxt()} per game.`,
      `On defense, ${name} changes possessions: ${defTxt()} per game.`,
    ],
    balanced: [
      `${name} is a complete player: ${joinList(listed)} per game.`,
      `Hard to put ${name} in one box, he contributes everywhere (${joinList(listed)} per game).`,
      `${name} does a bit of everything: ${joinList(listed)} per game.`,
      `Versatile, ${name} helps his team in several ways: ${joinList(listed)} per game.`,
    ],
  };
  S.push(pick(OPEN[category], 1));
  const said = { pts: lead === 'pts' || category === 'balanced', reb: lead === 'reb' || category === 'balanced', ast: lead === 'ast' || category === 'balanced', def: lead === 'def' || category === 'balanced' };

  // ── Attaque (seulement si ≥ 1,5 point) ────────────────────────────────────
  if (!said.pts && ppg >= MIN) {
    S.push(pick(fr
      ? (ppg >= 10 ? [`Il reste une menace au pointage avec ${f(ppg)} points par match.`, `Il ajoute aussi ${f(ppg)} points par match en attaque.`]
        : ppg >= 5 ? [`Au pointage, il ajoute ${f(ppg)} points par match.`, `Il marque aussi ${f(ppg)} points par match.`, `Offensivement, il apporte ${f(ppg)} points par match.`]
        : [`Il ajoute ${pl(ppg, 'point')} par match.`, `Il contribue aussi au pointage (${pl(ppg, 'point')} par match).`])
      : (ppg >= 10 ? [`He's still a scoring threat at ${f(ppg)} PPG.`, `He also adds ${f(ppg)} points per game on offense.`]
        : ppg >= 5 ? [`He chips in ${f(ppg)} points per game.`, `Offensively, he brings ${f(ppg)} points per game.`, `He adds ${f(ppg)} points a night.`]
        : [`He adds ${f(ppg)} points per game.`, `He contributes on the scoreboard too (${f(ppg)} PPG).`]), 2));
  }
  // Tir : % au tir seulement s'il est bon, 3 points seulement si ≥ 1,5 par match
  const shot = [];
  if (fg != null && fg >= 40) shot.push(fr ? `${String(fg).replace('.', ',')} % au tir` : `${fg}% from the field`);
  if (tpg >= MIN) shot.push(fr ? `${f(tpg)} paniers de 3 par match` : `${f(tpg)} threes a game`);
  if (shot.length) S.push(pick(fr
    ? [`Côté tir : ${shot.join(' et ')}.`, `Il est efficace au tir : ${shot.join(' et ')}.`]
    : [`Shooting-wise: ${shot.join(' and ')}.`, `He's an efficient shooter: ${shot.join(' and ')}.`], 3));
  // Régularité / gros matchs : seulement pour un vrai marqueur, pas pour quelques points
  if (last5.length >= 3 && ppg >= 8) {
    const tight = hi - lo <= Math.max(6, ppg * 0.6);
    if (tight) S.push(pick(fr
      ? [`Il est régulier : entre ${lo} et ${hi} points sur ses ${last5.length} derniers matchs.`, `On peut compter sur lui chaque match : de ${lo} à ${hi} points sur ses ${last5.length} derniers matchs.`]
      : [`He's consistent: between ${lo} and ${hi} points over his last ${last5.length}.`, `You can count on him every game: ${lo} to ${hi} points over his last ${last5.length}.`], 4));
    else if (hi >= 20) S.push(pick(fr
      ? [`Il peut prendre feu offensivement : jusqu'à ${hi} points dans un match récent.`, `Capable de gros matchs, il a déjà inscrit ${hi} points dans un de ses derniers matchs.`]
      : [`He can catch fire offensively: up to ${hi} points in a recent game.`, `Capable of big nights, he recently put up ${hi} points in a game.`], 4));
  }

  // ── Rebond (seulement si ≥ 1,5) ───────────────────────────────────────────
  if (!said.reb && rpg >= MIN) {
    S.push(pick(fr
      ? (rpg >= 7 ? [`Au rebond, il est dominant avec ${f(rpg)} prises par match.`, `Il domine aussi sous les paniers : ${f(rpg)} rebonds par match.`]
        : rpg >= 4 ? [`Il fait sa part au rebond (${f(rpg)} par match).`, `Il est présent au rebond avec ${f(rpg)} prises par match.`, `Il aide son équipe au rebond : ${f(rpg)} par match.`]
        : [`Il ajoute ${pl(rpg, 'rebond')} par match.`, `Il va aussi chercher ${pl(rpg, 'rebond')} par match.`])
      : (rpg >= 7 ? [`On the glass he's dominant at ${f(rpg)} RPG.`, `He also owns the boards: ${f(rpg)} rebounds per game.`]
        : rpg >= 4 ? [`He does his part on the boards (${f(rpg)} RPG).`, `He's active on the glass with ${f(rpg)} rebounds per game.`, `He helps his team on the boards: ${f(rpg)} per game.`]
        : [`He adds ${f(rpg)} RPG.`, `He also pulls down ${f(rpg)} rebounds per game.`]), 5));
  }

  // ── Passe (seulement si ≥ 1,5) ────────────────────────────────────────────
  if (!said.ast && apg >= MIN) {
    S.push(pick(fr
      ? (apg >= 4 ? [`Il distribue aussi le jeu, ${f(apg)} passes décisives par match.`, `Il crée beaucoup pour les autres : ${f(apg)} passes décisives par match.`]
        : [`Il trouve aussi ses coéquipiers (${pl(apg, 'passe')} par match).`, `Il partage le ballon : ${pl(apg, 'passe')} décisive${apg >= 2 ? 's' : ''} par match.`, `Il ajoute ${pl(apg, 'passe')} par match.`])
      : (apg >= 4 ? [`He also runs the offense, ${f(apg)} assists per game.`, `He creates a lot for others: ${f(apg)} assists per game.`]
        : [`He also finds his teammates (${f(apg)} APG).`, `He shares the ball: ${f(apg)} assists per game.`, `He adds ${f(apg)} APG.`]), 6));
  }

  // ── Défense (seulement si ≥ 1,5 interceptions + contres) ─────────────────
  if (!said.def && def >= MIN) {
    S.push(pick(fr
      ? (def >= 3 ? [`En défense, il dérange : ${defTxt()} par match.`, `Il est aussi un atout défensif : ${defTxt()} par match.`]
        : [`Il contribue aussi en défense (${defTxt()} par match).`, `Il est actif en défense : ${defTxt()} par match.`])
      : (def >= 3 ? [`Defensively he's a problem: ${defTxt()} per game.`, `He's a defensive asset too: ${defTxt()} per game.`]
        : [`He contributes on defense too (${defTxt()} per game).`, `He's active on defense: ${defTxt()} per game.`]), 8));
  }

  if (ddCount > 0) S.push(fr ? `Il compte déjà ${ddCount} double-double${ddCount > 1 ? 's' : ''} cette saison.` : `He already has ${ddCount} double-double${ddCount > 1 ? 's' : ''} this season.`);
  if (improving) S.push(fr ? `La tendance est bonne : son apport a nettement monté sur ses 3 derniers matchs.` : `The trend is good: his overall impact is clearly up over his last 3 games.`);

  // ── Conclusion : ton de recrutement, on met la force en avant ─────────────
  const AREA = fr
    ? { pts: 'au pointage', reb: 'au rebond', ast: 'à la création de jeu', def: 'en défense' }
    : { pts: 'scoring', reb: 'rebounding', ast: 'playmaking', def: 'defense' };
  if (category !== 'balanced') {
    S.push(pick(fr
      ? [`Un profil intéressant pour une équipe qui cherche de l'aide ${AREA[lead]}.`, `Un atout pour tout programme qui veut se renforcer ${AREA[lead]}.`, `Une belle option pour une équipe qui a besoin de solidité ${AREA[lead]}.`]
      : [`An interesting profile for any team looking for help in ${AREA[lead]}.`, `An asset for any program looking to get stronger in ${AREA[lead]}.`, `A strong option for a team that needs help in ${AREA[lead]}.`], 9));
  } else {
    S.push(pick(fr
      ? [`Sa polyvalence en fait un joueur utile dans plusieurs rôles.`, `Un joueur qu'un entraîneur peut utiliser de plusieurs façons.`]
      : [`His versatility makes him useful in several roles.`, `A player a coach can use in many ways.`], 9));
  }
  S.push(small
    ? pick(fr
      ? [`Un joueur à suivre de près (${gp} matchs joués jusqu'ici).`, `À surveiller pour la suite de la saison (${gp} matchs joués).`, `Un nom à retenir, avec ${gp} matchs joués jusqu'ici.`]
      : [`A player worth following closely (${gp} games played so far).`, `One to watch for the rest of the season (${gp} games played).`, `A name to remember, with ${gp} games played so far.`], 10)
    : pick(fr
      ? [`Une base solide sur laquelle un programme peut bâtir.`, `Un joueur qui mérite l'attention des recruteurs.`, `Les outils sont là pour continuer à progresser.`, `Un joueur qui a sa place dans un programme compétitif.`]
      : [`A solid foundation for any program to build on.`, `A player who deserves recruiters' attention.`, `The tools are there to keep growing.`, `A player who belongs in a competitive program.`], 3));

  return S.join(' ');
}
