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

export const LEAGUE_ID = new URLSearchParams(window.location.search).get('league');

let db = null;
if (LEAGUE_ID) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export { db, doc, getDoc, collection, getDocs, onSnapshot, setDoc };
