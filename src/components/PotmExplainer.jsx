import { useState, useEffect } from 'react';
import { POTM_WEIGHTS, formatMonth, monthKeyOfDate } from '../lib/playerOfMonth.js';

// Mois dont le gagnant sera dévoilé à revealAt (= le mois en cours), ex. « novembre »
const upcomingMonthName = (revealAt, lang) => {
  const d = new Date(revealAt.getTime() - 86400000);
  const name = formatMonth(monthKeyOfDate(d), lang).replace(/\s+\d{4}$/, '');
  return lang === 'fr' ? name.toLowerCase() : name;
};

const TXT = {
  fr: {
    kicker: 'Joueur du mois', title: 'Comment c’est calculé',
    intro: 'Le Joueur du mois récompense la régularité, pas juste un gros match. On additionne tout ce que tu fais sur le terrain, match après match, pendant le mois.',
    winners: m => `Gagnants de ${m}. Les joueurs du mois sont dévoilés le 1er de chaque mois.`,
    first: 'Les joueurs du mois sont dévoilés le 1er de chaque mois.',
    crown: 'Prochain dévoilement dans',
    crownOf: m => `Joueurs du mois ${/^[aeiouyâàéèêîôû]/i.test(m) ? 'd’' : 'de '}${m} dévoilés dans`,
    d: 'j', h: 'h', m: 'min', s: 's',
    s1: '1. Le score d’un match',
    s1p: 'Chaque stat compte. Les passes, les interceptions et les contres valent plus qu’un point, parce qu’ils sont plus rares et changent un match.',
    stat: { points: 'Point', rebounds: 'Rebond', assists: 'Passe décisive', steals: 'Interception', blocks: 'Contre' },
    s2: '2. Le score du mois',
    s2p: 'On additionne le score de tous tes matchs du mois. Plus tu joues et plus tu es constant, plus ton total monte.',
    exTitle: 'Exemple',
    exA: 'Joueur A — 3 matchs à 20 points', exB: 'Joueur B — 1 match à 26 points',
    exWin: 'Le joueur A passe devant : 60 contre 26. La constance gagne.',
    exC: 'Joueur C — 1 match à 70 points', exCWin: 'Mais un match historique reste récompensé : le joueur C passe devant tout le monde avec 70. Pour battre la constance, il faut une performance vraiment exceptionnelle.',
    s3: '3. Pourquoi c’est équitable',
    s3p: 'Toutes les équipes jouent le même nombre de matchs dans la saison. Si ton équipe joue beaucoup en début de saison, elle en jouera moins plus tard — et inversement. Chaque bon joueur aura donc sa chance d’être Joueur du mois.',
    s4: '4. En cas d’égalité',
    s4p: 'Celui qui a joué le plus de matchs dans le mois passe devant. Si c’est encore égal : la meilleure moyenne par match.',
    s5: '5. Qui peut gagner',
    s5p: 'Il faut au moins un match avec des stats dans le mois. Les équipes qui n’ont pas envoyé leur alignement officiel n’ont pas encore de stats, donc pas de Joueur du mois.',
    board: 'Classement final',
    none: 'Aucun match avec des stats ce mois-là dans cette catégorie.',
    noneYet: 'Le classement apparaîtra au premier dévoilement.',
    gp: n => n > 1 ? `${n} matchs` : `${n} match`,
    pts: 'score', avg: 'moy./match',
    cols: { points: 'PTS', rebounds: 'REB', assists: 'PD', steals: 'INT', blocks: 'CTR' },
    override: 'Choix de la ligue', overrideP: 'Pour cette catégorie, la ligue a choisi le Joueur du mois manuellement :',
    close: 'Fermer',
  },
  en: {
    kicker: 'Player of the Month', title: 'How it’s calculated',
    intro: 'Player of the Month rewards consistency, not just one big game. We add up everything you do on the court, game after game, during the month.',
    winners: m => `${m} winners. Players of the Month are revealed on the 1st of every month.`,
    first: 'Players of the Month are revealed on the 1st of every month.',
    crown: 'Next reveal in',
    crownOf: m => `${m} Players of the Month revealed in`,
    d: 'd', h: 'h', m: 'min', s: 's',
    s1: '1. The score of one game',
    s1p: 'Every stat counts. Assists, steals and blocks are worth more than a point because they’re rarer and they swing games.',
    stat: { points: 'Point', rebounds: 'Rebound', assists: 'Assist', steals: 'Steal', blocks: 'Block' },
    s2: '2. The score of the month',
    s2p: 'We add up the score of every game you play in the month. The more you play and the more consistent you are, the higher your total.',
    exTitle: 'Example',
    exA: 'Player A — 3 games of 20 points', exB: 'Player B — 1 game of 26 points',
    exWin: 'Player A finishes ahead: 60 vs 26. Consistency wins.',
    exC: 'Player C — 1 game of 70 points', exCWin: 'But a historic game still gets rewarded: Player C passes everyone with 70. To beat consistency, you need a truly exceptional performance.',
    s3: '3. Why it’s fair',
    s3p: 'Every team plays the same number of games in the season. If your team plays a lot early on, it plays less later — and vice versa. So every good player gets a shot at Player of the Month.',
    s4: '4. Tiebreakers',
    s4p: 'The player with more games in the month goes first. Still tied: the best average per game.',
    s5: '5. Who can win',
    s5p: 'You need at least one game with stats during the month. Teams that haven’t sent their official roster don’t have stats yet, so no Player of the Month.',
    board: 'Final ranking',
    none: 'No games with stats that month in this category.',
    noneYet: 'The ranking will appear at the first reveal.',
    gp: n => n > 1 ? `${n} games` : `${n} game`,
    pts: 'score', avg: 'avg/game',
    cols: { points: 'PTS', rebounds: 'REB', assists: 'AST', steals: 'STL', blocks: 'BLK' },
    override: 'League’s pick', overrideP: 'For this category, the league picked the Player of the Month manually:',
    close: 'Close',
  },
};

