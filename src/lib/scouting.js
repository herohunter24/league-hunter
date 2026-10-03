export function scoutingReport(p, pGames, fgPct, lang) {
  const fr = lang === 'fr';
  const f = n => (+(n || 0)).toLocaleString(fr ? 'fr-CA' : 'en-CA', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const name = p.name;
  const ppg = p.ppg || 0, rpg = p.rpg || 0, apg = p.apg || 0, spg = p.spg || 0, bpg = p.bpg || 0;
  const fg = fgPct != null ? parseFloat(fgPct) : null;
  const gp = p.gp || pGames.length;

  if (gp === 0 || (ppg === 0 && rpg === 0 && apg === 0 && spg === 0 && bpg === 0)) {
    const seedF = String(p.id).split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const FB = fr ? {
      friendly: [
        `Ce joueur est prêt à marquer les esprits ! Le rapport arrivera après ses premiers matchs.`,
        `Hâte de voir ce qu'il va apporter — un peu de temps de jeu et le rapport complet sera prêt.`,
        `Le potentiel est là, reste à le voir à l'œuvre. Rapport à venir après quelques matchs.`,
        `Bientôt disponible ! Dès que ce joueur foulera le parquet, on aura une analyse complète.`,
        `Nouveau visage dans l'effectif — le rapport se génère dès qu'il joue un peu.`,
        `Vraiment hâte de le voir en action. Rapport de dépistage bientôt disponible.`,
      ],
      professional: [
        `Données de match insuffisantes. Un rapport sera généré après 2 à 3 matchs.`,
        `Aucune statistique enregistrée. Un rapport complet sera disponible après participation en match.`,
        `Données du joueur en attente. L'analyse sera fournie dès que des statistiques seront enregistrées.`,
        `Aucun historique de match disponible. Un rapport sera généré après ses débuts.`,
        `Analyse en attente — des données de performance sont nécessaires pour générer un rapport.`,
        `Collecte de données en cours. Le rapport sera disponible une fois des matchs joués.`,
      ],
      casual: [
        `Pas encore d'images de match — impossible de dépister ce qu'on n'a pas vu. Monte sur le terrain et montre-nous ça !`,
        `Zéro stat pour l'instant. Prends quelques minutes de jeu et on aura le topo complet.`,
        `On attend qu'il entre sur le terrain. Dès qu'il joue, le rapport est prêt.`,
        `Pas assez de données — mais on est prêts quand tu l'es. Joue quelques matchs et on aura l'analyse.`,
        `Le tableau d'affichage est vide pour l'instant. Un peu de temps de jeu et on sort le rapport complet.`,
        `Impossible d'écrire un rapport sans te voir jouer. On se donne quelques matchs et on en reparle.`,
      ],
    } : {
      friendly: [
        `This player is ready to make an impact! The scouting report will be ready after their first few games.`,
        `We're excited to see what they bring — get some game time and we'll have a full report ready.`,
        `The potential is there — let's see it in action. Report coming once they log a few games.`,
        `Coming soon! Once this player takes the court, we'll have a complete breakdown ready.`,
        `Fresh talent on the roster — the scouting report generates once they get some minutes.`,
        `Can't wait to see this one in action. Scouting report coming soon.`,
      ],
      professional: [
        `Insufficient game data available. A scouting report will be generated after 2–3 games.`,
        `No statistical data recorded. A comprehensive report will be available following game participation.`,
        `Player data pending. Scouting analysis will be provided once performance metrics are recorded.`,
        `No game history available. A scouting report will be generated following their debut.`,
        `Analysis pending — player performance data is required to generate a report.`,
        `Data collection in progress. The scouting report will be available upon game completion.`,
      ],
      casual: [
        `No game tape yet — can't scout what we haven't seen. Get on the court and show us what you've got!`,
        `Zero stats so far. Get some minutes under your belt and we'll have the full breakdown ready.`,
        `Waiting on this one to take the floor. Once they do, the report's ready.`,
        `Not enough data yet — but we're ready when you are. Play a few and we'll have the intel.`,
        `Scoreboard's blank right now. Get some playing time and we'll have the full report.`,
        `Can't write a report without seeing you play. Let's get some game time and we'll talk.`,
      ],
    };
    const tones = ['friendly', 'professional', 'casual'];
    const pool = FB[tones[seedF % 3]];
    return pool[Math.floor(seedF / 3) % pool.length];
  }

  const small = gp > 0 && gp < 5;
  const pts = pGames.map(g => +((g.playerStats[p.id] || {}).points || 0));
  const last5 = pts.slice(0, 5), last5n = last5.length;
  const lo = last5n ? Math.min(...last5) : 0, hi = last5n ? Math.max(...last5) : 0;
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  const improving = last5n >= 4 && avg(pts.slice(0, 3)) > avg(pts.slice(3, 8)) + 1.5;
  const archEn = (p.arch && p.arch.en) || 'SCORER';
  const archSig = ['SNIPER', 'SCORER', 'CLOSER', 'ICON'].includes(archEn) ? 'pts'
                : archEn === 'PLAYMAKER' ? 'ast' : ['REBOUNDER', 'ANCHOR'].includes(archEn) ? 'reb' : 'pts';
  const bench = { pts: 15, reb: 7, ast: 5 };
  const ranked = [['pts', ppg], ['reb', rpg], ['ast', apg]]
    .map(([k, v]) => ({ k, v, r: (v / bench[k]) * (k === archSig ? 1.25 : 1) }))
    .sort((a, b) => b.r - a.r);
  const lead = ranked[0], second = ranked[1], low = ranked[2];
  const category = improving ? 'rising' : (lead.r - low.r < 0.5) ? 'balanced'
                 : lead.k === 'pts' ? 'scorer' : lead.k === 'reb' ? 'rebounder' : 'playmaker';
  const seed = String(p.id).split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const pick = (arr, salt) => arr[(seed + salt) % arr.length];
  const U = fr ? { pts: 'points', reb: 'rebonds', ast: 'passes' } : { pts: 'PPG', reb: 'RPG', ast: 'APG' };
  const AR = fr ? { pts: 'au scoring', reb: 'au rebond', ast: 'à la passe' } : { pts: 'scoring', reb: 'rebounding', ast: 'playmaking' };

  const OPEN = fr ? {
    scorer: [
      `${name}, c'est un scoreur pur et dur — ${f(ppg)} points par match.`,
      `Ce qui saute aux yeux tout de suite, c'est le volume : ${f(ppg)} points par soir.`,
      `On parle d'un rendement offensif d'élite — ${f(ppg)} points par match.`,
      `${name} porte l'attaque sur ses épaules, ${f(ppg)} points à lui seul.`,
      `Le scoring parle de lui-même : ${f(ppg)} points par match.`,
      `${name} ne se contente pas de marquer, il domine — ${f(ppg)} points par match.`,
      `Des chiffres comme ${f(ppg)} points par match, ça ne ment pas.`,
    ],
    rebounder: [
      `${name} est un monstre au rebond — ${f(rpg)} prises par match.`,
      `Ce qui ressort, c'est sa mainmise sur le verre : ${f(rpg)} rebonds par match.`,
      `Il se bat sur chaque possession, ${f(rpg)} rebonds de moyenne.`,
      `Un effort au rebond comme ${f(rpg)} par match, c'est du sérieux.`,
      `Il va chercher ${f(rpg)} ballons par soir — rien à voir avec la chance.`,
      `Joueur physique qui comprend le placement, ${f(rpg)} rebonds par match.`,
    ],
    playmaker: [
      `Ce qui ressort, c'est sa gestion du jeu — ${f(apg)} passes par match.`,
      `Le ballon circule mieux quand il est là : ${f(apg)} passes par match.`,
      `Un vrai distributeur, ${f(apg)} passes décisives par match.`,
      `Il rend ses coéquipiers meilleurs, ${f(apg)} passes par soir.`,
      `Sa vision du jeu est réelle — ${f(apg)} passes le prouvent.`,
      `Mentalité passe-d'abord, ${f(apg)} caviars par match.`,
    ],
    balanced: [
      `${name} apporte de l'équilibre — ${f(ppg)} pts, ${f(rpg)} rbds, ${f(apg)} passes.`,
      `Ce que j'aime, c'est qu'il n'est pas unidimensionnel : solide partout.`,
      `Fiable dans tous les secteurs — ${f(ppg)} pts, ${f(rpg)} rbds, ${f(apg)} passes.`,
      `Tu obtiens scoring, passe et rebond dans le même joueur.`,
      `Ce genre de polyvalence, ça a de la valeur.`,
      `Joueur complet à son poste : ${f(ppg)}/${f(rpg)}/${f(apg)}.`,
    ],
    rising: [
      `${name} est en pleine ascension.`,
      `On voit la progression se faire, match après match.`,
      `La trajectoire est claire — il monte en puissance.`,
      `Discret en début de saison, il est en train de tout déverrouiller.`,
      `Échantillon encore court, mais la courbe est nette.`,
    ],
  } : {
    scorer: [
      `${name}'s a flat-out scorer — ${f(ppg)} PPG.`,
      `What jumps out immediately is the scoring volume: ${f(ppg)} a night.`,
      `You're looking at elite-level output here — ${f(ppg)} PPG.`,
      `${name}'s putting the team on his back with ${f(ppg)} PPG.`,
      `The scoring speaks for itself — ${f(ppg)} points a night.`,
      `${name} doesn't just score — he dominates, ${f(ppg)} PPG.`,
      `Numbers like ${f(ppg)} PPG don't lie.`,
    ],
    rebounder: [
      `${name}'s a monster on the glass — ${f(rpg)} RPG.`,
      `What stands out is how he owns the boards: ${f(rpg)} a game.`,
      `Every possession he's battling for position — ${f(rpg)} RPG.`,
      `Rebounding effort like ${f(rpg)} a game is serious work.`,
      `He's pulling ${f(rpg)} boards consistently — no luck there.`,
      `Physical player who understands positioning, ${f(rpg)} RPG.`,
    ],
    playmaker: [
      `What stands out is how he runs the offense — ${f(apg)} APG.`,
      `Ball movement improves when he's on the court: ${f(apg)} a game.`,
      `He's a true facilitator at ${f(apg)} assists per game.`,
      `Getting teammates involved at ${f(apg)} APG shows real unselfishness.`,
      `Court vision is legit — ${f(apg)} APG tells the story.`,
      `Pass-first mentality at ${f(apg)} a night.`,
    ],
    balanced: [
      `${name} brings balance — ${f(ppg)} PPG, ${f(rpg)} RPG, ${f(apg)} APG.`,
      `What I like is he's not one-dimensional — reliable everywhere.`,
      `Solid contributor across the board: ${f(ppg)}/${f(rpg)}/${f(apg)}.`,
      `You get scoring AND playmaking AND rebounding in one player.`,
      `That kind of versatility is valuable.`,
      `Complete player for his position — ${f(ppg)}/${f(rpg)}/${f(apg)}.`,
    ],
    rising: [
      `${name}'s on a real upswing.`,
      `You can see the progression happening game to game.`,
      `Trending in the right direction.`,
      `Started the season quiet, now he's clicking.`,
      `Early sample, but the trajectory is clear.`,
    ],
  };

  const angle = {
    eff: fg != null ? (fr ? `Et ce n'est pas qu'une question de volume : ${fg}% au tir, de la vraie efficacité.` : `And it's not just volume — ${fg}% from the field is real efficiency.`) : null,
    consist: last5n >= 3 ? (fr ? `Sur ses ${last5n} derniers matchs il tourne entre ${lo} et ${hi} points, le standard est posé.` : `Over his last ${last5n} he's between ${lo} and ${hi} points — that's the standard he's set.`) : null,
    second: (fr ? `Il ajoute ${f(second.v)} ${U[second.k]} par match, une menace vraiment complète.` : `He's adding ${f(second.v)} ${U[second.k]} a game — a genuinely complete threat.`),
    defenseGap: (spg === 0 && bpg === 0) ? (fr ? `Le vrai axe de progression, c'est la défense : 0 interception et 0 contre, du placement et de la lecture à travailler.` : `The real development area is defense: 0 steals, 0 blocks — positioning and reads to build on.`) : null,
    growthLow: low.r < 0.7 ? (fr ? `Il peut encore hausser le ton ${AR[low.k]} (${f(low.v)}), mais la fondation est là.` : `He can raise his game ${AR[low.k]} (${f(low.v)}), but the foundation's there.`) : null,
    defenseGood: (spg > 0 || bpg > 0) ? (fr ? `Il pèse aussi en défense (${f(spg)} int., ${f(bpg)} contres).` : `He shows up on defense too (${f(spg)} STL, ${f(bpg)} BLK).`) : null,
  };
  const used = new Set();
  const take = prefs => { for (const a of prefs) if (!used.has(a) && angle[a]) { used.add(a); return angle[a]; } return null; };
  const s2 = take(['eff', 'consist', 'second']) || angle.second;
  const s3 = (spg === 0 && bpg === 0) ? angle.defenseGap : (take(['second', 'consist', 'growthLow', 'defenseGood']) || angle.growthLow || angle.defenseGood || '');

  const CLOSE = fr
    ? [`Qu'il continue comme ça et on tient un vrai joueur.`, `C'est le standard qu'il doit maintenir.`, `Les outils sont là — reste à les développer.`, `Un vrai potentiel de joueur qui fait la différence.`, `Il file vers quelque chose de spécial.`, `C'est le genre de performance qui fait grimper les niveaux.`, `On peut bâtir une équipe autour de chiffres pareils.`, `La base est solide, continue de construire.`]
    : [`Keep this up and you're looking at a legit player.`, `That's the standard he needs to maintain.`, `The tools are there — keep developing them.`, `Real potential to be a difference-maker.`, `Trending toward something special.`, `That's the kind of performance that moves you up tiers.`, `You can build a team around numbers like these.`, `The foundation is solid — keep building.`];
  const CLOSE_SMALL = fr
    ? [`Échantillon encore réduit (${gp} match${gp > 1 ? 's' : ''}), mais très prometteur.`, `Tôt dans la saison, mais ce qu'on voit donne envie.`, `À confirmer sur la durée, mais les signaux sont bons.`]
    : [`Small sample so far (${gp} game${gp > 1 ? 's' : ''}), but very promising.`, `Early days, but what's on tape is exciting.`, `Needs a bigger sample, but the signs are good.`];

  const opener = pick(OPEN[category] || OPEN.balanced, 1);
  const closer = pick(small ? CLOSE_SMALL : CLOSE, 3);
  return [opener, s2, s3, closer].filter(Boolean).join(' ');
}
