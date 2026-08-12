"use client";

import Link from "next/link";
import { SubscribeButton } from "@/components/SubscribeButton";
import type { ReactNode } from "react";
import {
  CAPABILITY_INFO,
  FOUNDING_PRICE_LOCK,
  formatPlanPrice,
  newCapabilitiesOf,
  planUnlocking,
  type Capability,
  type Entitlements,
} from "@kairos/shared";

// Un paywall qui affiche « réservé aux abonnés » et rien d'autre est une
// porte fermée : l'utilisateur ne sait pas ce qu'il rate, donc il ne paie
// pas, il s'en va. Celui-ci montre *ce qu'il y a derrière* — la vraie
// interface, floutée et inerte — puis dit précisément ce que débloque le
// plan et ce qu'il coûte.
//
// Le flou est décoratif et le composant est côté client : ce n'est pas une
// mesure de sécurité et ça ne prétend pas l'être. Ce qui doit être
// réellement protégé l'est dans `firestore.rules` (voir l'historique des
// relevés). Le rôle de ce composant est commercial, pas défensif.

export function PaywallGate({
  capability,
  entitlements,
  title,
  /** Aperçu inerte de ce qui est verrouillé — jamais la vraie donnée. */
  preview,
  /**
   * Urgence réelle, calculée sur le produit qu'on est en train de
   * regarder : « il te reste 12 à 30 jours ». C'est le seul moment où
   * l'urgence est à la fois vraie et pertinente — elle vient de la
   * donnée, pas d'un compte à rebours fabriqué.
   */
  urgency,
  children,
}: {
  capability: Capability;
  entitlements: Entitlements;
  title: string;
  preview?: ReactNode;
  urgency?: string | undefined;
  children: ReactNode;
}) {
  if (entitlements.can(capability)) return <>{children}</>;

  const plan = planUnlocking(capability);
  const unlocked = newCapabilitiesOf(plan.slug);

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--color-border)" }}
    >
      {/* L'aperçu est empilé au-dessus du bloc d'offre, jamais superposé en
          absolu : une superposition dépend de la hauteur de l'aperçu, et
          elle écrasait le contenu ou laissait un grand vide selon le cas.
          Ici la hauteur est bornée et le dégradé fait la transition. */}
      {preview && (
        <div className="relative max-h-40 overflow-hidden">
          <div className="pointer-events-none select-none blur-[5px] saturate-50" aria-hidden>
            {preview}
          </div>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 20%, var(--color-bg) 95%)",
            }}
            aria-hidden
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span
              className="w-fit rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{ backgroundColor: "var(--color-coral-soft)", color: "var(--color-coral)" }}
            >
              {plan.name} · {formatPlanPrice(plan)}
            </span>
            <p className="font-[family-name:var(--font-display)] font-bold">{title}</p>
          </div>

          {urgency && (
            <p
              className="rounded-lg px-3 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--color-coral-soft)",
                color: "var(--color-coral)",
              }}
            >
              {urgency}
            </p>
          )}

          {/* Ce que le palier apporte, en entier : la décision se prend sur
              la valeur totale, pas sur la seule fonctionnalité qu'on vient
              de heurter. */}
          <ul className="flex flex-col gap-1">
            {unlocked.map((c) => (
              <li key={c} className="flex gap-2 text-sm text-[color:var(--color-ink-muted)]">
                <span style={{ color: "var(--color-success)" }}>✓</span>
                <span className={c === capability ? "font-semibold text-[color:var(--color-ink)]" : ""}>
                  {CAPABILITY_INFO[c].label}
                  {CAPABILITY_INFO[c].status === "soon" && (
                    <span
                      className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap"
                      style={{
                        backgroundColor: "var(--color-warning-soft)",
                        color: "var(--color-warning)",
                      }}
                    >
                      pas encore là
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {/* Le paiement démarre **ici**, pas après un détour par /tarifs.
              Ce bloc s'affiche au moment précis où quelqu'un vient de
              buter sur une limite : c'est le point d'intention le plus
              haut du parcours, et l'envoyer relire une grille tarifaire
              lui donne surtout l'occasion de refermer l'onglet.
              `SubscribeButton` vérifie lui-même que l'encaissement est
              branché et retombe sur l'inscription sinon — aucun bouton
              mort n'est possible. */}
          {plan.priceCents === null ? (
            <Link href="/tarifs" className="kai-btn-primary text-center">
              Voir les offres
            </Link>
          ) : (
            <>
              <SubscribeButton
                plan={plan.slug as "creator" | "pro"}
                label={`Passer en ${plan.name}`}
              />
              <Link
                href="/tarifs"
                className="text-center text-xs underline text-[color:var(--color-ink-muted)]"
              >
                Comparer les offres d&apos;abord
              </Link>
            </>
          )}
          {FOUNDING_PRICE_LOCK && plan.priceCents === null && (
            <p className="text-center text-[11px] text-[color:var(--color-ink-muted)]">
              Les inscrits d&apos;aujourd&apos;hui gardent le tarif de lancement.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Version compacte, pour une valeur isolée dans une liste (un gain masqué
 * sur une ligne de classement, par exemple) : on garde la ligne visible et
 * on ne floute que le chiffre. Masquer la ligne entière ferait croire que
 * le produit n'existe pas.
 */
export function LockedValue({ hint }: { hint?: string }) {
  return (
    <Link
      href="/tarifs"
      className="inline-flex items-center gap-1.5 align-middle"
      title={hint ?? "Débloquer avec un plan payant"}
    >
      <span
        className="inline-block h-3 w-16 rounded align-middle"
        style={{ backgroundColor: "var(--color-border)" }}
        aria-hidden
      />
      <span className="text-xs font-semibold" style={{ color: "var(--color-coral)" }}>
        débloquer
      </span>
    </Link>
  );
}