const fmt = (n, lang) => (Math.round(n * 10) / 10).toLocaleString(lang === 'fr' ? 'fr-CA' : 'en-CA', { maximumFractionDigits: 1 });

export function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target || target.getTime() <= Date.now()) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const ms = target.getTime() - now;
  if (ms <= 0) return null;
  const sec = Math.floor(ms / 1000);
  return { d: Math.floor(sec / 86400), h: Math.floor(sec / 3600) % 24, m: Math.floor(sec / 60) % 60, s: sec % 60 };
}

export function PotmExplainer({ lang, month, revealAt, cats, initialCat, rankingFor, overrideFor, catLabel, onOpenPlayer, onClose }) {
  const L = TXT[lang] || TXT.fr;
  const startCat = cats.some(c => c.id === initialCat) ? initialCat : (cats[0] && cats[0].id);
  const [catId, setCatId] = useState(startCat);
  const cd = useCountdown(revealAt);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const rows = catId ? rankingFor(catId).slice(0, 5) : [];
  const ov = catId ? overrideFor(catId) : null;

  return (
    <div className="potm-how" role="dialog" aria-modal="true" aria-label={`${L.kicker} — ${L.title}`}>
      <div className="potm-how-inner">
        <button className="potm-how-close" onClick={onClose} aria-label={L.close}>{'✕'}</button>
        <div className="sec-kicker">{L.kicker}{month ? ' · ' + formatMonth(month, lang) : ''}</div>
        <h1 className="potm-how-title">{L.title}</h1>
        <p className="potm-how-lead">{L.intro}</p>

        <div className="potm-how-status">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span className="potm-how-dot" aria-hidden="true" />{month ? L.winners(formatMonth(month, lang)) : L.first}</span>
          {cd && (
            <span className="potm-how-cd">
              {revealAt ? L.crownOf(upcomingMonthName(revealAt, lang)) : L.crown}{' '}
              <strong>{cd.d}{L.d} {String(cd.h).padStart(2, '0')}{L.h} {String(cd.m).padStart(2, '0')}{L.m} {String(cd.s).padStart(2, '0')}{L.s}</strong>
            </span>
          )}
        </div>

        <section className="potm-how-sec">
          <h2>{L.s1}</h2>
          <p>{L.s1p}</p>
          <div className="potm-how-weights">
            {POTM_WEIGHTS.map(({ key, w }) => (
              <div key={key} className="potm-how-w">
                <span className="potm-how-w-val">×{fmt(w, lang)}</span>
                <span className="potm-how-w-lbl">{L.stat[key]}</span>
              </div>
            ))}
          </div>
          <div className="potm-how-formula">
            {POTM_WEIGHTS.map(({ key, w }, i) => (
              <span key={key}>{i > 0 ? ' + ' : ''}{L.cols[key]} × {fmt(w, lang)}</span>
            ))}
          </div>
        </section>

        <section className="potm-how-sec">
          <h2>{L.s2}</h2>
          <p>{L.s2p}</p>
          <div className="potm-how-example">
            <div className="potm-how-ex-title">{L.exTitle}</div>
            <div className="potm-how-ex-row potm-how-ex-win"><span>{L.exA}</span><strong>20 + 20 + 20 = 60</strong></div>
            <div className="potm-how-ex-row"><span>{L.exB}</span><strong>26</strong></div>
            <div className="potm-how-ex-note">{L.exWin}</div>
            <div className="potm-how-ex-row potm-how-ex-win" style={{ marginTop: 12 }}><span>{L.exC}</span><strong>70</strong></div>
            <div className="potm-how-ex-note">{L.exCWin}</div>
          </div>
        </section>

        <section className="potm-how-sec"><h2>{L.s3}</h2><p>{L.s3p}</p></section>
        <section className="potm-how-sec"><h2>{L.s4}</h2><p>{L.s4p}</p></section>
        <section className="potm-how-sec"><h2>{L.s5}</h2><p>{L.s5p}</p></section>

        <section className="potm-how-sec">
          <h2>{L.board}{month ? ' — ' + formatMonth(month, lang) : ''}</h2>
          {cats.length > 1 && (
            <div className="potm-how-tabs" role="tablist">
              {cats.map(c => (
                <button key={c.id} role="tab" aria-selected={c.id === catId}
                        className={'potm-how-tab' + (c.id === catId ? ' active' : '')}
                        onClick={() => setCatId(c.id)}>{catLabel(c)}</button>
              ))}
            </div>
          )}

          {ov && (
            <div className="potm-how-override">
              <span className="potm-how-badge">{L.override}</span> {L.overrideP}{' '}
              <button className="potm-how-link" onClick={() => onOpenPlayer(ov)}>{ov.name}</button>
            </div>
          )}

          {rows.length === 0 ? (
            <div className="potm-how-empty">{month ? L.none : L.noneYet}</div>
          ) : (
            <ol className="potm-how-board">
              {rows.map((r, i) => (
                <li key={r.p.id} className={'potm-how-rank' + (i === 0 && !ov ? ' first' : '')}>
                  <button className="potm-how-rank-btn" onClick={() => onOpenPlayer(r.p)}>
                    <span className="potm-how-pos">{i + 1}</span>
                    <span className="potm-how-who">
                      <span className="potm-how-name">{r.p.name}</span>
                      <span className="potm-how-meta">{r.p.team ? r.p.team + ' · ' : ''}{L.gp(r.gp)} · {fmt(r.avg, lang)} {L.avg}</span>
                      <span className="potm-how-line">
                        {POTM_WEIGHTS.map(({ key }) => (
                          <span key={key}>{r.totals[key]} {L.cols[key]}</span>
                        ))}
                      </span>
                    </span>
                    <span className="potm-how-score">{fmt(r.score, lang)}<small>{L.pts}</small></span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

/** Compte à rebours compact jusqu'au prochain dévoilement (page d'accueil). */
export function PotmCountdown({ revealAt, lang }) {
  const L = TXT[lang] || TXT.fr;
  const cd = useCountdown(revealAt);
  if (!cd) return null;
  const cell = (v, u) => (
    <span className="potm-cd-cell"><strong>{String(v).padStart(2, '0')}</strong><small>{u}</small></span>
  );
  return (
    <div className="potm-cd" aria-live="off">
      <div className="potm-cd-label">{L.crownOf(upcomingMonthName(revealAt, lang))}</div>
      <div className="potm-cd-row">
        {cell(cd.d, L.d)}{cell(cd.h, L.h)}{cell(cd.m, L.m)}{cell(cd.s, L.s)}
      </div>
    </div>
  );
}
