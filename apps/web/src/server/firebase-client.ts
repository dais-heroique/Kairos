import { getApps, initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

const APP_NAME = "kairos-server-read";

let cachedDb: Firestore | undefined;

// Lecture publique du catalogue (products/shops/rankings — voir
// firestore.rules) via le SDK client, isomorphe Node/navigateur : ne
// nécessite pas de credentials de service (contrairement à
// apps/web/src/server/firebase-admin.ts), donc ne dépend pas d'un projet
// GCP réel pour rendre ces pages en statique au build (contrainte plan
// Spark, voir docs/STATE.md). Config publique — mêmes valeurs que
// apps/web/.env.production, non secrètes (voir décision Phase 0).
export function getPublicFirestore(): Firestore {
  if (!cachedDb) {
    const app =
      getApps().find((a) => a.name === APP_NAME) ??
      initializeApp(
        {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "kairos-on",
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
        },
        APP_NAME,
      );
    cachedDb = getFirestore(app);

    // Deux façons de désigner l'émulateur, parce que ce module tourne des
    // deux côtés :
    //  - FIRESTORE_EMULATOR_HOST, la convention des outils Firebase, lue
    //    côté Node (tests, build statique) ;
    //  - NEXT_PUBLIC_USE_FIREBASE_EMULATORS côté navigateur, car Next
    //    n'inline dans le bundle *que* les variables NEXT_PUBLIC_*.
    //
    // Sans la seconde, `process.env.FIRESTORE_EMULATOR_HOST` valait
    // `undefined` dans le navigateur : les pages de classement lisaient la
    // **production** pendant que /admin écrivait dans l'émulateur. En dev
    // on peuplait donc une base et on en affichait une autre, sans le
    // moindre message d'erreur.
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
    if (emulatorHost) {
      const [host, portStr] = emulatorHost.split(":");
      connectFirestoreEmulator(cachedDb, host!, Number(portStr));
    } else if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
      connectFirestoreEmulator(cachedDb, "127.0.0.1", 8080);
    }
  }
  return cachedDb;
}
