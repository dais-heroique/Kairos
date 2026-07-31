"use client";

import {
  type AppCheck,
  ReCaptchaV3Provider,
  initializeAppCheck,
} from "firebase/app-check";
import { firebaseApp } from "./client";
import { publicEnv } from "@/lib/env";

declare global {
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
}

let appCheck: AppCheck | undefined;

// App Check est obligatoire sur Firestore, Storage et toutes les Callables
// (§7). En dev/émulateurs on passe par un jeton de debug plutôt que par une
// vraie clé reCAPTCHA — voir NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN.
export function initClientAppCheck(): AppCheck | undefined {
  if (typeof window === "undefined" || appCheck) return appCheck;

  // Une variable d'env est toujours une chaîne : "true" doit devenir le
  // booléen true (génère un jeton aléatoire, affiché en console pour être
  // enregistré dans Firebase Console) ; toute autre valeur est un jeton fixe.
  const debugToken = publicEnv.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
  if (debugToken) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN =
      debugToken === "true" ? true : debugToken;
  }

  const siteKey = publicEnv.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (!siteKey && !debugToken) {
    console.warn(
      "NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY manquant — App Check désactivé.",
    );
    return undefined;
  }

  // En mode debug token, le provider n'est jamais réellement sollicité
  // (le SDK court-circuite vers le jeton de debug) — une valeur factice suffit.
  appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(siteKey || "debug-mode-placeholder"),
    isTokenAutoRefreshEnabled: true,
  });
  return appCheck;
}
