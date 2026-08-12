"use client";

import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { onSnapshot } from "firebase/firestore";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { type User, userSchema } from "@kairos/shared";
import { auth } from "./client";
import { ensureUserDocument, userDocRef } from "@/lib/firestore/user";
import { isValidPartnerCode, normalisePartnerCode } from "@kairos/shared";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userDoc: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  userDoc: null,
  loading: true,
});

/**
 * Code partenaire porté par l'URL (`?ref=LEA20`).
 *
 * **Normalisé, et validé.** Deux raisons, chacune coûteuse :
 *
 * 1. Sans mise en majuscules, un influenceur qui écrit son lien en
 *    minuscules enverrait ses inscrits sur un code que le registre ne
 *    reconnaît pas — et personne ne s'en apercevrait avant qu'il réclame
 *    son virement.
 * 2. `referredByCode` est **figé à la création** du compte (voir
 *    firestore.rules). Une valeur fantaisiste écrite ici ne se corrige
 *    plus jamais : mieux vaut n'enregistrer que ce qui a la forme d'un
 *    code.
 */
function readReferralCodeFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("ref");
  if (!raw) return null;
  const code = normalisePartnerCode(raw);
  return isValidPartnerCode(code) ? code : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onSnapshot (pas un simple getDoc) : le rôle admin, le plan issu d'un
    // code d'invitation, etc. doivent apparaître partout sans reload manuel.
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
      unsubscribeDoc?.();
      setFirebaseUser(nextUser);

      if (!nextUser) {
        setUserDoc(null);
        setLoading(false);
        return;
      }

      try {
        await ensureUserDocument(nextUser, readReferralCodeFromUrl());
      } catch (err) {
        console.error("ensureUserDocument failed", err);
        setLoading(false);
        return;
      }

      unsubscribeDoc = onSnapshot(
        userDocRef(nextUser.uid),
        (snap) => {
          setUserDoc(snap.exists() ? userSchema.parse(snap.data()) : null);
          setLoading(false);
        },
        (err) => {
          // Ne jamais rester bloqué en "loading" indéfiniment si la lecture
          // échoue (permission, réseau, etc.) — sinon la page reste blanche.
          console.error("user doc onSnapshot failed", err);
          setLoading(false);
        },
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDoc?.();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, userDoc, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
