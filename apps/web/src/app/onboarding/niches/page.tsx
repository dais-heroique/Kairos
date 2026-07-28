"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { useAuth } from "@/lib/firebase/auth-context";
import { updateOnboardingNiches } from "@/lib/firestore/user";
import { NICHE_LABELS, NICHE_OPTIONS } from "@/lib/niches";

const CHIP_COLORS = ["coral", "success", "warning"] as const;

export default function OnboardingNichesPage() {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const { firebaseUser, userDoc } = useAuth();
  const [selected, setSelected] = useState<string[]>(
    () => userDoc?.profile.niches ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggle(niche: string) {
    setSelected((prev) =>
      prev.includes(niche) ? prev.filter((n) => n !== niche) : [...prev, niche],
    );
  }

  async function handleNext() {
    if (selected.length === 0) {
      setError(t("Niches.errorNone"));
      return;
    }
    if (!firebaseUser) return;
    setSaving(true);
    await updateOnboardingNiches(firebaseUser.uid, selected);
    router.push("/onboarding/marche");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col gap-6 px-5 py-8 sm:max-w-md">
      <OnboardingProgress current={1} total={3} />

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          {t("Niches.title")}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          {t("Niches.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {NICHE_OPTIONS.map((niche, i) => {
          const isSelected = selected.includes(niche);
          const color = CHIP_COLORS[i % CHIP_COLORS.length];
          return (
            <button
              key={niche}
              type="button"
              onClick={() => toggle(niche)}
              className="rounded-xl border-2 px-3 py-3 text-left text-sm font-semibold transition"
              style={
                isSelected
                  ? {
                      borderColor: `var(--color-${color})`,
                      backgroundColor: `var(--color-${color}-soft)`,
                      color: `var(--color-${color})`,
                    }
                  : { borderColor: "var(--color-border)" }
              }
            >
              {NICHE_LABELS[niche]}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-sm font-medium" style={{ color: "var(--color-coral)" }}>
          {error}
        </p>
      )}

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
