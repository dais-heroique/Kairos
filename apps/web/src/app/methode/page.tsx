import type { Metadata } from "next";
import Link from "next/link";
import {
  DEFAULT_EARNINGS_CONFIG,
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_VERDICT_THRESHOLDS,
} from "@kairos/core";
import { SITE_NAME } from "@/lib/seo/site";

// Page publique, et c'était le vrai trou de référencement : tout le reste
// de l'app est derrière <RequireAuth>, donc Google n'avait strictement
// rien à indexer à part la page d'accueil et les mentions légales. Un site
// de trois pages ne se positionne sur rien.
//
// Elle n'est pas remplie de mots-clés : elle décrit la méthode réellement
// implémentée, en tirant ses chiffres des constantes de `packages/core`.
// Si les seuils changent, la page change avec eux — elle ne peut donc pas
// devenir un discours marketing qui ne correspond plus au produit.

export const metadata: Metadata = {
  title: "Comment on décide qu'un produit TikTok Shop vaut encore le coup",
  description:
    "La méthode KAIROS en clair : les cinq phases de vie d'un produit TikTok Shop, " +
    "les cinq indicateurs de saturation, le calcul du gain créateur, et pourquoi " +
    "on n'affiche jamais un chiffre sans sa fourchette.",
  alternates: { canonical: "/methode" },
  openGraph: {
    title: "La méthode KAIROS — quand entrer sur un produit TikTok Shop",
    description:
      "Cinq phases, cinq indicateurs de saturation, une fenêtre de tir estimée. " +
      "Expliqué sans jargon.",
    url: "/methode",
  },
};

const t = DEFAULT_VERDICT_THRESHOLDS;
const w = DEFAULT_SCORING_WEIGHTS;

const PHASES = [
  {
    name: "Émergence",
    days: `moins de ${t.phaseTransitionDays.emergenceMaxDays} jours`,
    what: "Les ventes montent, presque personne n'en parle encore.",
    todo: "C'est le meilleur moment. Peu de vidéos concurrentes, l'algorithme n'a pas encore vu le produit cent fois.",
  },
  {
    name: "Croissance",
    days: `jusqu'à ${t.phaseTransitionDays.growthMaxDays} jours`,
    what: "Les ventes accélèrent franchement et les premiers créateurs arrivent.",
    todo: "Encore très jouable, mais il faut publier vite plutôt que parfait.",
  },
  {
    name: "Fin de croissance",
    days: `jusqu'à ${t.phaseTransitionDays.lateGrowthMaxDays} jours`,
    what: "Ça monte encore, mais moins vite, et la concurrence est là.",
    todo: "Il faut un angle : un usage détourné, une objection traitée, un format que personne n'a fait.",
  },
  {
    name: "Maturité",
    days: "au-delà",
    what: "Les ventes stagnent, beaucoup de boutiques vendent la même chose.",
    todo: "Le rapport effort/gain devient mauvais pour un compte qui débute.",
  },
  {
    name: "Déclin",
    days: "—",
    what: "Les ventes reculent, les prix baissent, les créateurs partent.",
    todo: "À laisser passer, sauf angle vraiment original.",
  },
];

