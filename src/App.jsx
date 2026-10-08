import { useState, useMemo, useEffect, useRef } from 'react';
import React from 'react';
import html2canvas from 'html2canvas';
import { LEAGUE_ID, db, doc, setDoc } from './lib/firebase.js';
import { STR } from './i18n/strings.js';
import { TIERS, TIER_ORDER, TIER_COLOR, TIER_GLOW } from './lib/tiers.js';
import { DEMO_TEAMS, DEMO_PLAYERS, DEMO_GAMES } from './lib/demo.js';
import { buildLiveViewData } from './lib/data.js';
import { getAnalyticsSessionId } from './lib/analytics.js';
import { useLeagueData } from './hooks/useLeagueData.js';
import { HeroVideo } from './components/HeroVideo.jsx';
import { HeroSlideshow } from './components/HeroSlideshow.jsx';
import { TeamBadge } from './components/TeamBadge.jsx';
import { PlayerCard } from './components/PlayerCard.jsx';
import { PlayerModal } from './components/PlayerModal.jsx';
import { SafeImage, TeamInitials, getSilhouettePng } from './components/SafeImage.jsx';
import { NLS_LOGO, NLS_LOGO_WHITE, BRAND_NAME, WEBSITE_URL, COPYRIGHT, DEFAULT_LANG,
  CONTACT_EMAIL, INSTAGRAM_URL, INSTAGRAM_HANDLE,
  REGISTRATION_URL, TEAM_SHOP_URL, UNIFORM_QUOTE_URL, SET_TOTAL } from './config/league.js';
import { AlertsModal } from './components/AlertsModal.jsx';
import { AlertsManage } from './components/AlertsManage.jsx';

const fmtDate = (d, lang) => new Date(d + 'T12:00').toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDateHeader = (d, lang) => { const s = new Date(d + 'T12:00').toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'long', day: 'numeric', month: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1); };

function readUrlState() {
  const sp = new URLSearchParams(window.location.search);
  return {
    cat:      sp.get('cat') || null,
    tab:      sp.get('tab') || 'standings',
    playerId: sp.get('player') ? Number(sp.get('player')) : null,
    gameId:   sp.get('game')   ? Number(sp.get('game'))   : null,
    g:        sp.get('g') || null,
    age:      sp.get('age') || null,
    div:      sp.get('div') || null,
  };
}

function buildPageUrl(cat, tab, playerId, gameId) {
  const sp = new URLSearchParams(window.location.search);
  if (cat)                      sp.set('cat', cat);      else sp.delete('cat');
  if (tab && tab !== 'standings') sp.set('tab', tab);    else sp.delete('tab');
  if (playerId)                 sp.set('player', String(playerId)); else sp.delete('player');
  if (gameId)                   sp.set('game',   String(gameId));   else sp.delete('game');
  sp.delete('g'); sp.delete('age'); sp.delete('div'); // strip picker params from cat URLs
  return window.location.pathname + '?' + sp.toString();
}

function buildPickerUrl(g, age, div) {
  const sp = new URLSearchParams(window.location.search);
  sp.delete('cat'); sp.delete('tab'); sp.delete('player'); sp.delete('game');
  if (g) sp.set('g', g); else sp.delete('g');
  if (age) sp.set('age', age); else sp.delete('age');
  if (div) sp.set('div', div); else sp.delete('div');
  return window.location.pathname + '?' + sp.toString();
}

