import { useTranslations } from "next-intl";
import Link from "next/link";
import { VerdictBadge } from "@/components/VerdictBadge";

export default function HomePage() {
  const t = useTranslations("Home");

  return (
    <main className="min-h-dvh bg-[color:var(--color-bg)]">
      <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col gap-8 px-5 py-10 sm:max-w-xl">
        <p className="animate-[fadein_0.6s_ease-out_both] text-xs font-semibold tracking-wide uppercase text-[color:var(--color-ink-muted)]">
          {t("kicker")}
        </p>

        <div className="animate-[fadein_0.6s_ease-out_0.1s_both] flex flex-col gap-3">
          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-[0.95] font-extrabold tracking-tight">
            KAIROS
          </h1>
          <p className="text-xl leading-snug font-medium text-[color:var(--color-ink)]">
            {t("tagline")}
          </p>
        </div>

        <div className="animate-[fadein_0.6s_ease-out_0.2s_both] flex flex-wrap gap-2">
          <VerdictBadge verdict="entrer_maintenant" />
          <VerdictBadge verdict="avec_un_angle" />
          <VerdictBadge verdict="risque" />
          <VerdictBadge verdict="eviter" />
        </div>

        <div className="animate-[fadein_0.6s_ease-out_0.3s_both] flex flex-col gap-3">
          <FeatureRow text={t("featureEarnings")} accent="success" />
          <FeatureRow text={t("featureTiming")} accent="coral" />
          <FeatureRow text={t("featureCreative")} accent="warning" />
        </div>

        <div className="animate-[fadein_0.6s_ease-out_0.4s_both] mt-auto flex flex-col gap-3">
          <Link href="/connexion" className="kai-btn-primary">
            {t("cta")}
          </Link>
          <Link href="/connexion" className="kai-btn-outline">
            {t("ctaLogin")}
          </Link>
          <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-ink-muted)]">
            {t("disclaimer")}
          </p>
        </div>
      </div>
    </main>
  );
}

function FeatureRow({
  text,
  accent,
}: {
  text: string;
  accent: "success" | "coral" | "warning";
}) {
  return (
    <div className="kai-card flex items-center gap-3">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: `var(--color-${accent})` }}
      />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}
