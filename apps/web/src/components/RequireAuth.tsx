"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/firebase/auth-context";

// Garde client — l'auth Firebase est intrinsèquement côté client (SDK), donc
// pas de vérification serveur ici en Phase 1. Voir décisions de fin de phase.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/connexion");
    }
  }, [loading, firebaseUser, router]);

  if (loading || !firebaseUser) return null;

  return <>{children}</>;
}
