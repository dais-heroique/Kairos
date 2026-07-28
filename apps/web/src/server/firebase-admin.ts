import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Instance Admin SDK indépendante de apps/web/src/lib/firebase/* (dossier
// non fourni par cette session, voir docs/STATE.md) — ce module ne dépend
// que de firebase-admin, jamais de `@/lib/**`, pour rester utilisable
// quel que soit le contenu réel de `lib/` une fois poussé.
let cachedDb: Firestore | undefined;

export function getAdminFirestore(): Firestore {
  if (!cachedDb) {
    if (getApps().length === 0) initializeApp();
    cachedDb = getFirestore();
  }
  return cachedDb;
}
