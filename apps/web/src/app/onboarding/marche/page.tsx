"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { useAuth } from "@/lib/firebase/auth-context";
import { updateOnboardingMarkets } from "@/lib/firestore/user";

// V1 = marché FR uniquement (§11) — les autres sont affichés pour le
// contexte (module Vagues, §4 M2 #8) mais pas sélectionnables.
const LOCKED_MARKETS = [
  { code: "US", label: "États-Unis" },
  { code: "UK", label: "Royaume-Uni" },
] as const;

export default function OnboardingMarchePage() {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [saving, setSaving] = useState(false);

  async function handleNext() {
    if (!firebaseUser) return;
    setSaving(true);
    await updateOnboardingMarkets(firebaseUser.uid, ["FR"]);
    router.push("/onboarding/profil");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col gap-6 px-5 py-8 sm:max-w-md">
      <OnboardingProgress current={2} total={3} />

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          {t("Marche.title")}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          {t("Marche.subtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div
          className="flex items-center justify-between rounded-xl border-2 px-3 py-3 font-semibold"
          style={{
            borderColor: "var(--color-success)",
            backgroundColor: "var(--color-success-soft)",
            color: "var(--color-success)",
          }}
        >
          <span>{t("Marche.franceLabel")}</span>
          <span aria-hidden>✓</span>
        </div>
        {LOCKED_MARKETS.map((market) => (
          <div
            key={market.code}
            className="flex items-center justify-between rounded-xl border-2 px-3 py-3 opacity-50"
            style={{ borderColor: "var(--color-border)" }}
          >
            <span>{market.label}</span>
            <span className="text-xs font-medium">
              {t("Marche.comingSoonLabel")}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleNext}
        disabled={saving}
        className="kai-btn-primary mt-auto"
      >
        {t("next")}
      </button>
    </main>
  );
}
