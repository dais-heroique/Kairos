"use client";

import { updateDoc } from "firebase/firestore";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/firebase/auth-context";
import { userDocRef } from "@/lib/firestore/user";

// Bootstrap ponctuel du tout premier admin — verrouillé côté Firestore Rules
// à une adresse email précise (voir isBootstrapAdminEmail()). À retirer une
// fois utilisé : cette page et la règle associée n'ont plus lieu d'être.
const BOOTSTRAP_EMAIL = "contact.conforva@gmail.com";

function BootstrapContent() {
  const t = useTranslations("Admin");
  const { firebaseUser, userDoc } = useAuth();
  const [status, setStatus] = useState<"idle" | "working" | "done" | "denied">(
    "idle",
  );

  async function handlePromote() {
    if (!firebaseUser) return;
    setStatus("working");
    try {
      await updateDoc(userDocRef(firebaseUser.uid), { role: "admin" });
      setStatus("done");
    } catch {
      setStatus("denied");
    }
  }

  const alreadyAdmin = userDoc?.role === "admin" || userDoc?.role === "owner" || status === "done";
  const isEligible = firebaseUser?.email?.toLowerCase() === BOOTSTRAP_EMAIL;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col justify-center gap-4 px-5 py-8 sm:max-w-md">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
        {t("bootstrapTitle")}
      </h1>
      {firebaseUser?.email && (
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          {t("bootstrapBody", { email: firebaseUser.email })}
        </p>
      )}

      {alreadyAdmin ? (
        <div className="kai-card border-l-4" style={{ borderColor: "var(--color-success)" }}>
          <p className="font-semibold" style={{ color: "var(--color-success)" }}>
            {status === "done" ? t("bootstrapSuccess") : t("bootstrapAlready")}
          </p>
        </div>
      ) : isEligible ? (
        <button type="button" onClick={handlePromote} disabled={status === "working"} className="kai-btn-primary">
          {t("bootstrapButton")}
        </button>
      ) : (
        <p className="text-sm font-medium" style={{ color: "var(--color-coral)" }}>
          {t("bootstrapDenied")}
        </p>
      )}

      {status === "denied" && (
        <p className="text-sm font-medium" style={{ color: "var(--color-coral)" }}>
          {t("bootstrapDenied")}
        </p>
      )}

      {alreadyAdmin && (
        // <a> natif (pas next/link) : force un rechargement complet pour que
        // le contexte Auth relise le rôle mis à jour depuis Firestore.
        <a href="/admin" className="kai-btn-outline">
          {t("goToDashboard")}
        </a>
      )}
    </main>
  );
}

export default function AdminBootstrapPage() {
  return (
    <RequireAuth>
      <BootstrapContent />
    </RequireAuth>
  );
}
