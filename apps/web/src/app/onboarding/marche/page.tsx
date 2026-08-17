"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MARKETS } from "@kairos/shared";
import type { Market } from "@kairos/shared";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { useAuth } from "@/lib/firebase/auth-context";
import { updateOnboardingMarkets } from "@/lib/firestore/user";

const MARKET_LABELS: Record<Market, string> = {
  FR: "France",
  US: "États-Unis",
  UK: "Royaume-Uni",
  DE: "Allemagne",
  IE: "Irlande",
  IT: "Italie",
  ES: "Espagne",
  AT: "Autriche",
  BE: "Belgique",
  NL: "Pays-Bas",
  PL: "Pologne",
};

export default function OnboardingMarchePage() {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const { firebaseUser, userDoc } = useAuth();
  const [markets, setMarkets] = useState<Market[]>(userDoc?.profile.markets ?? ["FR"]);
  const [saving, setSaving] = useState(false);

  function toggleMarket(market: Market) {
    setMarkets((current) => {
      if (current.includes(market)) {
        return current.length > 1 ? current.filter((m) => m !== market) : current;
      }
      return [...current, market];
    });
  }

  async function handleNext() {
    if (!firebaseUser || markets.length === 0) return;
    setSaving(true);
    await updateOnboardingMarkets(firebaseUser.uid, markets);
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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MARKETS.map((market) => {
          const selected = markets.includes(market);
          return (
            <button
              key={market}
              type="button"
              onClick={() => toggleMarket(market)}
              aria-pressed={selected}
              className="flex items-center justify-between rounded-xl border-2 px-3 py-3 text-left font-semibold transition-colors"
              style={{
                borderColor: selected ? "var(--color-success)" : "var(--color-border)",
                backgroundColor: selected ? "var(--color-success-soft)" : "transparent",
                color: selected ? "var(--color-success)" : "var(--color-ink)",
              }}
            >
              <span>{MARKET_LABELS[market]}</span>
              {selected && <span aria-hidden>✓</span>}
            </button>
          );
        })}
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
