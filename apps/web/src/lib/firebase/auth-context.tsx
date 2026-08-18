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
  profileError: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  userDoc: null,
  loading: true,
  profileError: false,
});

/**
 * Code partenaire porté par l'URL (`?ref=LEA20`).
 *
 * Le code est normalisé et validé avant d'être enregistré :
 * `referredByCode` est figé à la création du compte dans les règles Firestore.
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
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    // onSnapshot garde le rôle et le plan synchronisés partout sans reload manuel.
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
      unsubscribeDoc?.();
      unsubscribeDoc = undefined;
      setFirebaseUser(nextUser);
      setUserDoc(null);
      setProfileError(false);
      setLoading(true);

      if (!nextUser) {
        setLoading(false);
        return;
      }

      try {
        await ensureUserDocument(nextUser, readReferralCodeFromUrl());
      } catch (err) {
        console.error("ensureUserDocument failed", err);
        setProfileError(true);
        setLoading(false);
        return;
      }

      unsubscribeDoc = onSnapshot(
        userDocRef(nextUser.uid),
        (snap) => {
          try {
            if (!snap.exists()) {
              setUserDoc(null);
              setProfileError(true);
            } else {
              setUserDoc(userSchema.parse(snap.data()));
              setProfileError(false);
            }
          } catch (err) {
            console.error("user document validation failed", err);
            setUserDoc(null);
            setProfileError(true);
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          console.error("user doc onSnapshot failed", err);
          setUserDoc(null);
          setProfileError(true);
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
    <AuthContext.Provider value={{ firebaseUser, userDoc, loading, profileError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
