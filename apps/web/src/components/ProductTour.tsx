"use client";

import { useMemo, useState } from "react";
import {
  buildBrief,
  computeEarnings,
  computeVerdict,
  DEFAULT_EARNINGS_CONFIG,
} from "@kairos/core";
import { DEFAULT_COMPLIANCE_RULES_FR, PHASE_LABELS } from "@kairos/shared";
import { buildScenarioSnapshots, SCENARIO_PRESETS } from "@/lib/demo/scenario";
import { EstimatedValue } from "@/components/EstimatedValue";
import { SnapshotChart } from "@/components/SnapshotChart";
import { VerdictBadge } from "@/components/VerdictBadge";

// « Ce qu'il y a dedans », montré au lieu d'être listé.
//
// Cette section était quatre cartes de texte décrivant quatre écrans. Or
// tous les calculs de KAIROS sont des fonctions pures : elles tournent
// gratuitement dans le navigateur d'un visiteur non connecté. Autant lui
// montrer les écrans eux-mêmes, avec les composants de l'application —
// `VerdictBadge`, `EstimatedValue`, `SnapshotChart` sont exactement ceux
// qu'il retrouvera après inscription.
//
// ⚠️ Les produits ci-dessous sont des exemples, et c'est écrit à l'écran.
// Ce qui n'est pas un exemple, c'est le calcul : verdicts, gains et brief
// sortent des moteurs de production.

interface TourProduct {
  emoji: string;
  title: string;
  shop: string;
  priceCents: number;
  commissionRatePct: number;
  category: string;
  presetId: string;
}

const PRODUCTS: TourProduct[] = [
  {
    emoji: "🧴",
    title: "Sérum niacinamide 10 %",
    shop: "GlowLab Paris",
    priceCents: 1690,
    commissionRatePct: 28,
    category: "Beauté & soins",
    presetId: "pepite",
  },
  {
    emoji: "🌿",
    title: "Huile de ricin cils & sourcils 30 ml",
    shop: "Maison Sereine",
    priceCents: 1290,
    commissionRatePct: 32,
    category: "Beauté & soins",
    presetId: "montee",
  },
  {
    emoji: "💡",
    title: "Veilleuse projecteur d'étoiles",
    shop: "Petit Nuage",
    priceCents: 2390,
    commissionRatePct: 20,
    category: "Maison & déco",
    presetId: "ruee",
  },
];

