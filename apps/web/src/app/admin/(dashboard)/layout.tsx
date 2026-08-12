"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { hasAtLeastRole } from "@kairos/shared";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/firebase/auth-context";

function AdminGate({ children }: { children: ReactNode }) {
  const t = useTranslations("Admin");
  const { userDoc, loading } = useAuth();

  if (loading) return null;

  if (!userDoc || !hasAtLeastRole(userDoc.role, "admin")) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col justify-center gap-3 px-5 py-8 sm:max-w-md">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          {t("accessDeniedTitle")}
        </h1>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          {t("accessDeniedBody")}
        </p>
      </main>
    );
  }

  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AdminGate>{children}</AdminGate>
    </RequireAuth>
  );
}
