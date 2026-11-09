import { useState, useEffect } from 'react';
import { db, LEAGUE_ID, doc, collection, onSnapshot } from '../lib/firebase.js';
import { monthKey } from '../lib/shares.js';

export function useLeagueData() {
  const [meta, setMeta]       = useState(null);
  const [teams, setTeams]     = useState([]);
  const [players, setPlayers] = useState([]);
  const [games, setGames]     = useState([]);
  const [loading, setLoading] = useState(!!LEAGUE_ID);
  const [error, setError]     = useState(null);
  // Switch « Alertes actives » de Website X (même doc que les Cloud Functions)
  const [alertsActive, setAlertsActive] = useState(false);
  const [cardShares, setCardShares] = useState({});

  // Mois courant (Toronto) — revérifié toutes les 5 min pour changer de doc au 1er du mois
  const [mk, setMk] = useState(() => monthKey());
  useEffect(() => {
    const id = setInterval(() => setMk(monthKey()), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Compteur de partages de cartes du mois courant (écrit par la Cloud Function nlsCardShare)
  useEffect(() => {
    if (!LEAGUE_ID || !db) return;
    setCardShares({});
    return onSnapshot(doc(db, 'leagues', String(LEAGUE_ID), 'meta', `cardShares-${mk}`),
      snap => setCardShares(snap.exists() ? (snap.data() || {}) : {}),
      err => console.error('[NLS] cardShares listen error:', err)
    );
  }, [mk]);

  useEffect(() => {
    if (!LEAGUE_ID || !db) return;
    let unsubs = [];
    const psUnsubs = new Map();
    const lid = String(LEAGUE_ID);

    unsubs.push(onSnapshot(doc(db, 'leagues', lid),
      snap => {
        if (!snap.exists()) { setError('not-found'); setLoading(false); return; }
        setMeta(snap.data()); setLoading(false);
      },
      err => { console.error('[NLS] League doc listen error:', err); setError('connection'); setLoading(false); }
    ));

    unsubs.push(onSnapshot(doc(db, 'leagues', lid, 'meta', 'publicSettings'),
      snap => setAlertsActive(snap.exists() && snap.data().alertsActive === true),
      err => console.error('[NLS] publicSettings listen error:', err)
    ));

    unsubs.push(onSnapshot(collection(db, 'leagues', lid, 'teams'),
      snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('[NLS] Teams listen error:', err)
    ));

    unsubs.push(onSnapshot(collection(db, 'leagues', lid, 'players'),
      snap => setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('[NLS] Players listen error:', err)
    ));

    unsubs.push(onSnapshot(collection(db, 'leagues', lid, 'games'),
      snap => {
        setGames(prev => snap.docs.map(d => {
          const existing = prev.find(g => String(g.id) === d.id);
          return { id: d.id, ...d.data(), playerStats: (existing && existing.playerStats) || {} };
        }));
        const ids = new Set(snap.docs.map(d => d.id));
        for (const [gid, u] of psUnsubs.entries()) {
          if (!ids.has(gid)) { u(); psUnsubs.delete(gid); }
        }
        snap.docs.forEach(d => {
          const gid = d.id;
          if (!psUnsubs.has(gid)) {
            psUnsubs.set(gid, onSnapshot(collection(db, 'leagues', lid, 'games', gid, 'playerStats'),
              psSnap => {
                const stats = {};
                psSnap.docs.forEach(ps => { stats[ps.id] = ps.data(); });
                setGames(prev => prev.map(g => String(g.id) === gid ? { ...g, playerStats: stats } : g));
              },
              err => console.error(`[NLS] PlayerStats listen error for game ${gid}:`, err)
            ));
          }
        });
      },
      err => console.error('[NLS] Games listen error:', err)
    ));

    return () => { unsubs.forEach(u => u()); psUnsubs.forEach(u => u()); };
  }, []);

  return { live: !!LEAGUE_ID, meta, alertsActive, cardShares, teams, players, games, loading, error };
}