const TABS = [
  { id: "liste", label: "La liste", hint: "Ce qui marche en ce moment" },
  { id: "gains", label: "Tes gains", hint: "En euros, pour tes vues" },
  { id: "courbe", label: "La courbe", hint: "Jour après jour" },
  { id: "texte", label: "Le texte à dire", hint: "Minuté, face caméra" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const EXAMPLE_VIEWS = 10_000;

export function ProductTour() {
  const [tab, setTab] = useState<TabId>("liste");
  const today = useMemo(() => new Date(), []);

  // Un seul calcul pour les quatre onglets : mêmes produits, mêmes
  // verdicts, mêmes gains d'un onglet à l'autre. Basculer ne doit pas
  // changer les chiffres.
  const rows = useMemo(
    () =>
      PRODUCTS.map((product) => {
        const preset = SCENARIO_PRESETS.find((p) => p.id === product.presetId)!;
        const snapshots = buildScenarioSnapshots(preset.params, today);
        const verdict = computeVerdict(snapshots);
        const earnings = computeEarnings({
          expectedViews: EXAMPLE_VIEWS,
          followerRange: "5k_20k",
          niche: "beaute",
          medianConversionRate: DEFAULT_EARNINGS_CONFIG.defaultConversionRate,
          priceCents: product.priceCents,
          commissionRatePct: product.commissionRatePct,
          estimatedReturnRatePct: DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct,
        });
        return { product, snapshots, verdict, earnings };
      }),
    [today],
  );

  const lead = rows[0]!;

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Les écrans de l'application"
        className="grid grid-cols-2 gap-2 md:grid-cols-4"
      >
        {TABS.map((t) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t.id)}
              className="flex flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors"
              style={{
                backgroundColor: selected ? "var(--color-bg)" : "transparent",
                border: `1.5px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
              }}
            >
              <span className="text-sm font-bold">{t.label}</span>
              <span className="text-[11px] text-[color:var(--color-ink-muted)]">
                {t.hint}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="flex min-h-[22rem] flex-col gap-3 rounded-2xl p-4 sm:p-5"
        style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}
      >
        {tab === "liste" && (
          <>
            {rows.map(({ product, verdict }) => (
              <Row key={product.title} product={product}>
                <div className="flex flex-wrap items-center gap-2">
                  <VerdictBadge verdict={verdict.verdict} />
                  <span className="text-xs text-[color:var(--color-ink-muted)]">
                    {PHASE_LABELS[verdict.phase].short}
                  </span>
                </div>
              </Row>
            ))}
            <Caption>
              Chaque ligne porte la recommandation calculée sur ce produit —
              pas un score à interpréter.
            </Caption>
          </>
        )}

        {tab === "gains" && (
          <>
            {rows.map(({ product, earnings }) => (
              <Row key={product.title} product={product}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-xs text-[color:var(--color-ink-muted)]">
                    Pour {EXAMPLE_VIEWS.toLocaleString("fr-FR")} vues :
                  </span>
                  <EstimatedValue
                    range={earnings}
                    format={(v) =>
                      v.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        maximumFractionDigits: 0,
                      })
                    }
                    className="font-[family-name:var(--font-display)] text-base font-extrabold"
                  />
                </div>
              </Row>
            ))}
            <Caption>
              DÉMO : les montants sont calculés sur des produits fictifs, 10 000 vues
              et une commission indicative. Ce ne sont pas des commissions TikTok
              relevées sur un compte affilié ni une prévision de revenu.
            </Caption>
          </>
        )}

        {tab === "courbe" && (
          <>
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden>
                {lead.product.emoji}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{lead.product.title}</p>
                <p className="text-xs text-[color:var(--color-ink-muted)]">
                  {lead.product.shop}
                </p>
              </div>
            </div>
            <SnapshotChart snapshots={lead.snapshots} />
            <Caption>
              Les ventes, les boutiques qui le vendent et les créateurs qui en
              parlent, sur la même échelle de temps. C&apos;est là qu&apos;on
              voit une fenêtre se refermer.
            </Caption>
          </>
        )}

        {tab === "texte" && <BriefPreview row={lead} />}
      </div>

      <p className="text-center text-xs text-[color:var(--color-ink-muted)]">
        DÉMO — produits fictifs. Les moteurs tournent dans ton navigateur pour
        illustrer le fonctionnement ; dans KAIROS, les données collectées et les
        estimations calculées sont toujours identifiées séparément.
      </p>
    </div>
  );
}

function Row({
  product,
  children,
}: {
  product: TourProduct;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl p-3"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <span className="text-2xl" aria-hidden>
        {product.emoji}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-bold">{product.title}</p>
        <p className="text-xs text-[color:var(--color-ink-muted)]">
          {product.shop} · commission indicative (démo) : {product.commissionRatePct} % ·{" "}
          {(product.priceCents / 100).toFixed(2).replace(".", ",")} €
        </p>
        {children}
      </div>
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-auto text-xs leading-relaxed text-[color:var(--color-ink-muted)]">
      {children}
    </p>
  );
}

// Le brief est construit par le vrai `buildBrief` — accroches choisies
// selon la phase du produit, et interdits dérivés des règles de conformité
// elles-mêmes. On n'en montre que les premières secondes : ce qui se vend,
// c'est le script complet.
function BriefPreview({
  row,
}: {
  row: { product: TourProduct; verdict: ReturnType<typeof computeVerdict> };
}) {
  const brief = useMemo(
    () =>
      buildBrief({
        productId: "exemple",
        title: row.product.title,
        category: row.product.category,
        priceCents: row.product.priceCents,
        commissionRatePct: row.product.commissionRatePct,
        verdict: row.verdict,
        nicheBucket: "beaute",
        followerRange: "5k_20k",
        complianceRules: DEFAULT_COMPLIANCE_RULES_FR,
      }),
    [row],
  );

  // Les premières lignes seulement : de quoi comprendre la forme sans
  // livrer le contenu, qui est justement ce que le plan Creator débloque.
  const lines = brief.script.split("\n").filter(Boolean);
  const excerpt = lines.slice(0, 3);
  // Les points de suspension ne se posent que s'il y a réellement une
  // suite — sinon on montre tout en laissant croire qu'on en garde.
  const truncated = lines.length > excerpt.length;

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>
          {row.product.emoji}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{row.product.title}</p>
          <p className="text-xs text-[color:var(--color-ink-muted)]">
            Accroche choisie pour : {PHASE_LABELS[row.verdict.phase].short}
          </p>
        </div>
      </div>

      <div
        className="rounded-xl p-3"
        style={{ backgroundColor: "var(--color-success-soft)" }}
      >
        <p className="text-[11px] font-bold tracking-wide uppercase" style={{ color: "var(--color-success)" }}>
          La première phrase
        </p>
        <p className="mt-1 text-sm font-semibold">
          « {brief.hooks[0]?.spokenLine} »
        </p>
      </div>

      <pre
        className="overflow-x-auto rounded-xl p-3 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed whitespace-pre-wrap"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        {excerpt.join("\n")}
        {truncated && `\n… encore ${lines.length - excerpt.length} séquence${lines.length - excerpt.length > 1 ? "s" : ""}`}
      </pre>

      <Caption>
        Minuté seconde par seconde, avec le plan des images à filmer. La
        mention « Collaboration commerciale » est écrite dans le script — le
        même contrôle de conformité qui protège tes vidéos relit celui-ci.
      </Caption>
    </>
  );
}
