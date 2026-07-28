import { useTranslations } from "next-intl";

export function OnboardingProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const t = useTranslations("Onboarding");

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold text-[color:var(--color-ink-muted)]">
        {t("stepLabel", { current, total })}
      </p>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{
              backgroundColor:
                i < current ? "var(--color-coral)" : "var(--color-border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