const fmtN = (n, lg) => (+(n || 0)).toLocaleString(lg === 'fr' ? 'fr-CA' : 'en-CA', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const displayCatName = (name, t) => (t.catNames && t.catNames[name]) || name;
const normalize = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function App() {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('nls_lang') || DEFAULT_LANG; } catch { return DEFAULT_LANG; }
  });
  const t = STR[lang];

  const data = useLeagueData();
  const live = data.live;
  const view = useMemo(() => live
    ? buildLiveViewData(data.meta, data.teams, data.players, data.games)
    : { teams: DEMO_TEAMS, players: DEMO_PLAYERS, games: DEMO_GAMES, units: 'imperial', categories: [], ps: {}, meta: null },
    [live, data.meta, data.teams, data.players, data.games]);
  const TEAMS = view.teams, PLAYERS = view.players, GAMES = view.games;
  const ps = {
    showStandings: true, showSchedule: true, showPlayers: true,
    showPlayerCards: true, showStats: true, showLeagueInfo: true,
    ...(view.ps || {}),
  };
  const lm = (view.meta && view.meta.leagueMessage) || {};

  useEffect(() => {
    const c = (ps.accentColor || '').trim();
    document.documentElement.style.setProperty('--gold', /^#[0-9a-fA-F]{6}$/.test(c) ? c : '#C9A24A');
  }, [ps.accentColor]);

  useEffect(() => {
    try { localStorage.setItem('nls_lang', lang); } catch {}
    document.documentElement.lang = lang;
    document.title = t.pageTitle || 'NLS';
  }, [lang, t.pageTitle]);

  useEffect(() => {
    if (!LEAGUE_ID || !db) return;
    function track() {
      const section = (window.location.hash || '').replace('#', '') || 'home';
      const today = new Date().toISOString().split('T')[0];
      const viewId = 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      setDoc(doc(db, 'leagues', String(LEAGUE_ID), 'pageViews', viewId), {
        timestamp: Date.now(), date: today, section,
        sessionId: getAnalyticsSessionId(), userAgent: navigator.userAgent || '',
      }).catch(e => console.error('[NLS Analytics] track error:', e));
    }
    track();
    window.addEventListener('hashchange', track);
    return () => window.removeEventListener('hashchange', track);
  }, []);

  // ── Scroll reveal (runs after each render to catch newly rendered .reveal elements) ──
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('is-visible');
        else e.target.classList.remove('is-visible');
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });

  // ── Leader bar count-up ────────────────────────────────────
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-counted'); obs.unobserve(e.target); } }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.leaders-grid:not(.is-counted)').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });

  const scrollCueRef = useRef(null);
  const allstarHeroRef = useRef(null);
  useEffect(() => {
    const cue = scrollCueRef.current;
    if (!cue) return;
    const onScroll = () => { if (window.scrollY > 60) { cue.classList.add('faded'); window.removeEventListener('scroll', onScroll); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Count-up numbers ──────────────────────────────────────
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('[data-count]:not([data-counted])').forEach(el => { el.dataset.counted = '1'; });
      return;
    }
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const locale = lang === 'fr' ? 'fr-CA' : 'en-CA';
    const animateEl = (el) => {
      const raw = parseFloat(el.dataset.count);
      if (isNaN(raw)) return;
      const dec = (el.dataset.count.includes('.') ? (el.dataset.count.split('.')[1] || '').length : 0);
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / 700, 1);
        el.textContent = (raw * easeOut(p)).toLocaleString(locale, { minimumFractionDigits: dec, maximumFractionDigits: dec });
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { animateEl(e.target); obs.unobserve(e.target); } }),
      { threshold: 0.2 }
    );
    document.querySelectorAll('[data-count]:not([data-counted])').forEach(el => { el.dataset.counted = '1'; obs.observe(el); });
    return () => obs.disconnect();
  });

  const cats = view.categories || [];
  const effectiveCats = cats.length ? cats : [{ id: '__all__', name: lang === 'fr' ? 'Toute la ligue' : 'Whole league' }];

  function parseCatMeta(cat) {
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    // Gender — explicit field first, then name fallback
    const rawG = norm(cat.gender || '');
    let gender = null;
    if (rawG === 'm' || rawG.startsWith('masc') || rawG.startsWith('boy')) gender = 'm';
    else if (rawG === 'f' || rawG.startsWith('femin') || rawG.startsWith('girl') || rawG.startsWith('fe')) gender = 'f';
    if (!gender) {
      const n = norm(cat.name || '');
      if (/masculin|masculine|boys|\bm\b/.test(n) && !/femin/.test(n)) gender = 'm';
      else if (/femin|feminine|girls|\bf\b/.test(n)) gender = 'f';
    }

    // Division — explicit field; null/none/aucune = single-division
    let division = cat.division;
    if (!division || division === 'none' || division === 'aucune') {
      // check name fallback for legacy cats
      const n = norm(cat.name || '');
      if (/diamond/.test(n)) division = 'diamond';
      else if (/gold/.test(n)) division = 'gold';
      else division = null;
    }

    // Age group — explicit `age` field ("Benjamin", "Cadet", "Juvénile") or name fallback
    const ageSource = norm(cat.age || cat.ageLabel || cat.name || '');
    let ageName = null, ageLabel = null, ageNum = 50;
    if (/benjamin/.test(ageSource)) { ageName = 'benjamin'; ageLabel = 'Benjamin'; ageNum = 1; }
    else if (/cadet/.test(ageSource)) { ageName = 'cadet'; ageLabel = 'Cadet'; ageNum = 2; }
    else if (/juven/.test(ageSource)) { ageName = 'juvenil'; ageLabel = 'Juvénile'; ageNum = 3; }
    else {
      const raw = cat.age || cat.ageLabel || cat.name || '';
      const m = raw.match(/U\d+|Mini|Grad|Open/i);
      ageLabel = m ? m[0].replace(/^u/i, 'U') : (raw || null);
      ageName = ageLabel ? ageLabel.toLowerCase().replace(/[^a-z0-9]/g, '') : null;
      const numMatch = (ageLabel || '').match(/\d+/);
      ageNum = numMatch ? parseInt(numMatch[0]) : (/mini/i.test(raw) ? 5 : (/grad/i.test(raw) ? 99 : 50));
    }

    return { gender, division, ageName, ageLabel, ageNum };
  }

  const enrichedCats = useMemo(() => effectiveCats.map(c => ({ ...c, ...parseCatMeta(c) })),
    [effectiveCats]); // eslint-disable-line react-hooks/exhaustive-deps
  const initUrl = useMemo(readUrlState, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [showExplorer, setShowExplorer] = useState(!!initUrl.cat || !!initUrl.g);
  const [selectedCat, setSelectedCat]   = useState(initUrl.cat);
  const [activeTab, setActiveTab]       = useState(initUrl.tab);
  const [catSearch, setCatSearch]       = useState('');
  const [pickerGender, setPickerGender] = useState(initUrl.g);
  const [pickerAge, setPickerAge]       = useState(initUrl.age);
  const [pickerDiv, setPickerDiv]       = useState(initUrl.div);
  const catMatch = (catId) => selectedCat === '__all__' || catId === selectedCat;

  // ── Sliding tab indicator ─────────────────────────────────
  const tabsRef = useRef(null);
  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return;
    const active = container.querySelector('.header-tab.active');
    if (!active) return;
    const cr = active.getBoundingClientRect();
    const pr = container.getBoundingClientRect();
    container.style.setProperty('--tab-left', (cr.left - pr.left) + 'px');
    container.style.setProperty('--tab-width', cr.width + 'px');
  }, [activeTab, selectedCat]);

  // ── Scroll-driven photo dimming (home only) ───────────────
  const dimRef = useRef(null);
  useEffect(() => {
    const dim = dimRef.current;
    if (!dim) return; // dim div not mounted — not home mode

    let raf = null;

    // Compute breakpoints from actual section positions
    const getBreakpoints = () => {
      const startY  = 0.15 * window.innerHeight;
      const cardsEl = document.querySelector('.landing-sec');
      const rawCardsY = cardsEl
        ? cardsEl.offsetTop + cardsEl.offsetHeight / 2 - window.innerHeight / 2
        : window.innerHeight * 0.8;
      const cardsY = Math.max(rawCardsY, startY + 1);
      const endY   = Math.max(document.body.scrollHeight - window.innerHeight, cardsY + 1);
      return { startY, cardsY, endY };
    };

    let bp = getBreakpoints();

    const update = () => {
      raf = null;
      const sy = window.scrollY;
      let opacity;
      if (sy <= bp.startY) {
        opacity = 0;
      } else if (sy < bp.cardsY) {
        opacity = 0.60 * (sy - bp.startY) / (bp.cardsY - bp.startY);
      } else if (sy <= bp.endY) {
        opacity = 0.60 + 0.15 * (sy - bp.cardsY) / (bp.endY - bp.cardsY);
      } else {
        opacity = 0.75;
      }
      dim.style.opacity = opacity;
    };

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onResize = () => { bp = getBreakpoints(); update(); };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    update(); // initial (handles back-navigation / already-scrolled state)

    // Re-sample after content settles (Firebase data may shift layout)
    const t = setTimeout(() => { bp = getBreakpoints(); update(); }, 500);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [showExplorer, selectedCat]); // re-run when home mode changes

  // ── All-Star hero parallax ──────────────────────────────
  useEffect(() => {
    if (selectedCat !== 'allstar') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = null;
    const hero = allstarHeroRef.current;
    if (!hero) return;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const y = Math.min(Math.max(-hero.getBoundingClientRect().top * 0.25, 0), 40);
        hero.style.setProperty('--parallax-y', `${y}px`);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [selectedCat]);

  // ── All-Star entrance: trigger reveal immediately on view open ──
  useEffect(() => {
    if (selectedCat !== 'allstar') return;
    const t = setTimeout(() => {
      document.querySelectorAll('.allstar-hero .reveal').forEach(el => el.classList.add('is-visible'));
    }, 80);
    return () => clearTimeout(t);
  }, [selectedCat]);

  const [sortKey, setSortKey]   = useState('rank');
  const [sortDir, setSortDir]   = useState('desc');
  const [openTeam, setOpenTeam] = useState(null);
  const [slideshowKey, setSlideshowKey] = useState(0);
  const handleSort = key => { if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSortKey(key); setSortDir('desc'); } };
  const thA = key => sortKey === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';
  const [statSortKey, setStatSortKey] = useState('ppg');
  const [statSortDir, setStatSortDir] = useState('desc');
  const handleStatSort = key => { if (statSortKey === key) setStatSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setStatSortKey(key); setStatSortDir('desc'); } };
  const thAS = key => statSortKey === key ? (statSortDir === 'desc' ? ' ↓' : ' ↑') : '';
  const standings = useMemo(() => {
    const src = TEAMS.filter(tm => catMatch(tm.categoryId));
    const rows = src.map(tm => ({ ...tm, pct: (tm.w + tm.l) > 0 ? tm.w / (tm.w + tm.l) : 0, gp: tm.w + tm.l, diff: (tm.pf || 0) - (tm.pa || 0) }));
    const dir = sortDir === 'asc' ? -1 : 1;
    if (sortKey === 'wins')  rows.sort((a, b) => dir * (b.w - a.w));
    else if (sortKey === 'pct')  rows.sort((a, b) => dir * (b.pct - a.pct));
    else if (sortKey === 'pf')   rows.sort((a, b) => dir * ((b.pf || 0) - (a.pf || 0)));
    else if (sortKey === 'pa')   rows.sort((a, b) => dir * ((b.pa || 0) - (a.pa || 0)));
    else if (sortKey === 'diff') rows.sort((a, b) => dir * (b.diff - a.diff));
    else if (sortKey === 'gp')   rows.sort((a, b) => dir * (b.gp - a.gp));
    else rows.sort((a, b) => dir * (b.pct - a.pct));
    return rows;
  }, [sortKey, sortDir, TEAMS, selectedCat]);

  const [schedFilter, setSchedFilter] = useState('all');
  const [schedTeam, setSchedTeam]     = useState('all');
  const [openGame, setOpenGame]       = useState(null);
  const catTeamNames = useMemo(() => new Set(TEAMS.filter(tm => catMatch(tm.categoryId)).map(tm => tm.name)), [TEAMS, selectedCat]);
  const games = useMemo(() => {
    let g = [...GAMES]
      .filter(x => catMatch(x.categoryId) || catTeamNames.has(x.home) || catTeamNames.has(x.away))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (schedFilter === 'upcoming') g = g.filter(x => x.hs === null);
    if (schedFilter === 'past') g = g.filter(x => x.hs !== null).reverse();
    if (schedTeam !== 'all') g = g.filter(x => x.home === schedTeam || x.away === schedTeam);
    return g;
  }, [schedFilter, schedTeam, GAMES, selectedCat, catTeamNames]);

  const [search, setSearch]               = useState('');
  const [fTier, setFTier]                 = useState('all');
  const [fTeam, setFTeam]                 = useState('all');
  const [fArch, setFArch]                 = useState('all');
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const archetypes = useMemo(() => {
    const seen = new Map();
    PLAYERS.forEach(p => { const a = p.arch && p.arch[lang]; if (a && !seen.has(a)) seen.set(a, a); });
    return Array.from(seen.keys()).sort();
  }, [PLAYERS, lang]);
  const players = useMemo(() => {
    let ps = [...PLAYERS]
      .filter(p => catMatch(p.categoryId) || catTeamNames.has(p.team))
      .sort((a, b) => (b.rp || 0) - (a.rp || 0) || TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
    if (search) { const ns = normalize(search); ps = ps.filter(p => normalize(p.name).includes(ns)); }
    if (fTier !== 'all') ps = ps.filter(p => p.tier === fTier);
    if (fTeam !== 'all') ps = ps.filter(p => p.team === fTeam);
    if (fArch !== 'all') ps = ps.filter(p => p.arch && p.arch[lang] === fArch);
    return ps;
  }, [search, fTier, fTeam, fArch, PLAYERS, lang, selectedCat, catTeamNames]);
  // Stable card numbers: sort all players by id string for a consistent order
  const cardIndexMap = useMemo(() => {
    const sorted = [...PLAYERS].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const m = new Map();
    sorted.forEach((p, i) => m.set(p.id, i + 1));
    return m;
  }, [PLAYERS]);
  const cardTotal = SET_TOTAL || PLAYERS.length;

  const anyPlayerFilter = !!search || fTier !== 'all' || fTeam !== 'all' || fArch !== 'all';
  const galleryOpen = showAllPlayers || anyPlayerFilter;
  const shownPlayers = galleryOpen ? players : players.slice(0, 5);

  const catPlayersSorted = useMemo(() => [...PLAYERS]
    .filter(p => catMatch(p.categoryId) || catTeamNames.has(p.team))
    .sort((a, b) => (b.rp || 0) - (a.rp || 0) || TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)),
    [PLAYERS, selectedCat, catTeamNames]);
  const top5Players = catPlayersSorted.slice(0, 5);
  const teamsInCat = useMemo(() => {
    const names = new Set(catPlayersSorted.map(p => p.team));
    return TEAMS.filter(tm => names.has(tm.name));
  }, [TEAMS, catPlayersSorted]);
  const teamPlayers = fTeam !== 'all' ? catPlayersSorted.filter(p => p.team === fTeam) : [];

  const inCat = (p, catId) => catId === '__all__' || p.categoryId === catId;
  const topByRp = (catId) => [...PLAYERS].filter(p => inCat(p, catId))
    .sort((a, b) => (b.rp || 0) - (a.rp || 0) || TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))[0] || null;
  const weekScore = (p) => {
    const cutoff = Date.now() - 7 * 86400000;
    return GAMES.reduce((s, g) => {
      if (!g.playerStats || g.playerStats[p.id] === undefined) return s;
      if (new Date((g.date || '1970') + 'T00:00').getTime() < cutoff) return s;
      const st = g.playerStats[p.id] || {};
      return s + (+st.points || 0) + (+st.rebounds || 0) * 0.7 + (+st.assists || 0) * 1.2 + (+st.steals || 0) * 1.5 + (+st.blocks || 0) * 1.5;
    }, 0);
  };
  const topOfWeek = (catId) => {
    const scored = PLAYERS.filter(p => inCat(p, catId)).map(p => ({ p, s: weekScore(p) }));
    if (scored.some(x => x.s > 0)) return scored.sort((a, b) => b.s - a.s)[0].p;
    return topByRp(catId);
  };
  const resolveSpotlight = (data, catId, computeFn) => {
    const ov = ((data && data.categories) || {})[catId];
    if (ov && ov.playerId) { const p = PLAYERS.find(x => String(x.id) === String(ov.playerId)); if (p) return p; }
    return computeFn(catId);
  };
  const potmData = (view.meta && view.meta.playOfTheMonth) || {};
  const potwData = (view.meta && view.meta.playerOfTheWeek) || {};
  const potmCards = useMemo(() => effectiveCats
    .map(c => ({ cat: c, player: resolveSpotlight(potmData, c.id, topByRp) }))
    .filter(x => x.player), [effectiveCats, PLAYERS, potmData]);
  const potwPlayer = selectedCat ? resolveSpotlight(potwData, selectedCat, topOfWeek) : null;


  const leaders = key => [...PLAYERS]
    .filter(p => catMatch(p.categoryId) || catTeamNames.has(p.team))
    .sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, 5);

  function scrollToPicker() {
    const el = document.getElementById('explorer');
    if (!el) return;
    const header = document.querySelector('.site-header');
    const offset = (header ? header.offsetHeight : 64) + 16;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - offset, behavior: 'smooth' });
  }

  // scroll to picker on direct URL load with ?g= or ?age= or ?div=
  useEffect(() => {
    if (initUrl.g || initUrl.age || initUrl.div) {
      const t = setTimeout(scrollToPicker, 350);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openExplorer = () => {
    setShowExplorer(true);
    setPickerGender(null);
    setPickerAge(null);
    setPickerDiv(null);
    history.pushState({ nls: 'explorer', g: null, age: null, div: null }, '', buildPickerUrl(null, null, null));
    setTimeout(scrollToPicker, 60);
  };

  function pickGender(g) {
    setPickerGender(g);
    setPickerAge(null);
    setPickerDiv(null);
    history.pushState({ nls: 'explorer', g, age: null, div: null }, '', buildPickerUrl(g, null, null));
    setTimeout(scrollToPicker, 40);
  }

  function pickAge(ageN) {
    const acs = enrichedCats.filter(c => c.gender === pickerGender && c.ageName === ageN);
    if (acs.length === 1) {
      selectCat(acs[0].id);
    } else {
      setPickerAge(ageN);
      setPickerDiv(null);
      history.pushState({ nls: 'explorer', g: pickerGender, age: ageN, div: null }, '', buildPickerUrl(pickerGender, ageN, null));
      setTimeout(scrollToPicker, 40);
    }
  }

  function pickDiv(div) {
    setPickerDiv(div);
    history.pushState({ nls: 'explorer', g: pickerGender, age: pickerAge, div }, '', buildPickerUrl(pickerGender, pickerAge, div));
    setTimeout(scrollToPicker, 40);
  }

  // Reset all navigation state to home (call doGoHome then push history, or call goHome directly)
  function doGoHome() {
    setAlertsOpen(false);
    setSelectedPlayer(null);
    setOpenGame(null);
    setOpenTeam(null);
    setShowExplorer(false);
    setSelectedCat(null);
    setActiveTab('standings');
    setCatSearch('');
    setSearch('');
    setFTier('all');
    setFTeam('all');
    setFArch('all');
    setSchedFilter('all');
    setSchedTeam('all');
    setShowAllPlayers(false);
    setPickerGender(null);
    setPickerAge(null);
    setPickerDiv(null);
    if (dimRef.current) dimRef.current.style.opacity = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.querySelectorAll('.reveal.is-visible').forEach(el => el.classList.remove('is-visible'));
    setSlideshowKey(k => k + 1);
  }

  function goHome() {
    doGoHome();
    const sp = new URLSearchParams();
    sp.set('league', String(LEAGUE_ID || ''));
    history.pushState({ nls: 'home' }, '', window.location.pathname + '?' + sp.toString());
  }

  // ── URL / navigation helpers ──────────────────────────────
  const didInitRef = useRef(false);

  // Resolve player/game from URL once data loads (handles old ?player=ID links)
  useEffect(() => {
    if (!PLAYERS.length || didInitRef.current) return;
    didInitRef.current = true;
    const sp = new URLSearchParams(window.location.search);
    const pid = sp.get('player') ? Number(sp.get('player')) : null;
    const gid = sp.get('game')   ? Number(sp.get('game'))   : null;
    if (pid) {
      const p = PLAYERS.find(pl => pl.id === pid);
      if (p) {
        if (!selectedCat) setSelectedCat(p.categoryId || effectiveCats[0]?.id || null);
        setSelectedPlayer(p);
      }
    }
    if (gid) {
      const g = GAMES.find(ga => ga.id === gid);
      if (g) setOpenGame(g);
    }
  }, [PLAYERS, GAMES]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync state from URL on browser back/forward
  useEffect(() => {
    const onPop = (e) => {
      if (e.state?.nls === 'home') {
        doGoHome();
        return;
      }
      if (e.state?.nls === 'explorer') {
        setSelectedCat(null);
        setActiveTab('standings');
        setShowExplorer(true);
        setSelectedPlayer(null);
        setOpenGame(null);
        setPickerGender(e.state.g || null);
        setPickerAge(e.state.age || null);
        setPickerDiv(e.state.div || null);
        return;
      }
      const s = readUrlState();
      setSelectedCat(s.cat);
      setShowExplorer(!!s.cat || !!s.g);
      setPickerGender(s.g || null);
      setPickerAge(s.age || null);
      setPickerDiv(s.div || null);
      setActiveTab(s.tab);
      setSelectedPlayer(s.playerId ? (PLAYERS.find(pl => pl.id === s.playerId) || null) : null);
      setOpenGame(s.gameId ? (GAMES.find(ga => ga.id === s.gameId) || null) : null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [PLAYERS, GAMES]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectCat(catId) {
    setSelectedCat(catId);
    setActiveTab('standings');
    setShowAllPlayers(false);
    history.pushState({}, '', buildPageUrl(catId, 'standings', null, null));
    setTimeout(() => {
      const target = catId === 'allstar' ? document.querySelector('.cat-header') : document.querySelector('.nav');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  function unselectCat() {
    setSelectedCat(null);
    setCatSearch('');
    setSchedTeam('all');
    setFTeam('all');
    setSearch('');
    history.pushState({ nls: 'explorer', g: pickerGender, age: pickerAge, div: pickerDiv }, '', buildPickerUrl(pickerGender, pickerAge, pickerDiv));
    setTimeout(scrollToPicker, 60);
  }

  function switchTab(tab) {
    setActiveTab(tab);
    history.replaceState({}, '', buildPageUrl(selectedCat, tab, null, null));
    const sectionId = { standings: 'classement', schedule: 'calendrier', players: 'joueurs', stats: 'statistiques' }[tab];
    setTimeout(() => {
      const el = sectionId ? document.getElementById(sectionId) : document.querySelector('.tab-pane');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  function openPlayerModal(player) {
    setSelectedPlayer(player);
    history.pushState({}, '', buildPageUrl(selectedCat, activeTab, player.id, null));
  }

  function closePlayerModal() {
    setSelectedPlayer(null);
    history.replaceState({}, '', buildPageUrl(selectedCat, activeTab, null, null));
  }

  function openGameModal(game) {
    setOpenGame(game);
    history.pushState({}, '', buildPageUrl(selectedCat, activeTab, null, game.id));
  }

  function closeGameModal() {
    setOpenGame(null);
    history.replaceState({}, '', buildPageUrl(selectedCat, activeTab, null, null));
  }

  useEffect(() => {
    if (!openGame) return;
    const onKey = e => { if (e.key === 'Escape') closeGameModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openGame]); // eslint-disable-line react-hooks/exhaustive-deps

  function footerNav(tab) {
    if (selectedCat) {
      switchTab(tab);
      setTimeout(() => { const nav = document.querySelector('.nav'); if (nav) nav.scrollIntoView({ behavior: 'smooth' }); }, 30);
    } else {
      openExplorer();
    }
  }

  const showcasePlayers = useMemo(() => {
    const ranked = [...PLAYERS].sort((a, b) => (b.rp || 0) - (a.rp || 0));
    const byCat = new Map();
    ranked.forEach(p => { const c = p.categoryId || '__none__'; if (!byCat.has(c)) byCat.set(c, p); });
    const picks = Array.from(byCat.values()).slice(0, 4);
    const ids = new Set(picks.map(p => p.id));
    for (const p of ranked) { if (picks.length >= 4) break; if (!ids.has(p.id)) { picks.push(p); ids.add(p.id); } }
    return picks;
  }, [PLAYERS]);

  // Before html2canvas: replace any broken <img> that's visible and failed to load
  // with the silhouette PNG so the photo zone is never empty in the export.
  async function swapBrokenImages(el) {
    const sil = getSilhouettePng();
    const swapped = [];
    for (const img of el.querySelectorAll('img')) {
      if (getComputedStyle(img).display === 'none') continue; // hidden by SafeImage while loading
      if (img.src.startsWith('data:')) continue;             // already a data URI (silhouette/logo)
      if (!img.complete || img.naturalWidth === 0) {
        const orig = img.src;
        img.src = sil;
        swapped.push({ img, orig });
        await new Promise(r => { img.onload = r; img.onerror = r; });
      }
    }
    return swapped;
  }

  function shareCard(p) {
    const modal = document.querySelector('.pmodal');
    const el = (modal && modal.querySelector(`#pcard-${p.id}`))
      || document.getElementById(`pcard-${p.id}`);
    if (!el) return;
    const holo = el.querySelector('.pc-holo');
    if (holo) holo.style.display = 'none';
    const cardW = el.getBoundingClientRect().width || 250;
    const scale = Math.max(3, Math.ceil(750 / cardW));
    swapBrokenImages(el).then(swapped => {
      html2canvas(el, { backgroundColor: null, scale, useCORS: true, allowTaint: false })
        .then(canvas => {
          swapped.forEach(({ img, orig }) => { img.src = orig; });
          if (holo) holo.style.display = '';
          const link = document.createElement('a');
          link.download = `${p.name.replace(/\s+/g, '-')}-NLS-card.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        })
        .catch(() => {
          swapped.forEach(({ img, orig }) => { img.src = orig; });
          if (holo) holo.style.display = '';
        });
    });
  }

  const [logoOk, setLogoOk] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [alertsOpen, setAlertsOpen] = useState(false);
  const [manageToken, setManageToken] = useState(null);
  const [manageAction, setManageAction] = useState(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const tok = sp.get('manage');
    const act = sp.get('action');
    if (tok) { setManageToken(tok); setManageAction(act || null); }
  }, []);

  const alertsActive = !!ps.alertsActive;
  const alertsTeams  = TEAMS.map(tm => ({ id: tm.id, name: tm.name }));
  const alertsCats   = effectiveCats.filter(c => c.id !== '__all__').map(c => ({ id: c.id, name: displayCatName(c.name, t) }));
  const leagueIdStr  = String(LEAGUE_ID || '');

  if (manageToken) return (
    <AlertsManage
      leagueId={leagueIdStr} token={manageToken} action={manageAction}
      lang={lang} t={t} teams={alertsTeams} categories={alertsCats}
    />
  );

  const isHome = !showExplorer && !selectedCat;

  return (
    <div className={isHome ? 'home-mode' : ''}>
      {/* ── SITE HEADER ── */}
      <div className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div className="site-header-inner">
          <button className="site-header-logo" onClick={goHome} aria-label="Accueil">
            {logoOk
              ? <img src={NLS_LOGO_WHITE} alt="NLS Création" onError={() => setLogoOk(false)} />
              : <span className="site-header-logo-fallback">NLS</span>}
          </button>
          <div className="header-tabs" ref={tabsRef}>
            {selectedCat && selectedCat !== 'allstar' && [
              ['standings', t.navStandings], ['schedule', t.navSchedule],
              ['players', t.navPlayers], ['stats', t.navStats],
            ].map(([k, label]) => (
              <button key={k} className={`header-tab${activeTab === k ? ' active' : ''}`} onClick={() => switchTab(k)}>{label}</button>
            ))}
          </div>
          <button className="alerts-trigger-btn" onClick={() => setAlertsOpen(true)} aria-label={t.alertsBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span>{t.alertsBtn}</span>
          </button>
          <div className="lang-toggle">
            <button className={lang === 'fr' ? 'active' : ''} onClick={() => setLang('fr')}>FR</button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
        </div>
      </div>

      {/* ── JOUEUR DU MOIS ticker ── */}
      {(ps.showPlayers !== false && ps.showPlayerCards !== false) && (() => {
        const validCards = potmCards.filter(x => (x.player.gp || 0) >= 1);
        if (!validCards.length) return null;
        return (
          <div className="potm-banner">
            <div className="potm-track">
              <span className="potm-label-inline">{t.potmTitle}</span>
              {validCards.map((x, i) => {
                const tColor = TIER_COLOR[x.player.tier] || 'var(--gold)';
                return (
                  <div key={i} className="potm-chip" onClick={() => openPlayerModal(x.player)}>
                    <div className="potm-chip-name" style={{ color: tColor }}>{x.player.name}</div>
                    {effectiveCats.length > 1 && <div className="potm-chip-cat">· {displayCatName(x.cat.name, t)}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── FIXED PHOTO LAYER (home only) ── */}
      {isHome && <HeroSlideshow key={slideshowKey} />}
      {isHome && <div className="hero-dim" ref={dimRef} aria-hidden="true" />}

      {/* ── HERO ── */}
      <header className="hero">
        {!isHome && <HeroVideo />}
        <div className="hero-scrim"></div>
        <div className="hero-fade-top"></div>
        <div className="hero-fade-bottom"></div>
        <div className="hero-inner">
          {logoOk
            ? <img className="hero-visual-logo" src={NLS_LOGO_WHITE} alt="NLS Création" />
            : null}
          <div className="hero-kicker">{t.kicker}</div>
          <h1 className="hero-title">{t.heroTitle}</h1>
          <p className="hero-sub">{t.heroSub}</p>
          <button className="hero-cta" style={{ border: 'none', cursor: 'pointer' }} onClick={openExplorer}>
            {t.cta} →
          </button>
        </div>
        <div ref={scrollCueRef} className="hero-scroll-cue" aria-hidden="true">
          <span className="chev" /><span className="chev" />
        </div>
      </header>

      {/* ── LOADING / ERROR overlays ── */}
      {live && data.loading && (
        <div className="skel-screen" aria-label={t.loadingLeague}>
          <div className="skel-header" />
          <div className="skel-hero">
            <div className="skel-bar skel-bar-md" />
            <div className="skel-bar skel-bar-lg" />
            <div className="skel-bar skel-bar-sm" style={{ marginTop: 8 }} />
          </div>
        </div>
      )}
      {live && data.error === 'not-found' && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 48, fontWeight: 900, marginBottom: 8, color: 'var(--gold)' }}>404</div>
            <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{t.notFound}</div>
          </div>
        </div>
      )}

      {/* ── LANDING (before explorer) ── */}
      {!showExplorer && (
        <>
          {(ps.showPlayers !== false && ps.showPlayerCards !== false) && showcasePlayers.length > 0 && (
            <section className="landing-sec reveal">
              <div className="text-halo">
                <div className="lsec-title">{t.showcaseTitle}</div>
                <div className="lsec-sub">{t.showcaseSub}</div>
              </div>
              <div className="arc-row">
                {showcasePlayers.map(p => (
                  <div key={p.id} className="arc-card">
                    <PlayerCard p={p} lang={lang} t={t} onOpen={openPlayerModal} teams={TEAMS} units={view.units} cardNumber={cardIndexMap.get(p.id)} cardTotal={cardTotal} />
                  </div>
                ))}
              </div>
            </section>
          )}


          <section className="landing-sec reveal">
            <div className="text-halo">
              <div className="sec-kicker">{lm.subtitle || t.missionSub}</div>
              <div className="lsec-title">{lm.title || t.missionTitle}</div>
              <div className="mission-body">
                {lm.body
                  ? lm.body.split('\n').map((para, i) => <React.Fragment key={i}>{i > 0 && <><br /><br /></>}{para}</React.Fragment>)
                  : t.missionP1}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── CATEGORY SELECTOR ── */}
      {showExplorer && !selectedCat && (() => {
        const genderCats = enrichedCats.filter(c => c.gender === pickerGender);
        // unique age groups for this gender, sorted
        const ageGroupMap = new Map();
        for (const c of genderCats) {
          if (c.ageName && !ageGroupMap.has(c.ageName))
            ageGroupMap.set(c.ageName, { ageName: c.ageName, ageLabel: c.ageLabel, ageNum: c.ageNum });
        }
        const ageGroups = [...ageGroupMap.values()].sort((a, b) => a.ageNum - b.ageNum);
        // cats for the selected age group (step 3 division)
        const ageCats = enrichedCats.filter(c => c.gender === pickerGender && c.ageName === pickerAge);
        const hasGold = ageCats.some(c => c.division === 'gold');
        const hasDiamond = ageCats.some(c => c.division === 'diamond');
        const genderLabel = pickerGender === 'm' ? t.pickerMale : t.pickerFemale;
        return (
          <section className="cat-selector" id="explorer">
            <svg className="cat-court-bg" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2">
              <rect x="10" y="10" width="580" height="380" rx="6"/>
              <line x1="300" y1="10" x2="300" y2="390"/>
              <circle cx="300" cy="200" r="65"/>
              <rect x="10" y="130" width="145" height="140"/>
              <circle cx="155" cy="200" r="55"/>
              <rect x="445" y="130" width="145" height="140"/>
              <circle cx="445" cy="200" r="55"/>
              <path d="M10,155 C90,155 210,110 210,200 C210,290 90,245 10,245"/>
              <path d="M590,155 C510,155 390,110 390,200 C390,290 510,245 590,245"/>
            </svg>

            {/* ── STEP 1: gender ── */}
            {!pickerGender && (
              <div className="picker-step" key="step-gender">
                <h2>{t.selectCat}</h2>
                <div className="cs-sub">{t.selectCatSub}</div>
                <div className="picker-tiles picker-tiles-3">
                  <button className="picker-tile picker-tile-m" onClick={() => pickGender('m')}>
                    <span className="picker-tile-name">{t.pickerMale}</span>
                  </button>
                  <button className="picker-tile picker-tile-f" onClick={() => pickGender('f')}>
                    <span className="picker-tile-name">{t.pickerFemale}</span>
                  </button>
                  {ps.showAllStar !== false && (
                    <button className="picker-tile picker-tile-allstar" onClick={() => selectCat('allstar')}>
                      <span className="picker-tile-badge">{t.allstarBadge}</span>
                      <span className="picker-tile-name">All-Star</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 2: age groups ── */}
            {pickerGender && !pickerAge && (
              <div className="picker-step" key={`step-age-${pickerGender}`}>
                <div className="picker-breadcrumb-row">
                  <div className="picker-breadcrumb">
                    <button className="picker-bc-item" onClick={() => pickGender(null)}>{t.breadcrumbCats}</button>
                    <span className="picker-bc-sep">›</span>
                    <span className="picker-bc-current">{genderLabel}</span>
                  </div>
                  <button className="picker-back-btn" onClick={() => pickGender(null)}>{t.backBtn}</button>
                </div>
                <h2>{t.selectAge}</h2>
                {ageGroups.length > 0 ? (
                  <div className="age-chip-grid">
                    {ageGroups.map(ag => {
                      const ageCatIds = new Set(genderCats.filter(c => c.ageName === ag.ageName).map(c => c.id));
                      const tc = TEAMS.filter(tm => ageCatIds.has(tm.categoryId)).length;
                      const empty = tc === 0;
                      return (
                        <button key={ag.ageName} className={`age-chip${empty ? ' age-chip-empty' : ''}`} onClick={() => !empty && pickAge(ag.ageName)} disabled={empty}>
                          <span className="age-chip-label">{ag.ageLabel}</span>
                          <span className="age-chip-sub">{empty ? t.comingSoon : `${tc} ${lang === 'fr' ? (tc === 1 ? 'équipe' : 'équipes') : (tc === 1 ? 'team' : 'teams')}`}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-note">{t.comingSoon}</div>
                )}
              </div>
            )}

            {/* ── STEP 3: division (only if >1 division for this gender+age) ── */}
            {pickerGender && pickerAge && !pickerDiv && (
              <div className="picker-step" key={`step-div-${pickerGender}-${pickerAge}`}>
                <div className="picker-breadcrumb-row">
                  <div className="picker-breadcrumb">
                    <button className="picker-bc-item" onClick={() => pickGender(null)}>{t.breadcrumbCats}</button>
                    <span className="picker-bc-sep">›</span>
                    <button className="picker-bc-item" onClick={() => { setPickerAge(null); setPickerDiv(null); history.pushState({ nls: 'explorer', g: pickerGender, age: null, div: null }, '', buildPickerUrl(pickerGender, null, null)); setTimeout(scrollToPicker, 40); }}>{genderLabel}</button>
                    <span className="picker-bc-sep">›</span>
                    <span className="picker-bc-current">{ageCats[0]?.ageLabel || pickerAge}</span>
                  </div>
                  <button className="picker-back-btn" onClick={() => { setPickerAge(null); setPickerDiv(null); history.pushState({ nls: 'explorer', g: pickerGender, age: null, div: null }, '', buildPickerUrl(pickerGender, null, null)); setTimeout(scrollToPicker, 40); }}>{t.backBtn}</button>
                </div>
                <h2>{t.selectDivision}</h2>
                <div className="picker-tiles picker-tiles-2">
                  <button className={`picker-tile picker-tile-gold${!hasGold ? ' picker-tile-soon' : ''}`} onClick={() => hasGold && pickDiv('gold')}>
                    {!hasGold && <span className="picker-tile-badge">{t.comingSoon}</span>}
                    <span className="picker-tile-division-icon">◆</span>
                    <span className="picker-tile-name">GOLD</span>
                  </button>
                  <button className={`picker-tile picker-tile-diamond${!hasDiamond ? ' picker-tile-soon' : ''}`} onClick={() => hasDiamond && pickDiv('diamond')}>
                    {!hasDiamond && <span className="picker-tile-badge">{t.comingSoon}</span>}
                    <span className="picker-tile-division-icon">◆</span>
                    <span className="picker-tile-name">DIAMOND</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })()}

      {/* ── CATEGORY HEADER + TAB NAV ── */}
      {selectedCat && (() => {
        const isAllStar = selectedCat === 'allstar';
        const catName = isAllStar ? t.allstarTitle : displayCatName((effectiveCats.find(c => c.id === selectedCat) || {}).name || '', t);
        const tabs = isAllStar ? [] : [
          ps.showStandings !== false && ['standings', t.navStandings, lang === 'fr' ? 'Rang' : 'Stands'],
          ps.showSchedule !== false && ['schedule', t.navSchedule, lang === 'fr' ? 'Calend.' : 'Sched.'],
          (ps.showPlayers !== false && ps.showPlayerCards !== false) && ['players', t.navPlayers],
          ps.showStats !== false && ['stats', t.navStats, 'Stats'],
        ].filter(Boolean);
        return (
          <>
            <div className="cat-header">
              <div className="cat-header-inner">
                <div className="cat-header-title">{catName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button className="alerts-trigger-btn" onClick={() => setAlertsOpen(true)} aria-label={t.alertsBtn}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <span>{t.alertsBtn}</span>
                  </button>
                  <button className="cat-change" onClick={unselectCat}>{t.changeCat}</button>
                </div>
              </div>
            </div>
            {tabs.length > 0 && (
            <nav className="nav">
              {tabs.map(([k, label, short]) => (
                <a key={k} className={activeTab === k ? 'active' : ''} style={{ cursor: 'pointer' }} onClick={() => switchTab(k)}>
                  {short ? <><span className="nav-full">{label}</span><span className="nav-short">{short}</span></> : label}
                </a>
              ))}
            </nav>
            )}
          </>
        );
      })()}

      {/* ── ALL-STAR VIEW ── */}
      {selectedCat === 'allstar' && (
        <div className="allstar-view" ref={allstarHeroRef}>
          <div className="allstar-hero">
            {/* Photos — background layer */}
            <div className="allstar-hero-photos" aria-hidden="true">
              <div className="allstar-hp reveal" style={{ '--as-delay': '0ms' }}>
                <div className="allstar-hp-inner"><img src="/images/allstar/allstar-1.webp" alt="" width="400" height="600" /></div>
              </div>
              <div className="allstar-hp reveal" style={{ '--as-delay': '150ms' }}>
                <div className="allstar-hp-inner"><img src="/images/allstar/allstar-2.webp" alt="" width="400" height="600" /></div>
              </div>
              <div className="allstar-hp reveal" style={{ '--as-delay': '300ms' }}>
                <div className="allstar-hp-inner"><img src="/images/allstar/allstar-3.webp" alt="" width="400" height="600" /></div>
              </div>
            </div>
            {/* Overlays */}
            <div className="allstar-hero-ov" aria-hidden="true" />
            {/* Text — on top */}
            <div className="allstar-hero-text">
              <div className="allstar-kicker reveal" style={{ '--as-delay': '500ms' }}>{t.allstarKicker}</div>
              <div className="allstar-title reveal" style={{ '--as-delay': '600ms' }}>{t.allstarTitle}<span className="allstar-shine" aria-hidden="true" /></div>
              <div className="allstar-sub reveal" style={{ '--as-delay': '700ms' }}>{t.allstarSub}</div>
              <div className="allstar-badge reveal" style={{ '--as-delay': '800ms' }}>{t.allstarBadge}</div>
              <div className="allstar-vote reveal" style={{ '--as-delay': '900ms' }}>{t.allstarVote}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── STANDINGS ── */}
      {selectedCat && selectedCat !== 'allstar' && activeTab === 'standings' && ps.showStandings !== false && (
      <section className="section tab-pane" id="classement">
        <div className="sec-kicker">{t.standingsKicker}</div>
        <div className="standings-card">
          <div className="standings-scroll">
          <table className="standings-table">
            <thead>
              <tr>
                <th>{t.thRank}</th>
                <th className="td-team-sticky">{t.thTeam}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('wins')}>{t.thRecord}{thA('wins')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('diff')}>{t.thDiff}{thA('diff')}</th>
                <th className="hide-m" style={{ cursor: 'pointer' }} onClick={() => handleSort('pct')}>{t.thPct}{thA('pct')}</th>
                <th className="hide-m" style={{ cursor: 'pointer' }} onClick={() => handleSort('gp')}>{t.thGP}{thA('gp')}</th>
                <th className="hide-m" style={{ cursor: 'pointer' }} onClick={() => handleSort('pf')}>{t.thPF}{thA('pf')}</th>
                <th className="hide-m" style={{ cursor: 'pointer' }} onClick={() => handleSort('pa')}>{t.thPA}{thA('pa')}</th>
                <th className="hide-m">{t.thLast5}</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((tm, i) => (
                <React.Fragment key={tm.id}>
                  <tr className={i === 0 ? 'rank-first-row' : ''} style={{ cursor: 'pointer' }} onClick={() => setOpenTeam(openTeam === tm.id ? null : tm.id)}>
                    <td><span className={`rank-badge rank-${i + 1}`}>{i + 1}</span></td>
                    <td className="td-team-sticky">
                      <div className="team-cell">
                        <div className="team-logo-sq" style={{ background: (tm.color || '#C9A24A') + '22', overflow: 'hidden' }}>
                          <SafeImage
                            src={tm.logoUrl}
                            alt={tm.name}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
                            fallback={<TeamInitials name={tm.name} color={tm.color} size={28} />}
                          />
                        </div>
                        <span>{tm.name}</span>
                        <span className={`standings-chev${openTeam === tm.id ? ' open' : ''}`}>›</span>
                      </div>
                    </td>
                                        <td style={{ fontWeight: 700 }}><span data-count={tm.w}>{tm.w}</span>–<span data-count={tm.l}>{tm.l}</span></td>
                    <td style={{ fontWeight: 700, color: tm.diff > 0 ? '#34d27b' : tm.diff < 0 ? '#e05555' : 'var(--ink-mid)', fontVariantNumeric: 'tabular-nums' }}>{tm.diff > 0 ? '+' : ''}{tm.diff}</td>
                    <td className="hide-m" style={{ color: 'var(--ink-mid)' }}>{fmtN(tm.pct * 100, lang)}{lang === 'fr' ? ' %' : '%'}</td>
                    <td className="hide-m" style={{ color: 'var(--ink-mid)', fontVariantNumeric: 'tabular-nums' }}>{tm.gp}</td>
                    <td className="hide-m" style={{ color: 'var(--ink-mid)', fontVariantNumeric: 'tabular-nums' }}>{tm.pf || 0}</td>
                    <td className="hide-m" style={{ color: 'var(--ink-mid)', fontVariantNumeric: 'tabular-nums' }}>{tm.pa || 0}</td>
                    <td className="hide-m">
                      <div className="last5">{(tm.last5 || []).map((r, j) => <span key={j} className={`l5-chip ${r ? 'l5-w' : 'l5-l'}`}>{r ? t.l5W : t.l5L}</span>)}</div>
                    </td>
                  </tr>
                  {openTeam === tm.id && (
                    <tr className="roster-row">
                      <td colSpan="9">
                        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 10 }}>{t.roster}</div>
                        <div className="roster-chips">
                          {PLAYERS.filter(p => p.team === tm.name).map(p => (
                            <span key={p.id} className="roster-chip"><b>{p.name}</b> · {p.pos} · {fmtN(p.ppg, lang)} {t.ppg}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>
      )}

      {/* ── SCHEDULE ── */}
      {selectedCat && selectedCat !== 'allstar' && activeTab === 'schedule' && ps.showSchedule !== false && (
      <section className="section tab-pane" id="calendrier">
        <div className="sec-kicker">{t.schedKicker}</div>
        <div className="sched-filters">
          {[['all', t.fAll], ['upcoming', t.fUpcoming], ['past', t.fPast]].map(([k, l]) => (
            <button key={k} className={`chip-btn ${schedFilter === k ? 'active' : ''}`} onClick={() => setSchedFilter(k)}>{l}</button>
          ))}
          <select className="filter-select" value={schedTeam} onChange={e => setSchedTeam(e.target.value)}>
            <option value="all">{t.allTeams}</option>
            {TEAMS.filter(tm => catMatch(tm.categoryId)).map(tm => <option key={tm.id} value={tm.name}>{tm.name}</option>)}
          </select>
        </div>
        {(() => {
          if (!games.length) return <div className="empty-note">{schedFilter === 'upcoming' ? t.noUpcoming : '—'}</div>;
          const nextGameId = (() => {
            const upcoming = games.filter(g => g.hs === null);
            if (!upcoming.length) return null;
            return [...upcoming].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0]?.id;
          })();
          const grouped = [];
          const dateMap = new Map();
          for (const g of games) {
            if (!dateMap.has(g.date)) { dateMap.set(g.date, []); grouped.push({ date: g.date, items: dateMap.get(g.date) }); }
            dateMap.get(g.date).push(g);
          }
          return grouped.map(({ date, items }) => (
            <div key={date}>
              <div className="date-group-header">{fmtDateHeader(date, lang)}</div>
              <div className="games-grid">
                {items.map(g => {
                  const played = g.hs !== null;
                  const homeTeam = TEAMS.find(tm => tm.name === g.home), awayTeam = TEAMS.find(tm => tm.name === g.away);
                  return (
                    <div key={g.id} className={`game-card${played ? ' played' : ' upcoming'}`} onClick={() => openGameModal(g)}>
                      {g.id === nextGameId && <div className="next-game-badge">{t.nextGame}</div>}
                      <div className="game-date">
                        <span>{fmtDate(g.date, lang)} · {g.time}</span>
                        <span className={`game-pill${played ? ' pill-final' : ' pill-upcoming'}`}>{played ? t.final : t.upcoming}</span>
                      </div>
                      <div className="game-matchup">
                        <div className="game-team">
                          <div className="game-team-info"><TeamBadge team={awayTeam} size={24} />{g.away}</div>
                          {played && <span className={`game-score ${g.as > g.hs ? 'winner' : 'loser'}`}>{g.as}</span>}
                        </div>
                        <div className="game-team">
                          <div className="game-team-info"><TeamBadge team={homeTeam} size={24} />{g.home}</div>
                          {played && <span className={`game-score ${g.hs > g.as ? 'winner' : 'loser'}`}>{g.hs}</span>}
                        </div>
                      </div>
                      {g.venue && <div className="game-venue"><span>📍 {g.venue}</span></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ));
        })()}
      </section>
      )}

      {/* ── PLAYERS ── */}
      {selectedCat && selectedCat !== 'allstar' && activeTab === 'players' && ps.showPlayers !== false && ps.showPlayerCards !== false && (
      <section className="section tab-pane" id="joueurs">
        <div className="sec-kicker">{t.playersKicker}</div>

        {(() => {
          const pmPlayer = resolveSpotlight(potmData, selectedCat, topByRp);
          if (!pmPlayer || (pmPlayer.gp || 0) < 1) return null;
          return (
            <div style={{ marginBottom: 40 }}>
              <div className="sec-kicker">{t.potmTitle}</div>
              <div className="lsec-sub" style={{ textAlign: 'left', margin: '0 0 14px' }}>{t.potmSub}</div>
              <div className="potm-card-wrap">
                <PlayerCard p={pmPlayer} lang={lang} t={t} onOpen={openPlayerModal} teams={TEAMS} units={view.units} cardNumber={cardIndexMap.get(pmPlayer.id)} cardTotal={cardTotal} />
              </div>
            </div>
          );
        })()}

        {(() => {
          const pmPlayer = resolveSpotlight(potmData, selectedCat, topByRp);
          const pmId = pmPlayer && (pmPlayer.gp || 0) >= 1 ? pmPlayer.id : null;
          const ns = normalize(search);
          const filterActive = !!ns || fTeam !== 'all';
          const gridPlayers = PLAYERS.filter(p => {
            if (!catTeamNames.has(p.team)) return false;
            if (!filterActive && p.id === pmId) return false;
            if (fTeam !== 'all' && p.team !== fTeam) return false;
            if (ns && !normalize(p.name).includes(ns)) return false;
            return true;
          });
          return (
            <>
              <div className="player-filters" style={{ marginBottom: 20 }}>
                <input className="inp search-inp" type="text" placeholder={t.searchPh} value={search} onChange={e => setSearch(e.target.value)} />
                {teamsInCat.length > 0 && (
                  <select className="filter-select" value={fTeam} onChange={e => setFTeam(e.target.value)}>
                    <option value="all">{t.selectTeamPh}</option>
                    {teamsInCat.map(tm => <option key={tm.id} value={tm.name}>{tm.name}</option>)}
                  </select>
                )}
              </div>
              {gridPlayers.length > 0 ? (
                <div className="cards-grid">
                  {gridPlayers.map(p => <PlayerCard key={p.id} p={p} lang={lang} t={t} onOpen={openPlayerModal} teams={TEAMS} units={view.units} cardNumber={cardIndexMap.get(p.id)} cardTotal={cardTotal} />)}
                </div>
              ) : (
                <div className="empty-note">{t.noPlayersFound}</div>
              )}
            </>
          );
        })()}
      </section>
      )}

      {/* ── STATS ── */}
      {selectedCat && selectedCat !== 'allstar' && activeTab === 'stats' && ps.showStats !== false && (
      <section className="section tab-pane" id="statistiques">
        <div className="sec-kicker">{t.statsKicker}</div>
        {(() => {
          const statPlayers = [...PLAYERS]
            .filter(p => (catMatch(p.categoryId) || catTeamNames.has(p.team)) && (p.gp || 0) >= 1);
          if (!statPlayers.length) return <div className="empty-note">{t.noStatsYet}</div>;
          const leaders5 = key => [...statPlayers].sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, 5);
          const statCols = [
            ['ppg', t.ppg], ['rpg', t.rpg], ['apg', t.apg],
            ...(statPlayers.some(p => (p.spg || 0) > 0) ? [['spg', t.spg]] : []),
            ...(statPlayers.some(p => (p.bpg || 0) > 0) ? [['bpg', t.bpg]] : []),
          ];
          const dir = statSortDir === 'asc' ? -1 : 1;
          const sortedPlayers = [...statPlayers].sort((a, b) => {
            if (statSortKey === 'name') return dir * (a.name || '').localeCompare(b.name || '');
            return dir * (Number(b[statSortKey] || 0) - Number(a[statSortKey] || 0));
          });
          return (
            <>
              <div className="leaders-grid">
                {[
                  ['ppg', t.topScorers], ['rpg', t.topRebounders], ['apg', t.topPlaymakers],
                  ...(statPlayers.some(p => (p.spg || 0) > 0) ? [['spg', t.topSteals]] : []),
                  ...(statPlayers.some(p => (p.bpg || 0) > 0) ? [['bpg', t.topBlocks]] : []),
                ].map(([key, title]) => {
                  const top = leaders5(key);
                  if (!top.length) return null;
                  const max = top[0][key] || 1;
                  return (
                    <div key={key} className="leader-card">
                      <div className="leader-title">{title}</div>
                      {top.map((p, i) => (
                        <div key={p.id} className="leader-row" style={{ cursor: 'pointer' }} onClick={() => openPlayerModal(p)}>
                          <span className="leader-rank">{i + 1}</span>
                          <div className="leader-info">
                            <div className="leader-name">{p.name}</div>
                            <div className="leader-team">{p.team}</div>
                            {(p[key] || 0) > 0 && <div className="leader-bar"><div className="leader-bar-fill" style={{ '--target-w': ((p[key] || 0) / max * 100) + '%' }}></div></div>}
                          </div>
                          <span className="leader-val" data-count={(p[key] || 0).toFixed(1)}>{fmtN(p[key] || 0, lang)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              <div className="stats-table-wrap">
                <div className="standings-scroll">
                  <table className="standings-table stats-table">
                    <thead>
                      <tr>
                        <th className="td-team-sticky" style={{ cursor: 'pointer' }} onClick={() => handleStatSort('name')}>{t.playerCol}{thAS('name')}</th>
                        <th>{t.thTeam}</th>
                        <th style={{ cursor: 'pointer' }} onClick={() => handleStatSort('gp')}>{t.gp}{thAS('gp')}</th>
                        {statCols.map(([k, label]) => (
                          <th key={k} style={{ cursor: 'pointer' }} onClick={() => handleStatSort(k)}>{label}{thAS(k)}</th>
                        ))}
                        {statPlayers.some(p => (p.fgPct || 0) > 0) && <th style={{ cursor: 'pointer' }} onClick={() => handleStatSort('fgPct')}>{t.fgPct}{thAS('fgPct')}</th>}
                        {statPlayers.some(p => (p.ftPct || 0) > 0) && <th style={{ cursor: 'pointer' }} onClick={() => handleStatSort('ftPct')}>{t.ftPct}{thAS('ftPct')}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPlayers.map(p => (
                        <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openPlayerModal(p)}>
                          <td className="td-team-sticky" style={{ fontWeight: 700 }}>{p.name}</td>
                          <td style={{ color: 'var(--ink-mid)', whiteSpace: 'nowrap' }}>{p.team}</td>
                          <td style={{ color: 'var(--ink-mid)' }}>{p.gp || 0}</td>
                          {statCols.map(([k]) => (
                            <td key={k} style={{ fontVariantNumeric: 'tabular-nums' }}><span data-count={(+(p[k] || 0)).toFixed(1)}>{fmtN(p[k] || 0, lang)}</span></td>
                          ))}
                          {statPlayers.some(q => (q.fgPct || 0) > 0) && <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-mid)' }}>{(p.fgPct || 0) > 0 ? fmtN(p.fgPct, lang) + (lang === 'fr' ? ' %' : '%') : '—'}</td>}
                          {statPlayers.some(q => (q.ftPct || 0) > 0) && <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-mid)' }}>{(p.ftPct || 0) > 0 ? fmtN(p.ftPct, lang) + (lang === 'fr' ? ' %' : '%') : '—'}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          );
        })()}
      </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-col footer-col--brand">
            <img className="footer-logo" src={NLS_LOGO_WHITE} alt="NLS Création" />
            <p className="footer-tagline">{t.footerAbout}</p>
            <a className="footer-ig" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              {INSTAGRAM_HANDLE}
            </a>
          </div>
          <div className="footer-col">
            <h4>{t.footerLeague}</h4>
            <a href="#" onClick={e => { e.preventDefault(); footerNav('standings'); }}>{t.navStandings}</a>
            <a href="#" onClick={e => { e.preventDefault(); footerNav('schedule'); }}>{t.navSchedule}</a>
            <a href="#" onClick={e => { e.preventDefault(); footerNav('players'); }}>{t.navPlayers}</a>
            <a href="#" onClick={e => { e.preventDefault(); footerNav('stats'); }}>{t.navStats}</a>
          </div>
          <div className="footer-col">
            <h4>{t.footerRegistration}</h4>
            <a href={REGISTRATION_URL} target="_blank" rel="noopener noreferrer">{t.footerRegisterLink}</a>
          </div>
          <div className="footer-col">
            <h4>NLS CRÉATION</h4>
            <a href={TEAM_SHOP_URL} target="_blank" rel="noopener noreferrer">{t.footerTeamShop}</a>
            <a href={UNIFORM_QUOTE_URL} target="_blank" rel="noopener noreferrer">{t.footerQuote}</a>
            <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">{t.footerMainSite}</a>
            {CONTACT_EMAIL !== 'contact@example.com' && (
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} NLS Création · {t.footerPowered} League Hunter</span>
        </div>
      </footer>

      {/* ── PLAYER MODAL ── */}
      {selectedPlayer && (
        <PlayerModal p={selectedPlayer} teams={TEAMS} units={view.units} lang={lang} t={t} games={GAMES} onShare={shareCard} onClose={closePlayerModal} cardNumber={cardIndexMap.get(selectedPlayer.id)} cardTotal={cardTotal} />
      )}

      {/* ── GAME MODAL ── */}
      {openGame && (() => {
        const g = openGame;
        const played = g.hs !== null;
        const homeTeam = TEAMS.find(tm => tm.name === g.home), awayTeam = TEAMS.find(tm => tm.name === g.away);
        return (
          <div className="modal-ov" onClick={e => { if (e.target.classList.contains('modal-ov')) closeGameModal(); }}>
            <div className="modal-bx">
              <button className="modal-close" onClick={closeGameModal}>✕</button>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 18 }}>
                {fmtDate(g.date, lang)} · {g.time} — {played ? t.final : t.upcoming}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 16, margin: '22px 0' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 38, display: 'flex', justifyContent: 'center' }}><TeamBadge team={awayTeam} size={44} /></div>
                  <div style={{ fontWeight: 800, marginTop: 8, fontSize: 14 }}>{g.away}</div>
                  {played && <div style={{ fontFamily: 'var(--ff-display)', fontSize: 42, marginTop: 6, color: g.as > g.hs ? 'var(--gold)' : 'var(--ink-soft)' }}>{g.as}</div>}
                </div>
                <div style={{ fontFamily: 'var(--ff-display)', fontSize: 18, color: 'var(--ink-soft)' }}>VS</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 38, display: 'flex', justifyContent: 'center' }}><TeamBadge team={homeTeam} size={44} /></div>
                  <div style={{ fontWeight: 800, marginTop: 8, fontSize: 14 }}>{g.home}</div>
                  {played && <div style={{ fontFamily: 'var(--ff-display)', fontSize: 42, marginTop: 6, color: g.hs > g.as ? 'var(--gold)' : 'var(--ink-soft)' }}>{g.hs}</div>}
                </div>
              </div>
              {g.venue && (
                <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-soft)', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  📍 {t.venue}: {g.venue}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── ALERTS MODAL (dormant = bientôt; active = real form) ── */}
      {alertsOpen && !alertsActive && (
        <div className="modal-ov alerts-modal-ov" onClick={e => { if (e.target.classList.contains('modal-ov')) setAlertsOpen(false); }}>
          <div className="modal-bx alerts-modal-bx" role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => setAlertsOpen(false)} aria-label="Fermer">✕</button>
            <div className="alerts-kicker" aria-hidden="true">{t.alertsKicker}</div>
            <h2 className="alerts-title" style={{ fontSize: 'clamp(18px,4vw,24px)' }}>
              {lang === 'fr' ? 'Bientôt disponible' : 'Coming soon'}
            </h2>
            <p className="alerts-sub">
              {lang === 'fr'
                ? 'Bientôt, reçois les rappels de matchs, les résultats et les changements d\'horaire directement dans ta boîte courriel.'
                : 'Soon, get game reminders, scores and schedule changes directly in your inbox.'}
            </p>
          </div>
        </div>
      )}
      {alertsOpen && alertsActive && (
        <AlertsModal
          leagueId={leagueIdStr} lang={lang} t={t}
          teams={alertsTeams} categories={alertsCats}
          onClose={() => setAlertsOpen(false)}
        />
      )}
    </div>
  );
}
