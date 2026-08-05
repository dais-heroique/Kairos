"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  buildBrief,
  evaluateCompliance,
  hasBlockingIssues,
  type ComplianceIssue,
} from "@kairos/core";
import {
  entitlementsOf,
  type Brief,
  type ComplianceRule,
  type ProductVerdict,
} from "@kairos/shared";
import { BottomNav } from "@/components/BottomNav";
import { RequireAuth } from "@/components/RequireAuth";
import { Teleprompter } from "@/components/Teleprompter";
import { useAuth } from "@/lib/firebase/auth-context";
import { getComplianceRules } from "@/lib/firestore/compliance-rules";
import { getRankingPageData } from "@/server/firestore/rankings";
import type { ProductRankItem } from "@/types/product-rank-item";

// Brief de tournage, généré à partir de l'analyse réelle du produit.
//
// Pas d'appel IA ici, et c'est délibéré : le plan Spark interdit les Cloud
// Functions, et une clé d'API n'a rien à faire dans un bundle navigateur.
// Un bouton branché sur Gemini serait donc resté grisé. La structure du
// brief se déduit de ce qu'on sait déjà — phase, saturation, catégorie,
// cadre légal — et l'IA viendra l'enrichir le jour où une clé existe.

function BriefContent() {
  const productId = useSearchParams().get("id") ?? "";
  const { userDoc } = useAuth();

  const [item, setItem] = useState<ProductRankItem | null | undefined>(undefined);
  const [rules, setRules] = useState<ComplianceRule[] | null>(null);
  const [teleprompter, setTeleprompter] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!productId) return;
    Promise.all([
      getRankingPageData("opportunities", "FR", "7d"),
      getRankingPageData("products", "FR", "7d"),
    ]).then(([a, b]) => {
      setItem(a.items.find((i) => i.id === productId) ?? b.items.find((i) => i.id === productId) ?? null);
    });
    getComplianceRules().then(setRules);
  }, [productId]);

  const entitlements = entitlementsOf(userDoc);

  const brief: Brief | null = useMemo(() => {
    if (!item || !rules || !userDoc) return null;
    // Le brief a besoin d'un verdict complet ; les items de classement en
    // portent les champs utiles depuis leur dénormalisation.
    const verdict = {
      phase: item.phase ?? "growth",
      daysInPhase: 0,
      saturationScore: item.saturationScore ?? 50,
      windowDaysRemaining: {
        low: item.windowDaysLow ?? 0,
        high: item.windowDaysHigh ?? 0,
        confidence: item.verdictConfidence ?? 0,
      },
      marginLowPct: 0,
      marginHighPct: 0,
      verdict: item.verdict,
      reasoning: item.reasoning ?? [],
      computedAt: new Date().toISOString(),
    } satisfies ProductVerdict;

    return buildBrief({
      productId: item.id,
      title: item.title,
      category: item.category ?? "",
      priceCents: item.priceCents,
      commissionRatePct: item.commissionRatePct,
      verdict,
      nicheBucket: userDoc.profile.niches[0] ?? "general",
      followerRange: userDoc.profile.followerRange,
      complianceRules: rules,
    });
  }, [item, rules, userDoc]);

  // Le script est repassé au Compliance Guard : c'est le même contrôle que
  // subira un script modifié à la main, donc le créateur voit tout de suite
  // ce qui se passerait s'il s'écartait du cadre.
  const issues: ComplianceIssue[] = useMemo(
    () => (brief && rules ? evaluateCompliance(brief.script, rules) : []),
    [brief, rules],
  );

  if (!productId) {
    return (
      <p className="kai-card m-5 text-sm text-[color:var(--color-ink-muted)]">
        Aucun produit demandé.{" "}
        <Link href="/tableau-de-bord" className="underline">
          Retour au tableau de bord
        </Link>
      </p>
    );
  }

  if (!entitlements.productDetail) {
    return (
      <div className="kai-card m-5 flex flex-col gap-2 text-sm">
        <p className="font-[family-name:var(--font-display)] font-bold">
          Le brief de tournage est réservé aux plans Creator et Pro
        </p>
        <p className="text-[color:var(--color-ink-muted)]">
          Accroches adaptées à la phase du produit, plan de tournage, script
          minuté et téléprompteur.
        </p>
      </div>
    );
  }

  if (item === undefined || !brief) {
    return <p className="p-5 text-sm text-[color:var(--color-ink-muted)]">Préparation du brief…</p>;
  }

  if (item === null) {
    return (
      <p className="kai-card m-5 text-sm text-[color:var(--color-ink-muted)]">
        Produit introuvable dans le classement du jour.{" "}
        <Link href="/classements/produits" className="underline">
          Voir les classements
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-4">
      <Link href={`/produit?id=${encodeURIComponent(item.id)}`} className="text-sm underline">
        ← {item.title}
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-extrabold">
          Brief de tournage
        </h1>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Construit sur la phase « {item.phase ?? "inconnue"} » du produit et le
          cadre légal français. Adapte-le, ne le récite pas.
        </p>
      </div>

      <section className="kai-card flex flex-col gap-2">
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          3 accroches à tester
        </h2>
        <p className="text-xs text-[color:var(--color-ink-muted)]">
          Choisies pour ce moment du cycle — arriver en premier ou en
          cinquantième n&apos;appelle pas la même vidéo.
        </p>
        <ol className="flex flex-col gap-2">
          {brief.hooks.map((hook, i) => (
            <li key={hook.type} className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-[color:var(--color-ink-muted)]">
                {i + 1} · {hook.type.replace(/_/g, " ")}
              </span>
              <span className="text-sm font-medium">« {hook.spokenLine} »</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="kai-card flex flex-col gap-2">
        <h2 className="font-[family-name:var(--font-display)] font-bold">Plan de tournage</h2>
        <ul className="flex flex-col gap-1.5">
          {brief.shotList.map((shot) => (
            <li key={shot.description} className="text-sm text-[color:var(--color-ink-muted)]">
              • {shot.description}
            </li>
          ))}
        </ul>
      </section>

      <section className="kai-card flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] font-bold">Script</h2>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={
              hasBlockingIssues(issues)
                ? { backgroundColor: "var(--color-coral-soft)", color: "var(--color-coral)" }
                : { backgroundColor: "var(--color-success-soft)", color: "var(--color-success)" }
            }
          >
            {hasBlockingIssues(issues) ? "à corriger" : "conforme"}
          </span>
        </div>
        <pre className="whitespace-pre-wrap font-[family-name:var(--font-mono)] text-xs leading-relaxed">
          {brief.script}
        </pre>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTeleprompter(true)}
            className="kai-btn-primary flex-1"
          >
            Téléprompteur
          </button>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard?.writeText(brief.script);
              setCopied(true);
            }}
            className="kai-btn-outline flex-1"
          >
            {copied ? "Copié ✓" : "Copier"}
          </button>
        </div>
      </section>

      {issues.length > 0 && (
        <section className="kai-card flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] font-bold">
            Points de vigilance détectés
          </h2>
          <ul className="flex flex-col gap-2">
            {issues.map((issue) => (
              <li key={issue.ruleId} className="text-sm">
                <span
                  className="font-semibold"
                  style={{
                    color:
                      issue.severity === "blocking"
                        ? "var(--color-coral)"
                        : "var(--color-warning)",
                  }}
                >
                  {issue.severity === "blocking" ? "Bloquant" : "Attention"} —{" "}
                </span>
                <span className="text-[color:var(--color-ink-muted)]">{issue.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="kai-card flex flex-col gap-2">
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          Objections à traiter
        </h2>
        <p className="text-xs text-[color:var(--color-ink-muted)]">
          {brief.objectionsSource === "generic"
            ? "Objections courantes de la catégorie — aucun commentaire réel n'est encore collecté, et on préfère le dire."
            : "Tirées des commentaires réels sur ce produit."}
        </p>
        <ul className="flex flex-col gap-1.5">
          {brief.objections.map((objection) => (
            <li key={objection} className="text-sm text-[color:var(--color-ink-muted)]">
              • {objection}
            </li>
          ))}
        </ul>
      </section>

      <section className="kai-card flex flex-col gap-2 border-l-4" style={{ borderColor: "var(--color-coral)" }}>
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          À ne pas faire
        </h2>
        <ul className="flex flex-col gap-2">
          {brief.doNots.map((rule) => (
            <li key={rule} className="text-sm leading-relaxed text-[color:var(--color-ink-muted)]">
              • {rule}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-[color:var(--color-ink-muted)]">
          Ces points viennent des règles de conformité en vigueur (loi n°
          2023-451 sur l&apos;influence commerciale, droit de la
          consommation). Ce n&apos;est pas un avis juridique.
        </p>
      </section>

      {teleprompter && (
        <Teleprompter script={brief.script} onClose={() => setTeleprompter(false)} />
      )}
    </div>
  );
}

export default function BriefPage() {
  return (
    <RequireAuth>
      <div className="flex min-h-dvh flex-col">
        <BottomNav />
        <Suspense fallback={<p className="p-5 text-sm">Chargement…</p>}>
          <BriefContent />
        </Suspense>
      </div>
    </RequireAuth>
  );
}