const SATURATION = [
  { label: "Boutiques concurrentes", weight: w.competingShops, why: "Plus il y a de vendeurs, plus la commission et l'attention se divisent." },
  { label: "Densité de créateurs", weight: w.creatorDensity, why: "Si 50 personnes ont déjà fait la vidéo, la tienne arrive 51e." },
  { label: "Chute du prix sur 14 jours", weight: w.priceDropAmplitude14d, why: "Une guerre des prix signale que les vendeurs se battent déjà pour écouler." },
  { label: "Arrivée de vendeurs sur 7 jours", weight: w.newSellerArrivalRate7d, why: "La vitesse compte autant que le nombre : dix nouveaux en une semaine, c'est une ruée." },
  { label: "Décélération des avis", weight: w.reviewVelocityDeceleration, why: "Les avis ralentissent avant les ventes — c'est un signal avancé." },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-3">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function MethodePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[720px] flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-3">
        <Link href="/" className="text-sm underline">
          ← {SITE_NAME}
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-tight">
          Comment on décide qu&apos;un produit TikTok Shop vaut encore le coup
        </h1>
        <p className="text-[color:var(--color-ink-muted)]">
          Un produit qui cartonne aujourd&apos;hui peut être saturé dans cinq
          jours. Toute la question est de savoir où il en est de son cycle —
          pas combien il a vendu hier. Voici la méthode, en clair, avec les
          seuils réellement utilisés.
        </p>
      </header>

      <Section id="phases" title="1. Les cinq phases de vie d'un produit">
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          La phase est déduite de l&apos;évolution des ventes estimées entre le
          début et la fin de la série de relevés, pas d&apos;une seule journée.
        </p>
        <div className="flex flex-col gap-3">
          {PHASES.map((phase) => (
            <div key={phase.name} className="kai-card flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">{phase.name}</h3>
                <span className="text-xs text-[color:var(--color-ink-muted)]">
                  {phase.days}
                </span>
              </div>
              <p className="text-sm">{phase.what}</p>
              <p className="text-sm text-[color:var(--color-ink-muted)]">{phase.todo}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="saturation" title="2. Cinq indicateurs de saturation, pondérés">
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          La saturation est notée sur 100. Elle ne mesure pas si le produit se
          vend, mais s&apos;il reste de la place pour toi.
        </p>
        <ul className="flex flex-col gap-2">
          {SATURATION.map((indicator) => (
            <li key={indicator.label} className="kai-card flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{indicator.label}</span>
                <span className="font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-ink-muted)]">
                  {Math.round(indicator.weight * 100)}%
                </span>
              </div>
              <p className="text-sm text-[color:var(--color-ink-muted)]">{indicator.why}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm">
          Au-delà de {t.verdictScoreBands.entrerMaintenantMax}/100, il faut un
          angle. Au-delà de {t.verdictScoreBands.risqueMax}/100, mieux vaut
          passer son tour. Et si la saturation bondit de{" "}
          {t.saturationSpikeDeltaPoints} points en{" "}
          {t.saturationSpikeWindowDays} jours, le verdict est revu à la baisse
          même si les ventes montent encore — c&apos;est le cas typique du
          produit sur lequel tout le monde se rue en même temps.
        </p>
      </Section>

      <Section id="gains" title="3. Ton gain, pas le chiffre d'affaires de la boutique">
        <p className="text-sm">
          La plupart des outils affichent le volume de ventes total du produit.
          C&apos;est flatteur et inutile : ce n&apos;est pas ton argent. Le
          calcul ici part de <em>tes</em> vues :
        </p>
        <div className="kai-card font-[family-name:var(--font-mono)] text-sm leading-relaxed">
          tes vues × taux de conversion × prix × commission ×
          (1 − taux de retour)
        </div>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Avec {DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct}% de retours
          déduits par défaut, et un taux de conversion volontairement prudent
          de {(DEFAULT_EARNINGS_CONFIG.defaultConversionRate * 100).toFixed(2)}%
          — soit environ 2 commandes pour 1 000 vues. Surestimer ce chiffre est
          la faute la plus facile à commettre, et celle qui coûte le plus cher :
          tu tournes la vidéo, tu touches le dixième de ce qui t&apos;était
          annoncé, et tu ne reviens pas.
        </p>
      </Section>

      <Section id="honnetete" title="4. Ce qu'on refuse d'afficher">
        <ul className="flex flex-col gap-2 text-sm">
          <li className="kai-card">
            <strong>Jamais un nombre nu.</strong> Toute estimation arrive avec
            sa fourchette basse–haute, son niveau de confiance et sa méthode de
            calcul. Une règle automatique refuse le code qui tenterait
            d&apos;afficher un chiffre seul.
          </li>
          <li className="kai-card">
            <strong>En dessous de {t.minSnapshotsAbsolute} relevés, pas de
            verdict.</strong> Le produit reste affiché, avec écrit noir sur
            blanc que son historique est trop court. Il n&apos;est pas masqué,
            et il ne reçoit pas non plus une note flatteuse par défaut.
          </li>
          <li className="kai-card">
            <strong>Un trou dans les relevés se voit.</strong> Au-delà de{" "}
            {t.maxAllowedGapDays} jours sans donnée, la confiance sur la fenêtre
            restante baisse, et la raison est écrite.
          </li>
          <li className="kai-card">
            <strong>Aucune donnée revendue.</strong> Tu peux exporter ou
            supprimer l&apos;intégralité de ton compte depuis l&apos;application,
            sans écrire à personne.
          </li>
        </ul>
      </Section>

      <Section id="limites" title="5. Les limites, dites franchement">
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          KAIROS est indépendant de TikTok et de ByteDance — ni partenaire, ni
          porte-parole. Le marché couvert est la France uniquement. Les seuils
          ci-dessus sont des valeurs de départ défendables, pas des vérités
          révélées : ils se calibreront avec le volume de données. Et une
          estimation reste une estimation, même accompagnée de sa fourchette.
        </p>
      </Section>

      <div className="kai-card flex flex-col items-center gap-3 text-center">
        <p className="font-[family-name:var(--font-display)] text-lg font-bold">
          Voir ce que ça donne sur les produits du moment
        </p>
        <Link href="/connexion" className="kai-btn-primary">
          Créer mon compte gratuit
        </Link>
        <p className="text-xs text-[color:var(--color-ink-muted)]">
          Sans carte bancaire, sans engagement.
        </p>
      </div>
    </main>
  );
}
