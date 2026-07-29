"use client";

import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

// Init Firebase client autonome, indépendante de @/lib/firebase/* (dossier
// non fourni par cette session, voir docs/STATE.md). Réutilise l'app par
// défaut si elle existe déjà (ex. initialisée par le vrai lib/ une fois
// poussé) plutôt que d'en créer une seconde.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

let app: FirebaseApp | undefined;
function getClientFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;
  }
  return app;
}

let db: Firestore | undefined;
export function getClientFirestore(): Firestore {
  if (!db) db = getFirestore(getClientFirebaseApp());
  return db;
}
