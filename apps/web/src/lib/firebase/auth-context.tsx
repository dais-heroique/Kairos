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

function readReferralCodeFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("ref");
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
