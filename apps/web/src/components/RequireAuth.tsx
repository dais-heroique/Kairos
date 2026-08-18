"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/firebase/auth-context";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { firebaseUser, loading, profileError } = useAuth();
  const router = useRouter();
  const t = useTranslations("Auth");

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/connexion");
    }
  }, [loading, firebaseUser, router]);

  if (loading || !firebaseUser) return null;

  if (profileError) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-5 py-12 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          {t("profileLoadErrorTitle")}
        </h1>
        <p className="max-w-md text-sm text-[color:var(--color-ink-muted)]">
          {t("profileLoadErrorBody")}
        </p>
        <button
          type="button"
          className="kai-btn-primary"
          onClick={() => window.location.reload()}
        >
          {t("profileLoadErrorRetry")}
        </button>
      </main>
    );
  }

  return <>{children}</>;
}
