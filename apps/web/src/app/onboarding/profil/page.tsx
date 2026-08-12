"use client";

import type { ExperienceLevel, FollowerRange } from "@kairos/shared";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { computeEarnings, DEFAULT_EARNINGS_CONFIG } from "@kairos/core";
import { EstimatedValue } from "@/components/EstimatedValue";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { useAuth } from "@/lib/firebase/auth-context";
import { completeOnboarding } from "@/lib/firestore/user";

const FOLLOWER_RANGES: FollowerRange[] = [
  "0_1k",
  "1k_5k",
  "5k_20k",
  "20k_100k",
  "100k_plus",
];

const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "debutant",
  "intermediaire",
  "confirme",
];

// Produit d'exemple de l'aperçu. Volontairement au milieu de ce qu'on
// observe — 25 € commissionnés 20 % — et annoncé comme un exemple à
// l'écran : ce n'est pas une projection de gains, c'est une démonstration
// de ce que le chiffre saisi produit.
const PREVIEW_PRICE_EUR = 25;
const PREVIEW_COMMISSION_PCT = 20;

export default function OnboardingProfilPage() {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const { firebaseUser, userDoc } = useAuth();
  const [followerRange, setFollowerRange] = useState<FollowerRange>(
    userDoc?.profile.followerRange ?? "0_1k",
  );
  const [avgViews, setAvgViews] = useState(
    userDoc?.profile.avgViews ? String(userDoc.profile.avgViews) : "",
  );
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    userDoc?.profile.experienceLevel ?? "debutant",
  );
  const [saving, setSaving] = useState(false);

  // Le même moteur que le reste de l'application (`packages/core`), pas
  // une formule d'affichage : ce que l'aperçu montre est exactement ce que
  // le tableau de bord affichera ensuite. Une démonstration qui ne
  // correspondrait pas au produit réel serait pire que pas de démonstration.
  const previewEarnings = useMemo(() => {
    const views = Number(avgViews);
    if (!Number.isFinite(views) || views <= 0) return null;
    return computeEarnings({
      expectedViews: Math.floor(views),
      followerRange,
      niche: "",
      medianConversionRate: DEFAULT_EARNINGS_CONFIG.defaultConversionRate,
      priceCents: PREVIEW_PRICE_EUR * 100,
      commissionRatePct: PREVIEW_COMMISSION_PCT,
      estimatedReturnRatePct: DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct,
    });
  }, [avgViews, followerRange]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!firebaseUser) return;
    setSaving(true);
    await completeOnboarding(firebaseUser.uid, {
      followerRange,
      avgViews: Number(avgViews) || 0,
      experienceLevel,
    });
    router.push("/tableau-de-bord");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col gap-6 px-5 py-8 sm:max-w-md">
      <OnboardingProgress current={3} total={3} />

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          {t("Profil.title")}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          {t("Profil.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("Profil.followerRangeLabel")}
          <select
            value={followerRange}
            onChange={(event) =>
              setFollowerRange(event.target.value as FollowerRange)
            }
            className="kai-select"
          >
            {FOLLOWER_RANGES.map((range) => (
              <option key={range} value={range}>
                {t(`Profil.followerRanges.${range}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("Profil.avgViewsLabel")}
          <input
            type="number"
            min={0}
            required
            value={avgViews}
            onChange={(event) => setAvgViews(event.target.value)}
            placeholder={t("Profil.avgViewsPlaceholder")}
            className="kai-input font-[family-name:var(--font-mono)]"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("Profil.experienceLabel")}
          <select
            value={experienceLevel}
            onChange={(event) =>
              setExperienceLevel(event.target.value as ExperienceLevel)
            }
            className="kai-select"
          >
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`Profil.experience.${level}`)}
              </option>
            ))}
          </select>
        </label>

        {/* Aperçu immédiat.
            L'onboarding ne faisait que collecter : trois champs, un bouton,
            et la valeur du produit n'apparaissait qu'après. Or `avgViews`
            est le champ dont tout dépend — mal renseigné ou laissé à 0,
            l'application entière n'affiche que des tirets. Montrer le
            résultat pendant la saisie fait deux choses : ça explique
            pourquoi on demande ce chiffre, et ça donne la première preuve
            que l'outil calcule vraiment quelque chose. */}
        {previewEarnings && (
          <div
            className="flex flex-col gap-1 rounded-xl p-3"
            style={{ backgroundColor: "var(--color-success-soft)" }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-success)" }}
            >
              Ce que ça donne
            </span>
            <p className="font-[family-name:var(--font-display)] text-xl font-extrabold">
              <EstimatedValue
                range={previewEarnings}
                format={(v) =>
                  v.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0,
                  })
                }
              />
            </p>
            <p className="text-xs text-[color:var(--color-ink-muted)]">
              Pour une vidéo sur un produit à {PREVIEW_PRICE_EUR} € commissionné{" "}
              {PREVIEW_COMMISSION_PCT} %. C&apos;est un exemple type, pas une
              promesse — les vrais produits arrivent juste après.
            </p>
          </div>
        )}

        <button type="submit" disabled={saving} className="kai-btn-primary mt-auto">
          {t("finish")}
        </button>
      </form>
    </main>
  );
}
