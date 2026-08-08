import type { Metadata } from "next";
import Link from "next/link";
import {
  CAPABILITIES,
  CAPABILITY_INFO,
  CAPABILITIES_BY_PLAN,
  PLANS,
  TYPICAL_WINDOW_DAYS,
} from "@kairos/shared";
import { PaywallDemo } from "@/components/PaywallDemo";
import { PlanCards } from "@/components/PlanCards";
import { PublicNav } from "@/components/PublicNav";
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
    <main className="min-h-dvh">
      <PublicNav />
      <div className="mx-auto flex max-w-[900px] flex-col gap-10 px-5 py-10">
      <header className="flex flex-col gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-tight">
          Un produit reste jouable {TYPICAL_WINDOW_DAYS.min} à{" "}
          {TYPICAL_WINDOW_DAYS.max} jours. Après, c&apos;est trop tard.
        </h1>
        <p className="text-[color:var(--color-ink-muted)]">
          Ce n&apos;est pas une formule : c&apos;est le temps que le calcul
          donne à un produit en croissance avant que tout le monde s&apos;y
          mette. Chaque semaine où tu ne regardes pas, des fenêtres se
          referment sans toi.
        </p>

        {/* L'urgence est réelle et vient du produit. Aucune fausse rareté
            (« plus que 3 places », « offre 24 h ») : ce sont exactement les
            formulations que le Compliance Guard signale comme trompeuses,
            et les interdire aux créateurs tout en s'en servant serait
            intenable. */}
        <div
          className="flex flex-col gap-2 rounded-xl p-4"
          style={{ backgroundColor: "var(--color-coral-soft)" }}
        >
          <p className="font-[family-name:var(--font-display)] font-bold" style={{ color: "var(--color-coral)" }}>
            Commence maintenant, gratuitement
          </p>
          <p className="text-sm">
            Pas de carte bancaire, pas d&apos;engagement, 30 secondes. Tu vois
            la liste complète et la recommandation sur chaque produit dès la
            première minute.
          </p>
          <Link href="/connexion" className="kai-btn-primary text-center">
            Créer mon compte gratuit
          </Link>
        </div>
      </header>

      {/* Les trois offres viennent du même composant que l'accueil, donc
          les deux pages ne peuvent plus diverger. Chaque carte n'affiche
          que son différentiel, plus un total — sans ce total, Pro
          n'ajoutant qu'une ligne, la carte la plus chère paraissait la
          plus vide. */}
      <PlanCards />

      <PaywallDemo />

      {/* Tableau comparatif. Il était `hidden md:flex` : sur téléphone on
          ne le voyait donc jamais, alors que c'est la seule vue qui répond
          à « qu'est-ce que je perds si je ne paie pas ». Le défilement
          horizontal d'origine était bien le problème — pas le tableau —
          donc sur petit écran il devient un dépliant fermé par défaut, et
          les colonnes de plan y tiennent en abrégé. */}
      <section className="flex flex-col gap-3">
        <details className="md:hidden" >
          <summary className="cursor-pointer list-none rounded-xl px-4 py-3 font-[family-name:var(--font-display)] font-bold"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            Le détail, ligne par ligne <span aria-hidden style={{ color: "var(--color-coral)" }}>+</span>
          </summary>
          <div className="pt-3">
            <ComparisonTable compact />
          </div>
        </details>

        <div className="hidden flex-col gap-3 md:flex">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold">
            Le détail, ligne par ligne
          </h2>
          <ComparisonTable />
        </div>
      </section>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-[family-name:var(--font-display)] text-xl font-extrabold">
          Le temps que tu hésites, la fenêtre se referme.
        </p>
        <Link href="/connexion" className="kai-btn-primary">
          Créer mon compte gratuit
        </Link>
        <p className="text-xs text-[color:var(--color-ink-muted)]">
          Sans carte bancaire. Tu peux tout supprimer en un clic.
        </p>
      </div>

      <section className="kai-card flex flex-col gap-3 text-sm">
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          Où en est l&apos;app, honnêtement
        </h2>
        <p className="text-[color:var(--color-ink-muted)]">
          Ce qui marche aujourd&apos;hui : la liste des produits avec la
          recommandation pour chacun, le calcul de ce que tu toucherais, la
          liste de suivi, et le texte à dire face caméra. Tu peux t&apos;en
          servir maintenant.
        </p>
        <p className="text-[color:var(--color-ink-muted)]">
          Ce qui n&apos;y est pas encore : les messages d&apos;alerte, et le
          fait de revoir les listes des semaines passées. C&apos;est marqué
          « pas encore là » partout où ça apparaît, plutôt que noyé dans une
          liste où tout se ressemble.
        </p>
        <p className="text-[color:var(--color-ink-muted)]">
          Et surtout : les produits ne sont pas encore récupérés
          automatiquement depuis TikTok Shop. Ils sont relevés à la main, un
          par un, tous les jours. C&apos;est plus lent, mais les chiffres
          viennent de l&apos;espace affilié officiel, pas d&apos;une
          estimation faite de loin.
        </p>
        <h3 className="font-[family-name:var(--font-display)] font-bold">
          Ce qu&apos;on ne fait pas
        </h3>
        <p className="text-[color:var(--color-ink-muted)]">
          Pas de carte bancaire pour le plan gratuit, pas d&apos;engagement, pas
          de fonctionnalité annoncée qui n&apos;existe pas encore. Les tarifs
          Creator et Pro ne sont pas ouverts : quand ils le seront, ils
          s&apos;afficheront ici avant d&apos;être facturés à qui que ce soit.
        </p>
      </section>
      </div>
    </main>
  );
}

/**
 * Le tableau des capacités par plan. `compact` sert la version téléphone :
 * les en-têtes de colonne passent en initiale et la première colonne
 * rétrécit, de sorte que les trois plans tiennent sans défilement
 * horizontal — c'était le vrai défaut, pas le tableau lui-même.
 */
function ComparisonTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "" : "overflow-x-auto"}>
      <table
        className={`w-full border-collapse ${compact ? "text-[13px]" : "min-w-[520px] text-sm"}`}
      >
        <thead>
          <tr>
            <th className="p-2 text-left font-semibold">Fonctionnalité</th>
            {PLANS.map((plan) => (
              <th key={plan.slug} className="p-2 text-center font-semibold">
                <abbr title={plan.name} className="no-underline">
                  {compact ? plan.name.charAt(0) : plan.name}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CAPABILITIES.map((capability) => (
            <tr key={capability} className="border-t" style={{ borderColor: "var(--color-border)" }}>
              <td className="p-2 text-[color:var(--color-ink-muted)]">
                {CAPABILITY_INFO[capability].label}
                {CAPABILITY_INFO[capability].status === "soon" && (
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
              </td>
              {PLANS.map((plan) => {
                const included = CAPABILITIES_BY_PLAN[plan.slug].includes(capability);
                return (
                  <td key={plan.slug} className="p-2 text-center">
                    <span
                      style={{
                        color: included ? "var(--color-success)" : "var(--color-border)",
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
  );
}
