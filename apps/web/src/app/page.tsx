import { useTranslations } from "next-intl";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { VerdictBadge } from "@/components/VerdictBadge";
import {
  IconCheck,
  IconCoin,
  IconGauge,
  IconMic,
  IconPackage,
  IconPipeline,
  IconRanking,
  IconScript,
  IconStar,
  Logo,
} from "@/components/icons";
import type { VerdictLabel } from "@kairos/shared";

export default function HomePage() {
  const t = useTranslations("Home");

  return (
    <main className="bg-[color:var(--color-bg)]">
      <SiteNav ctaLabel={t("ctaLogin")} />
      <Hero t={t} />
      <ProblemStrip t={t} />
      <VerdictsExplained t={t} />
      <HowItWorks t={t} />
      <FeatureGrid t={t} />
      <TrustBand t={t} />
      <Plans t={t} />
      <Faq t={t} />
      <FinalCta t={t} />
      <SiteFooter t={t} />
    </main>
  );
}

type T = ReturnType<typeof useTranslations>;

function SiteNav({ ctaLabel }: { ctaLabel: string }) {
  return (
    <nav className="sticky top-0 z-20 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-6 w-6" style={{ color: "var(--color-coral)" }} />
          <span className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">
            KAIROS
          </span>
        </Link>
        <Link
          href="/connexion"
          className="rounded-lg px-3 py-1.5 text-sm font-semibold"
          style={{ color: "var(--color-ink)" }}
        >
          {ctaLabel} →
        </Link>
      </div>
    </nav>
  );
}

function Hero({ t }: { t: T }) {
  return (
    <section className="kai-dot-grid relative overflow-hidden px-5 pt-14 pb-16 sm:pt-20">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 md:flex-row md:items-center">
        <div className="flex flex-1 flex-col gap-6">
          <p className="animate-[fadein_0.6s_ease-out_both] w-fit rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-1 text-xs font-semibold tracking-wide text-[color:var(--color-ink-muted)] uppercase">
            {t("kicker")}
          </p>

          <h1 className="animate-[fadein_0.6s_ease-out_0.08s_both] font-[family-name:var(--font-display)] text-[3.4rem] leading-[0.92] font-extrabold tracking-tight sm:text-7xl">
            {t("title")}
          </h1>

          <p className="animate-[fadein_0.6s_ease-out_0.16s_both] max-w-md text-2xl leading-[1.15] font-medium text-[color:var(--color-ink)] sm:text-3xl">
            {t("tagline")}
          </p>

          <p className="animate-[fadein_0.6s_ease-out_0.22s_both] max-w-sm text-base leading-relaxed text-[color:var(--color-ink-muted)]">
            {t("heroSub")}
          </p>

          <div className="animate-[fadein_0.6s_ease-out_0.3s_both] flex flex-col gap-3 sm:flex-row">
            <Link href="/connexion" className="kai-btn-primary">
              {t("cta")}
            </Link>
            <Link href="/connexion" className="kai-btn-outline">
              {t("ctaLogin")}
            </Link>
          </div>

          <div className="animate-[fadein_0.6s_ease-out_0.36s_both] flex flex-wrap gap-2 pt-2">
            <Chip text={t("heroChip1")} />
            <Chip text={t("heroChip2")} />
            <Chip text={t("heroChip3")} />
          </div>
        </div>

        <div className="animate-[fadein_0.7s_ease-out_0.2s_both] flex flex-1 justify-center md:justify-end">
          <HeroCardStack t={t} />
        </div>
      </div>
    </section>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <span
      className="rounded-full px-3 py-1 text-xs font-semibold"
      style={{ backgroundColor: "var(--color-surface)", color: "var(--color-ink-muted)" }}
    >
      {text}
    </span>
  );
}

function HeroCardStack({ t }: { t: T }) {
  return (
    <div className="relative w-full max-w-[320px]">
      <div
        className="absolute inset-0 translate-x-3 translate-y-4 rotate-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]"
        aria-hidden
      />
      <div className="kai-card relative flex flex-col gap-4 shadow-[0_20px_50px_-20px_rgba(24,24,27,0.25)]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[color:var(--color-ink-muted)]">
            <span
              className="kai-pulse-dot h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "var(--color-success)" }}
            />
            {t("heroCardLabel")}
          </span>
          <IconPackage className="h-5 w-5" style={{ color: "var(--color-ink-muted)" }} />
        </div>

        <div>
          <p className="text-sm font-bold">{t("heroCardProduct")}</p>
          <p className="text-xs text-[color:var(--color-ink-muted)]">{t("heroCardShop")}</p>
        </div>

        <VerdictBadge verdict="entrer_maintenant" />

        <div
          className="flex flex-col gap-1 rounded-xl p-3"
          style={{ backgroundColor: "var(--color-success-soft)" }}
        >
          <p
            className="text-[11px] font-semibold tracking-wide uppercase"
            style={{ color: "var(--color-success)" }}
          >
            {t("heroCardEarningsLabel")}
          </p>
          <p
            className="font-[family-name:var(--font-mono)] text-2xl font-bold"
            style={{ color: "var(--color-success)" }}
          >
            38–61€
          </p>
        </div>

        <svg viewBox="0 0 260 60" className="w-full" aria-hidden>
          <polyline
            points="0,45 40,40 80,32 120,20 160,24 200,10 260,4"
            fill="none"
            stroke="var(--color-success)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function ProblemStrip({ t }: { t: T }) {
  return (
    <section
      className="border-y border-[color:var(--color-border)] px-5 py-14"
      style={{ backgroundColor: "var(--color-coral-soft)" }}
    >
      <Reveal className="mx-auto max-w-2xl text-center">
        <p
          className="text-xs font-bold tracking-wide uppercase"
          style={{ color: "var(--color-coral)" }}
        >
          {t("problemKicker")}
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("problemTitle")}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[color:var(--color-ink)]">
          {t("problemBody")}
        </p>
      </Reveal>
    </section>
  );
}

