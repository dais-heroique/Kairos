import Link from "next/link";
import {
  CAPABILITIES_BY_PLAN,
  CAPABILITY_INFO,
  FOUNDING_PRICE_LOCK,
  FREE_PLAN_NOTES,
  formatPlanPrice,
  newCapabilitiesOf,
  PLANS,
} from "@kairos/shared";
import { SubscribeButton } from "@/components/SubscribeButton";

// Les trois offres, une seule fois, dérivées de `packages/shared/plans.ts`.
//
// Deux défauts corrigés ici, et ils se contredisaient :
//
// 1. Sur l'accueil, chaque colonne listait **tout** ce que le plan donne.
//    Sur 21 lignes affichées, 17 étaient des doublons : les trois colonnes
//    se ressemblaient au point qu'on ne pouvait pas voir ce que Creator
//    ajoutait sans les comparer mot à mot. C'est exactement la différence
//    qu'on cherche à vendre.
//
// 2. Sur `/tarifs`, l'inverse : le motif « Tout Creator, plus : » ne
//    laissait à Pro qu'**une seule ligne** et 40 % de carte blanche. Le
//    plan le plus cher paraissait le plus vide.
//
// La réponse aux deux : n'afficher que le différentiel (ce que ce palier
// ajoute), mais donner à chaque carte la même ossature — accroche, ce que
// ça ajoute, total hérité — pour qu'aucune ne paraisse creuse.

export function PlanCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {PLANS.map((plan, index) => {
        const isFirst = index === 0;
        const added = isFirst ? [...CAPABILITIES_BY_PLAN[plan.slug]] : newCapabilitiesOf(plan.slug);
        const inherits = isFirst ? null : PLANS[index - 1]!.name;
        const total = CAPABILITIES_BY_PLAN[plan.slug].length;

        return (
          <div
            key={plan.slug}
            className="relative flex h-full flex-col gap-3 rounded-2xl p-5"
            style={{
              backgroundColor: "var(--color-bg)",
              border: plan.popular
                ? "2px solid var(--color-coral)"
                : "1px solid var(--color-border)",
            }}
          >
            {plan.popular && (
              <span
                className="absolute -top-3 left-5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                style={{
                  backgroundColor: "var(--color-coral)",
                  color: "var(--color-coral-ink)",
                }}
              >
                Le plus choisi
              </span>
            )}

            <div>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold">
                {plan.name}
              </h3>
              <p className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-extrabold">
                {formatPlanPrice(plan)}
              </p>
              <p className="text-sm text-[color:var(--color-ink-muted)]">{plan.tagline}</p>
            </div>

            {/* L'accroche du palier, en une phrase : c'est elle qu'on lit en
                premier, et souvent la seule chose qu'on lit. */}
            <p
              className="rounded-xl p-3 text-sm font-semibold"
              style={{
                backgroundColor: plan.popular
                  ? "var(--color-coral-soft)"
                  : "var(--color-surface)",
                color: plan.popular ? "var(--color-coral)" : "var(--color-ink)",
              }}
            >
              {plan.highlight}
            </p>

            <p className="text-sm font-semibold">
              {inherits ? `Tout ${inherits}, plus :` : "Ce que tu as tout de suite :"}
            </p>

            <ul className="flex flex-1 flex-col gap-2">
              {added.map((capability) => {
                const info = CAPABILITY_INFO[capability];
                return (
                  <li key={capability} className="flex items-start gap-2 text-sm">
                    <span
                      aria-hidden
                      className="mt-0.5 shrink-0"
                      style={{ color: "var(--color-success)" }}
                    >
                      ✓
                    </span>
                    <span className="text-[color:var(--color-ink-muted)]">
                      {info.label}
                      {/* Marqué à l'endroit exact où la fonctionnalité est
                          annoncée, jamais dans une note de bas de page. */}
                      {info.status === "soon" && (
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
                );
              })}
            </ul>

            {/* Les limites du gratuit, annoncées ici et pas découvertes à
                l'usage : un plafond qu'on rencontre après coup donne le
                sentiment d'avoir été attiré sous un faux prétexte. */}
            {isFirst && (
              <ul className="flex flex-col gap-1.5">
                {FREE_PLAN_NOTES.map((note) => (
                  <li
                    key={note}
                    className="flex items-start gap-2 text-xs text-[color:var(--color-ink-muted)]"
                  >
                    <span aria-hidden className="mt-0.5 shrink-0">
                      •
                    </span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* L'hérité, replié. Pro n'ajoute qu'une ligne : sans ceci, sa
                carte est aux deux tiers vide et le plan le plus cher se lit
                comme le plus pauvre. Le déplier montre les huit autres —
                de l'information réelle à la place d'un trou, et sans
                réintroduire les doublons qui rendaient les trois colonnes
                indistinguables. */}
            {inherits && (
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-[color:var(--color-ink-muted)]">
                  <span>
                    Et tout ce qui vient de {inherits} (
                    {total - added.length})
                  </span>
                  <span
                    aria-hidden
                    className="transition-transform group-open:rotate-45"
                    style={{ color: "var(--color-coral)" }}
                  >
                    +
                  </span>
                </summary>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {CAPABILITIES_BY_PLAN[plan.slug]
                    .filter((c) => !added.includes(c))
                    .map((capability) => (
                      <li
                        key={capability}
                        className="flex items-start gap-2 text-xs text-[color:var(--color-ink-muted)]"
                      >
                        <span aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--color-border)" }}>
                          ✓
                        </span>
                        <span>{CAPABILITY_INFO[capability].label}</span>
                      </li>
                    ))}
                </ul>
              </details>
            )}

            {/* Ce total rééquilibre les colonnes : Pro n'ajoute qu'une ligne,
                mais en donne neuf. */}
            <p
              className="border-t pt-3 text-xs font-semibold text-[color:var(--color-ink-muted)]"
              style={{ borderColor: "var(--color-border)" }}
            >
              {total} fonctionnalité{total > 1 ? "s" : ""} au total
            </p>

            {!compact && <PlanCta plan={plan} />}
          </div>
        );
      })}
    </div>
  );
}

function PlanCta({ plan }: { plan: (typeof PLANS)[number] }) {
  if (plan.priceCents === 0) {
    return (
      <Link href="/connexion" className="kai-btn-primary text-center">
        Créer mon compte — 30 secondes
      </Link>
    );
  }

  // Aucun tarif décidé : un bouton « Payer » qui ne mène nulle part serait
  // pire que de dire la vérité. Mais laisser un pavé mort ne sert personne
  // — on renvoie vers la seule action qui existe.
  if (plan.priceCents === null) {
    return (
      <div className="flex flex-col gap-1.5">
        <Link href="/connexion" className="kai-btn-outline text-center">
          Commencer gratuitement en attendant
        </Link>
        {FOUNDING_PRICE_LOCK && (
          <p
            className="text-center text-[11px] font-semibold"
            style={{ color: "var(--color-coral)" }}
          >
            Les inscrits d&apos;aujourd&apos;hui garderont le tarif de lancement.
          </p>
        )}
      </div>
    );
  }

  // Un tarif est posé : le bouton démarre le paiement. `SubscribeButton`
  // vérifie lui-même que l'encaissement est branché (Worker + identifiant
  // de prix) et retombe sur l'inscription gratuite sinon — poser un prix
  // dans `plans.ts` ne suffit donc pas à faire apparaître un bouton mort.
  return (
    <SubscribeButton
      plan={plan.slug as "creator" | "pro"}
      label={`Passer en ${plan.name}`}
    />
  );
}
