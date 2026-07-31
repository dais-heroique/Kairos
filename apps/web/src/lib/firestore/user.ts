"use client";

import type { User as FirebaseUser } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  type ExperienceLevel,
  type FollowerRange,
  type Market,
  type User,
  userSchema,
} from "@kairos/shared";
import { firestore } from "@/lib/firebase/client";

// Pas de Cloud Functions (plan Spark/gratuit) — export et suppression se
// font entièrement côté client. Les Firestore Rules autorisent déjà le
// propriétaire à lire/écrire ses propres sous-collections.
const USER_SUBCOLLECTIONS = [
  "watchlist",
  "portfolio",
  "briefs",
  "notifications",
  "affiliate",
] as const;

export function userDocRef(uid: string) {
  return doc(firestore, "users", uid);
}

// Crée le document users/{uid} au premier sign-in, sinon ne touche à rien
// (idempotent — appelé à chaque connexion). referredByCode n'est capturé
// qu'à la création : voir firestore.rules (referredByCodeUnchanged).
export async function ensureUserDocument(
  firebaseUser: FirebaseUser,
  referredByCode: string | null,
): Promise<User> {
  const ref = userDocRef(firebaseUser.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return userSchema.parse(snapshot.data());
  }

  if (!firebaseUser.email) {
    throw new Error("Impossible de créer le compte : aucun email fourni par le fournisseur d'identité.");
  }

  const newUser: User = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    locale: "fr",
    role: "user",
    createdAt: new Date().toISOString(),
    deletedAt: null,
    profile: {
      niches: [],
      markets: [],
      followerRange: "0_1k",
      avgViews: 0,
      experienceLevel: "debutant",
      onboardingCompletedAt: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    plan: {
      slug: "radar",
      status: "active",
      currentPeriodEnd: null,
      stripeCustomerId: null,
    },
    stats: {
      briefsGenerated: 0,
      videosPosted: 0,
      estimatedEarningsCents: 0,
    },
    referredByCode,
    appliedInviteCode: null,
  };

  const validated = userSchema.parse(newUser);
  await setDoc(ref, validated);
  return validated;
}

// Sauvegarde progressive — un appel par écran d'onboarding, pour ne rien
// perdre si l'utilisateur revient en arrière ou recharge la page.
export async function updateOnboardingNiches(
  uid: string,
  niches: string[],
): Promise<void> {
  await updateDoc(userDocRef(uid), { "profile.niches": niches });
}

export async function updateOnboardingMarkets(
  uid: string,
  markets: Market[],
): Promise<void> {
  await updateDoc(userDocRef(uid), { "profile.markets": markets });
}

export async function completeOnboarding(
  uid: string,
  input: {
    followerRange: FollowerRange;
    avgViews: number;
    experienceLevel: ExperienceLevel;
  },
): Promise<void> {
  await updateDoc(userDocRef(uid), {
    "profile.followerRange": input.followerRange,
    "profile.avgViews": input.avgViews,
    "profile.experienceLevel": input.experienceLevel,
    "profile.onboardingCompletedAt": new Date().toISOString(),
  });
}

export async function getUserDocument(uid: string): Promise<User | null> {
  const snapshot = await getDoc(userDocRef(uid));
  if (!snapshot.exists()) return null;
  return userSchema.parse(snapshot.data());
}

// RGPD art. 20 (portabilité) — lecture directe, aucun serveur nécessaire.
export async function exportOwnData(uid: string): Promise<Record<string, unknown>> {
  const userSnap = await getDoc(userDocRef(uid));
  if (!userSnap.exists()) {
    throw new Error("Compte introuvable.");
  }

  const subcollections: Record<string, unknown[]> = {};
  for (const name of USER_SUBCOLLECTIONS) {
    const snap = await getDocs(collection(userDocRef(uid), name));
    subcollections[name] = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  }

  return {
    exportedAt: new Date().toISOString(),
    user: userSnap.data(),
    ...subcollections,
  };
}

// RGPD art. 17 (droit à l'effacement) — supprime toutes les sous-collections
// puis le document racine. La suppression de l'identité Auth se fait à part
// (voir deleteCurrentUserAccount dans lib/firebase/auth.ts).
export async function deleteOwnUserData(uid: string): Promise<void> {
  for (const name of USER_SUBCOLLECTIONS) {
    const snap = await getDocs(collection(userDocRef(uid), name));
    await Promise.all(snap.docs.map((docSnap) => deleteDoc(docSnap.ref)));
  }
  await deleteDoc(userDocRef(uid));
}
