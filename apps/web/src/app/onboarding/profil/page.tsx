"use client";

import type { ExperienceLevel, FollowerRange } from "@kairos/shared";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!firebaseUser) return;
    setSaving(true);
    await completeOnboarding(firebaseUser.uid, {
      followerRange,
      avgViews: Number(avgViews) || 0,
      experienceLevel,
    });
    router.push("/classements");
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
            className="kai-input"
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
            className="kai-input"
          >
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`Profil.experience.${level}`)}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={saving} className="kai-btn-primary mt-auto">
          {t("finish")}
        </button>
      </form>
    </main>
  );
}
