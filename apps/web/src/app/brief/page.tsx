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
  freeBriefsRemaining,
  hookLabel,
  type Brief,
  type ComplianceRule,
  type ProductVerdict,
} from "@kairos/shared";
import { BottomNav } from "@/components/BottomNav";
import { PaywallGate } from "@/components/PaywallGate";
import {
  hasUnlockedBrief,
  listUnlockedBriefs,
  unlockBrief,
} from "@/lib/firestore/unlocked-briefs";
import { RequireAuth } from "@/components/RequireAuth";
import { Teleprompter } from "@/components/Teleprompter";
import { useAuth } from "@/lib/firebase/auth-context";
import { getComplianceRules } from "@/lib/firestore/compliance-rules";
import { getRankingPageData } from "@/server/firestore/rankings";
import { primaryMarketOf } from "@/lib/market";
import type { ProductRankItem } from "@/types/product-rank-item";

// Brief de tournage, généré à partir de l'analyse réelle du produit.
//
// Pas d'appel IA ici, et c'est délibéré : le plan Spark interdit les Cloud
// Functions, et une clé d'API n'a rien à faire dans un bundle navigateur.
// Un bouton branché sur Gemini serait donc resté grisé. La structure du
// brief se déduit de ce qu'on sait déjà — phase, saturation, catégorie,
// cadre légal — et l'IA viendra l'enrichir le jour où une clé existe.

// Aperçu inerte de ce à quoi ressemble un brief : du texte d'illustration,
// jamais un brief réellement calculé — c'est ce qu'on vend.
function BriefPreview() {
  return (
    <div className="kai-card flex flex-col gap-3">
      <p className="font-[family-name:var(--font-display)] font-bold">3 accroches à tester</p>
      <p className="text-sm">« POV : tu découvres ce produit avant tout le monde. »</p>
      <p className="text-sm">« J&apos;ai commandé en pensant que c&apos;était nul. »</p>
      <p className="font-[family-name:var(--font-display)] font-bold">Script</p>
      <p className="font-[family-name:var(--font-mono)] text-xs leading-relaxed">
        [0–3 s] Accroche · [3–8 s] Collaboration commerciale. · [8–15 s]
        Concrètement… · [15–22 s] Ce que j&apos;ai constaté… · [fin] Le lien est
        dans ma boutique.
      </p>
    </div>
  );
}

function BriefContent() {
  const productId = useSearchParams().get("id") ?? "";
  const { firebaseUser, userDoc } = useAuth();
  const market = primaryMarketOf(userDoc);

  const [item, setItem] = useState<ProductRankItem | null | undefined>(undefined);
  const [rules, setRules] = useState<ComplianceRule[] | null>(null);
  const [teleprompter, setTeleprompter] = useState(false);
  const [copied, setCopied] = useState(false);
  // `null` = on ne sait pas encore. Afficher un mur avant d'avoir compté
  // ferait clignoter le paywall sous les yeux de quelqu'un qui y a droit.
  const [freeAccess, setFreeAccess] = useState<
    { granted: boolean; remaining: number } | null
  >(null);

  useEffect(() => {
    if (!productId) return;
    Promise.all([
      getRankingPageData("opportunities", market, "7d"),
      getRankingPageData("products", market, "7d"),
    ]).then(([a, b]) => {
      setItem(a.items.find((i) => i.id === productId) ?? b.items.find((i) => i.id === productId) ?? null);
    });
    getComplianceRules().then(setRules);
  }, [market, productId]);

  const entitlements = entitlementsOf(userDoc);
  const paidBrief = entitlements.can("brief");

  // Quota du plan gratuit : la boucle complète est jouable une fois, texte
  // à dire compris. Quelqu'un qui a tourné une vidéo avec sait exactement
  // ce qu'il achète ensuite — c'est plus convaincant qu'une démonstration.
  useEffect(() => {
    if (paidBrief || !firebaseUser || !productId) return;
    let cancelled = false;

    (async () => {
      const [dejaOuvert, ouverts] = await Promise.all([
        hasUnlockedBrief(firebaseUser.uid, productId),
        listUnlockedBriefs(firebaseUser.uid),
      ]);
      if (cancelled) return;

      if (dejaOuvert) {
        // Revoir un brief déjà ouvert ne consomme rien : un quota qui se
        // viderait à chaque rechargement serait perçu comme une arnaque.
        setFreeAccess({ granted: true, remaining: freeBriefsRemaining(ouverts.length) });
        return;
      }

      const restants = freeBriefsRemaining(ouverts.length);
      if (restants > 0) {
        await unlockBrief(firebaseUser.uid, productId);
        if (!cancelled) setFreeAccess({ granted: true, remaining: restants - 1 });
      } else if (!cancelled) {
        setFreeAccess({ granted: false, remaining: 0 });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paidBrief, firebaseUser, productId]);

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

  if (!paidBrief && freeAccess === null) {
    return <p className="p-5 text-sm text-[color:var(--color-ink-muted)]">Préparation du brief…</p>;
  }

  if (!paidBrief && !freeAccess?.granted) {
    return (
      <div className="m-5">
        <PaywallGate
          capability="brief"
          entitlements={entitlements}
          title="Arrive devant la caméra avec le script déjà écrit"
          preview={<BriefPreview />}
        >
          <span />
        </PaywallGate>
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
    <div className="flex flex-1 flex-col gap-4 kai-shell py-4">
      <Link href={`/produit?id=${encodeURIComponent(item.id)}`} className="text-sm underline">
        ← {item.title}
      </Link>

      {/* Un quota muet vaut un quota absent : celui qui vient de consommer
          son brief gratuit doit savoir qu'il l'a consommé, et pourquoi le
          suivant ne sera pas gratuit. Le dire ici, une fois le brief
          affiché, plutôt qu'en travers de son chemin. */}
      {!paidBrief && freeAccess?.granted && (
        <div
          className="flex flex-col gap-1.5 rounded-xl p-3 text-sm"
          style={{ backgroundColor: "var(--color-coral-soft)" }}
        >
          <p className="font-bold" style={{ color: "var(--color-coral)" }}>
            {freeAccess.remaining > 0
              ? `Brief offert — il t'en reste ${freeAccess.remaining}`
              : "C'était ton brief offert"}
          </p>
          <p className="text-[color:var(--color-ink-muted)]">
            Tu peux revenir sur celui-ci autant de fois que tu veux. Pour en
            obtenir sur d&apos;autres produits, il faut passer en Creator.{" "}
            <Link href="/tarifs" className="underline">
              Voir ce que ça débloque
            </Link>
          </p>
        </div>
      )}

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
                {i + 1} · {hookLabel(hook.type)}
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