const VERDICTS: { key: VerdictLabel; descKey: string }[] = [
  { key: "entrer_maintenant", descKey: "verdictEnterDesc" },
  { key: "avec_un_angle", descKey: "verdictAngleDesc" },
  { key: "risque", descKey: "verdictRiskDesc" },
  { key: "eviter", descKey: "verdictAvoidDesc" },
];

function VerdictsExplained({ t }: { t: T }) {
  return (
    <section className="px-5 py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <p
            className="text-xs font-bold tracking-wide uppercase"
            style={{ color: "var(--color-coral)" }}
          >
            {t("verdictsKicker")}
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("verdictsTitle")}
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {VERDICTS.map((v, i) => (
            <Reveal key={v.key} delay={i * 70}>
              <div
                className="flex h-full flex-col gap-3 rounded-2xl p-6"
                style={{ border: "1px solid var(--color-border)" }}
              >
                <VerdictBadge verdict={v.key} />
                <p className="text-sm leading-relaxed text-[color:var(--color-ink-muted)]">
                  {t(v.descKey)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEP_ICONS = [IconRanking, IconCoin, IconPipeline, IconScript] as const;

function HowItWorks({ t }: { t: T }) {
  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
    { title: t("step4Title"), body: t("step4Body") },
  ];

  return (
    <section className="px-5 py-20" style={{ backgroundColor: "var(--color-surface)" }}>
      <div className="mx-auto max-w-5xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <p
            className="text-xs font-bold tracking-wide uppercase"
            style={{ color: "var(--color-coral)" }}
          >
            {t("howKicker")}
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("howTitle")}
          </h2>
        </Reveal>

        <div className="relative mt-14 flex flex-col gap-10 md:flex-row md:gap-6">
          <div
            className="absolute top-6 bottom-6 left-6 hidden w-px md:block"
            style={{ backgroundColor: "var(--color-border)" }}
            aria-hidden
          />
          <div
            className="absolute top-6 right-[8%] left-[8%] hidden h-px md:block"
            style={{ backgroundColor: "var(--color-border)" }}
            aria-hidden
          />
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i]!;
            return (
              <Reveal key={step.title} delay={i * 90} className="flex-1">
                <div className="flex flex-col gap-3 md:items-center md:text-center">
                  <div className="relative flex items-center gap-3 md:flex-col md:gap-2">
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: "var(--color-bg)",
                        border: "1.5px solid var(--color-border)",
                        color: "var(--color-coral)",
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className="font-[family-name:var(--font-mono)] text-xs font-bold"
                      style={{ color: "var(--color-ink-muted)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[color:var(--color-ink-muted)]">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const FEATURE_ICONS = [IconRanking, IconGauge, IconStar, IconMic] as const;

function FeatureGrid({ t }: { t: T }) {
  const features = [
    { title: t("feature1Title"), body: t("feature1Body") },
    { title: t("feature2Title"), body: t("feature2Body") },
    { title: t("feature3Title"), body: t("feature3Body") },
    { title: t("feature4Title"), body: t("feature4Body") },
  ];

  return (
    <section className="px-5 py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <p
            className="text-xs font-bold tracking-wide uppercase"
            style={{ color: "var(--color-coral)" }}
          >
            {t("featuresKicker")}
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("featuresTitle")}
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {features.map((f, i) => {
            const Icon = FEATURE_ICONS[i]!;
            return (
              <Reveal key={f.title} delay={i * 70}>
                <div
                  className="flex h-full flex-col gap-3 rounded-2xl p-6"
                  style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "var(--color-coral-soft)", color: "var(--color-coral)" }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[color:var(--color-ink-muted)]">
                    {f.body}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TrustBand({ t }: { t: T }) {
  const points = [t("trustPoint1"), t("trustPoint2"), t("trustPoint3")];

  return (
    <section className="px-5 py-20">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 text-center">
        <Reveal>
          <p
            className="text-xs font-bold tracking-wide uppercase"
            style={{ color: "var(--color-success)" }}
          >
            {t("trustKicker")}
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("trustTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[color:var(--color-ink-muted)]">
            {t("trustBody")}
          </p>
        </Reveal>

        <Reveal delay={100} className="grid w-full gap-3 sm:grid-cols-3">
          {points.map((point) => (
            <div
              key={point}
              className="flex flex-col items-center gap-2 rounded-2xl p-5 text-center"
              style={{ backgroundColor: "var(--color-success-soft)" }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: "var(--color-success)", color: "#fff" }}
              >
                <IconCheck className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold" style={{ color: "var(--color-success)" }}>
                {point}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function Plans({ t }: { t: T }) {
  const plans = [
    {
      name: t("planRadarName"),
      price: t("planRadarPrice"),
      features: [t("planRadarFeature1"), t("planRadarFeature2"), t("planRadarFeature3")],
      popular: false,
    },
    {
      name: t("planCreatorName"),
      price: t("planCreatorPrice"),
      features: [t("planCreatorFeature1"), t("planCreatorFeature2"), t("planCreatorFeature3")],
      popular: true,
    },
    {
      name: t("planProName"),
      price: t("planProPrice"),
      features: [t("planProFeature1"), t("planProFeature2"), t("planProFeature3")],
      popular: false,
    },
  ];

  return (
    <section className="px-5 py-20" style={{ backgroundColor: "var(--color-surface)" }}>
      <div className="mx-auto max-w-5xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <p
            className="text-xs font-bold tracking-wide uppercase"
            style={{ color: "var(--color-coral)" }}
          >
            {t("plansKicker")}
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("plansTitle")}
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 80}>
              <div
                className="relative flex h-full flex-col gap-4 rounded-2xl p-6"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: plan.popular
                    ? "2px solid var(--color-coral)"
                    : "1px solid var(--color-border)",
                }}
              >
                {plan.popular && (
                  <span
                    className="absolute -top-3 left-6 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    style={{ backgroundColor: "var(--color-coral)", color: "var(--color-coral-ink)" }}
                  >
                    {t("plansBadgePopular")}
                  </span>
                )}
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">{plan.price}</p>
                </div>
                <ul className="flex flex-col gap-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <IconCheck
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: "var(--color-success)" }}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq({ t }: { t: T }) {
  const items = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
    { q: t("faq5Q"), a: t("faq5A") },
  ];

  return (
    <section className="px-5 py-20">
      <div className="mx-auto max-w-3xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <p
            className="text-xs font-bold tracking-wide uppercase"
            style={{ color: "var(--color-coral)" }}
          >
            {t("faqKicker")}
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("faqTitle")}
          </h2>
        </Reveal>

        <div className="mt-12 flex flex-col gap-3">
          {items.map((item, i) => (
            <Reveal key={item.q} delay={i * 50}>
              <details className="group kai-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                  {item.q}
                  <span
                    className="shrink-0 text-lg transition-transform group-open:rotate-45"
                    style={{ color: "var(--color-coral)" }}
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-ink-muted)]">
                  {item.a}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ t }: { t: T }) {
  return (
    <section
      className="px-5 py-20 text-center"
      style={{ backgroundColor: "var(--color-ink)" }}
    >
      <Reveal className="mx-auto flex max-w-lg flex-col items-center gap-5">
        <Logo className="h-8 w-8" style={{ color: "var(--color-coral)" }} />
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {t("finalCtaTitle")}
        </h2>
        <p className="text-base leading-relaxed text-white/70">{t("finalCtaBody")}</p>
        <Link
          href="/connexion"
          className="kai-btn-primary w-full max-w-xs sm:w-auto sm:px-8"
        >
          {t("finalCtaButton")}
        </Link>
      </Reveal>
    </section>
  );
}

function SiteFooter({ t }: { t: T }) {
  const legalLinks = [
    { href: "/cgu", label: t("footerCgu") },
    { href: "/cgu-affiliation", label: t("footerCguAffiliation") },
    { href: "/confidentialite", label: t("footerPrivacy") },
    { href: "/mentions-legales", label: t("footerLegalMentions") },
    { href: "/retractation", label: t("footerRetractation") },
  ];

  return (
    <footer className="px-5 py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <div className="flex items-center gap-2">
            <Logo className="h-5 w-5" style={{ color: "var(--color-coral)" }} />
            <span className="font-[family-name:var(--font-display)] text-lg font-extrabold">
              KAIROS
            </span>
          </div>
          <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">{t("footerTagline")}</p>
        </div>

        <div>
          <p className="text-xs font-bold tracking-wide text-[color:var(--color-ink-muted)] uppercase">
            {t("footerLinksLegal")}
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-5xl border-t border-[color:var(--color-border)] pt-6">
        <p className="text-xs leading-relaxed text-[color:var(--color-ink-muted)]">
          {t("footerDisclaimer")}
        </p>
        <p className="mt-2 text-xs text-[color:var(--color-ink-muted)]">{t("footerCopyright")}</p>
      </div>
    </footer>
  );
}
