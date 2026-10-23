import { initializeApp } from 'firebase/app';
import {
  getFirestore, doc, getDoc, collection, getDocs, onSnapshot, setDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyDfMttfJLMvEW-LB3TIkFgebR5Cb7-1Wi4',
  authDomain:        'league-hunter.firebaseapp.com',
  projectId:         'league-hunter',
  storageBucket:     'league-hunter.firebasestorage.app',
  messagingSenderId: '356722740419',
  appId:             '1:356722740419:web:59e10cb552f5f4fa02e676',
};

// nlsshowcases.com is the NLS-only domain: load the NLS league without ?league=
export const NLS_LEAGUE_ID = '1781288565754';
export const IS_NLS_DOMAIN = /(^|\.)nlsshowcases\.com$/i.test(window.location.hostname);
export const LEAGUE_ID = new URLSearchParams(window.location.search).get('league')
  || (IS_NLS_DOMAIN ? NLS_LEAGUE_ID : null);

// Link back to the public site. On nlsshowcases.com: clean "/" URL (no ?league=).
export function siteUrl(extra = {}) {
  const params = new URLSearchParams();
  if (!IS_NLS_DOMAIN && LEAGUE_ID) params.set('league', LEAGUE_ID);
  for (const [k, v] of Object.entries(extra)) if (v != null) params.set(k, v);
  const qs = params.toString();
  const path = IS_NLS_DOMAIN ? '/' : window.location.pathname;
  return path + (qs ? '?' + qs : '');
}

let db = null;
if (LEAGUE_ID) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export { db, doc, getDoc, collection, getDocs, onSnapshot, setDoc };
