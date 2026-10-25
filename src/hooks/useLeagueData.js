import { useState, useEffect } from 'react';
import { db, LEAGUE_ID, doc, collection, onSnapshot } from '../lib/firebase.js';

export function useLeagueData() {
  const [meta, setMeta]       = useState(null);
  const [teams, setTeams]     = useState([]);
  const [players, setPlayers] = useState([]);
  const [games, setGames]     = useState([]);
  const [loading, setLoading] = useState(!!LEAGUE_ID);
  const [error, setError]     = useState(null);
  // Switch « Alertes actives » de Website X (même doc que les Cloud Functions)
  const [alertsActive, setAlertsActive] = useState(false);

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
        // Optimisation lectures : si le doc du match contient statsMap (copie des stats faite par Website X),
        // on l'utilise directement → pas d'écoute de la sous-collection playerStats (1 lecture au lieu de ~20).
        const hasMap = d => { const m = d.data().statsMap; return m && typeof m === 'object'; };
        setGames(prev => snap.docs.map(d => {
          const data = d.data();
          if (hasMap(d)) return { id: d.id, ...data, playerStats: data.statsMap };
          const existing = prev.find(g => String(g.id) === d.id);
          return { id: d.id, ...data, playerStats: (existing && existing.playerStats) || {} };
        }));
        const ids = new Set(snap.docs.filter(d => !hasMap(d)).map(d => d.id));
        for (const [gid, u] of psUnsubs.entries()) {
          if (!ids.has(gid)) { u(); psUnsubs.delete(gid); }
        }
        snap.docs.forEach(d => {
          const gid = d.id;
          if (hasMap(d)) return; // stats déjà dans le doc du match
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

  return { live: !!LEAGUE_ID, meta, alertsActive, teams, players, games, loading, error };
}
