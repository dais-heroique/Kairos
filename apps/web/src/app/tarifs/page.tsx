import type { Metadata } from "next";
import Link from "next/link";
import {
  CAPABILITIES,
  CAPABILITY_LABELS,
  CAPABILITIES_BY_PLAN,
  formatPlanPrice,
  newCapabilitiesOf,
  PLANS,
} from "@kairos/shared";
import { SITE_NAME } from "@/lib/seo/site";

// Page publique — donc indexable, et c'est aussi la destination de tous
// les paywalls de l'application.
//
// Elle est **entièrement dérivée** de `packages/shared/src/plans.ts` : il
// n'y a pas une seule fonctionnalité écrite à la main ici. C'est ce qui
// garantit qu'elle ne peut pas promettre ce que l'application ne délivre
// pas — le tableau ci-dessous et le contrôle d'accès lisent la même liste.

export const metadata: Metadata = {
  title: "Tarifs — gratuit pour commencer",
  description:
    "Le plan Radar est gratuit et donne accès au classement complet avec les verdicts. " +
    "Creator et Pro débloquent les gains détaillés, l'historique et le brief de tournage.",
  alternates: { canonical: "/tarifs" },
  openGraph: {
    title: `Tarifs ${SITE_NAME} — commence gratuitement`,
    description:
      "Classement complet et verdicts dès le plan gratuit. Sans carte bancaire.",
    url: "/tarifs",
  },
};

export default function TarifsPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[900px] flex-col gap-10 px-5 py-10">
      <header className="flex flex-col gap-3">
        <Link href="/" className="text-sm underline">
          ← {SITE_NAME}
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-tight">
          Commence gratuitement. Débloque quand ça devient ton métier.
        </h1>
        <p className="text-[color:var(--color-ink-muted)]">
          Le plan gratuit n&apos;est pas une démo bridée : tu vois le classement
          entier, avec le verdict de chaque produit. Ce que les plans payants
          ajoutent, c&apos;est le détail de <em>tes</em> gains et de quoi
          passer à la production.
        </p>
      </header>

      {/* grid-cols-1 explicite : sans lui les trois colonnes se tassaient
          sur un écran de téléphone, avec des libellés coupés mot à mot. */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLANS.map((plan, index) => {
          // Seul le premier plan liste tout : les suivants n'affichent que
          // ce qu'ils ajoutent. Répéter huit lignes identiques dans trois
          // colonnes noie précisément la différence qu'on cherche à vendre.
          const capabilities =
            index === 0 ? CAPABILITIES_BY_PLAN[plan.slug] : newCapabilitiesOf(plan.slug);
          const inherits = index > 0 ? PLANS[index - 1]!.name : null;
          return (
            <div
              key={plan.slug}
              className="kai-card flex flex-col gap-3"
              style={
                plan.popular
                  ? { borderColor: "var(--color-coral)", borderWidth: 2 }
                  : undefined
              }
            >
              {plan.popular && (
                <span
                  className="w-fit rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: "var(--color-coral-soft)",
                    color: "var(--color-coral)",
                  }}
                >
                  Le plus choisi
                </span>
              )}
              <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold">
                {plan.name}
              </h2>

              <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
                {formatPlanPrice(plan)}
              </p>
              <p className="text-sm text-[color:var(--color-ink-muted)]">{plan.tagline}</p>

              {inherits && (
                <p className="text-sm font-semibold">Tout {inherits}, plus :</p>
              )}
              <ul className="flex flex-1 flex-col gap-1.5">
                {capabilities.map((c) => (
                  <li key={c} className="flex gap-2 text-sm">
                    <span style={{ color: "var(--color-success)" }}>✓</span>
                    <span className="text-[color:var(--color-ink-muted)]">
                      {CAPABILITY_LABELS[c]}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.priceCents === 0 ? (
                <Link href="/connexion" className="kai-btn-primary text-center">
                  Créer mon compte
                </Link>
              ) : plan.priceCents === null ? (
                // Aucun paiement n'est branché : proposer un bouton
                // « Payer » qui ne mène nulle part serait pire que de dire
                // la vérité.
                <span
                  className="rounded-lg border px-4 py-2 text-center text-sm font-semibold text-[color:var(--color-ink-muted)]"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Pas encore ouvert
                </span>
              ) : (
                <Link href="/compte" className="kai-btn-primary text-center">
                  Passer en {plan.name}
                </Link>
              )}
            </div>
          );
        })}
      </section>

      {/* Tableau comparatif : la même information, mais lisible ligne à
          ligne quand on cherche une fonctionnalité précise. */}
      <section className="flex flex-col gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold">
          Le détail, ligne par ligne
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left font-semibold">Fonctionnalité</th>
                {PLANS.map((plan) => (
                  <th key={plan.slug} className="p-2 text-center font-semibold">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((capability) => (
                <tr
                  key={capability}
                  className="border-t"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <td className="p-2 text-[color:var(--color-ink-muted)]">
                    {CAPABILITY_LABELS[capability]}
                  </td>
                  {PLANS.map((plan) => {
                    const included = CAPABILITIES_BY_PLAN[plan.slug].includes(capability);
                    return (
                      <td key={plan.slug} className="p-2 text-center">
                        <span
                          style={{
                            color: included
                              ? "var(--color-success)"
                              : "var(--color-border)",
                          }}
                          aria-label={included ? "inclus" : "non inclus"}
                        >
                          {included ? "✓" : "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="kai-card flex flex-col gap-2 text-sm">
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          Ce qu&apos;on ne fait pas
        </h2>
        <p className="text-[color:var(--color-ink-muted)]">
          Pas de carte bancaire pour le plan gratuit, pas d&apos;engagement, pas
          de fonctionnalité annoncée qui n&apos;existe pas encore. Les tarifs
          Creator et Pro ne sont pas ouverts : quand ils le seront, ils
          s&apos;afficheront ici avant d&apos;être facturés à qui que ce soit.
        </p>
      </section>
    </main>
  );
}
