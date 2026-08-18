import type { Metadata } from "next";
import Link from "next/link";
import {
  DEFAULT_EARNINGS_CONFIG,
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_VERDICT_THRESHOLDS,
} from "@kairos/core";
import { PublicNav } from "@/components/PublicNav";
import { VerdictPlayground } from "@/components/VerdictPlayground";
import { PHASE_LABELS, type Phase } from "@kairos/shared";

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
  title: "Comment on sait si un produit TikTok Shop vaut encore le coup",
  description:
    "Expliqué simplement : les cinq moments de vie d'un produit TikTok Shop, " +
    "ce qui fait qu'il devient trop concurrentiel, comment on calcule ce que tu " +
    "toucherais, et pourquoi on ne donne jamais un chiffre tout seul.",
  alternates: { canonical: "/methode" },
  openGraph: {
    title: "Comment savoir si c'est encore le moment — KAIROS",
    description:
      "Essaie toi-même : bouge les curseurs et vois la réponse changer en direct.",
    url: "/methode",
  },
};

const t = DEFAULT_VERDICT_THRESHOLDS;
const w = DEFAULT_SCORING_WEIGHTS;

// Libellés lus dans packages/shared : les mêmes mots qu'à l'écran dans
// l'application, pour que la page n'invente pas son propre vocabulaire.
const PHASE_ORDER: Phase[] = ["emergence", "growth", "late_growth", "maturity", "decline"];
const PHASE_DAYS: Record<Phase, string> = {
  emergence: `moins de ${t.phaseTransitionDays.emergenceMaxDays} jours`,
  growth: `jusqu'à ${t.phaseTransitionDays.growthMaxDays} jours`,
  late_growth: `jusqu'à ${t.phaseTransitionDays.lateGrowthMaxDays} jours`,
  maturity: "au-delà",
  decline: "—",
};

const SATURATION = [
  { label: "Combien de boutiques le vendent", weight: w.competingShops, why: "Plus il y a de vendeurs, plus l'attention et l'argent se divisent." },
  { label: "Combien de créateurs en parlent", weight: w.creatorDensity, why: "Si 50 personnes ont déjà fait la vidéo, la tienne arrive 51e." },
  { label: "De combien le prix a baissé en 2 semaines", weight: w.priceDropAmplitude14d, why: "Quand les vendeurs cassent les prix, c'est qu'ils se battent déjà pour écouler." },
  { label: "Combien de vendeurs sont arrivés cette semaine", weight: w.newSellerArrivalRate7d, why: "La vitesse compte autant que le nombre : dix nouveaux en une semaine, c'est la ruée." },
  { label: "Si les avis arrivent moins vite qu'avant", weight: w.reviewVelocityDeceleration, why: "Les avis ralentissent avant les ventes — ça prévient à l'avance." },
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
    <main className="min-h-dvh">
      <PublicNav />
      <div className="mx-auto flex max-w-[720px] flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-tight">
          Comment on sait si un produit TikTok Shop vaut encore le coup
        </h1>
        <p className="text-[color:var(--color-ink-muted)]">
          La vraie question n&apos;est pas combien un produit a vendu hier,
          mais s&apos;il te reste de la place dessus. Voici comment on y
          répond, avec les chiffres qu&apos;on utilise vraiment — et en
          disant lesquels sont mesurés et lesquels sont estimés.
        </p>
      </header>

      {/* Le moteur tourne dans le navigateur : plutôt que de décrire la
          méthode, on la met entre les mains du visiteur. */}
      <Section id="essayer" title="Essaie toi-même">
        <p
          className="rounded-xl px-3 py-2 text-sm font-semibold"
          style={{ backgroundColor: "var(--color-warning-soft)", color: "var(--color-warning)" }}
        >
          DÉMO interactive : les scénarios et chiffres ci-dessous sont des
          données de démonstration. Le moteur calcule réellement la réponse,
          mais ce ne sont pas des relevés live d&apos;un produit TikTok Shop.
        </p>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Ci-dessous, c&apos;est le vrai calcul qui tourne, en direct. Tape
          sur une situation, ou pousse les curseurs jusqu&apos;à faire changer
          la réponse — c&apos;est le plus rapide pour comprendre ce qu&apos;on
          regarde.
        </p>
        <VerdictPlayground />
      </Section>

      <Section id="phases" title="Les cinq moments de vie d'un produit">
        <div className="flex flex-col gap-2">
          {PHASE_ORDER.map((phase) => (
            <details key={phase} className="kai-card">
              <summary className="flex cursor-pointer items-baseline justify-between gap-2">
                <span className="font-semibold">{PHASE_LABELS[phase].short}</span>
                <span className="text-xs text-[color:var(--color-ink-muted)]">
                  {PHASE_DAYS[phase]}
                </span>
              </summary>
              <p className="mt-2 text-sm">{PHASE_LABELS[phase].meaning}</p>
              <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
                {PHASE_LABELS[phase].advice}
              </p>
            </details>
          ))}
        </div>
      </Section>

      <Section id="saturation" title="Ce qu'on regarde, et ce qui pèse le plus">
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          On note la concurrence sur 100. Ça ne dit pas si le produit se vend
          bien — ça dit s&apos;il reste de la place pour toi.
        </p>
        {/* Le poids se voit à la longueur de la barre : on comprend d'un
            coup d'œil que la concurrence pèse trois fois la décélération
            des avis, sans avoir à comparer cinq pourcentages. */}
        <ul className="flex flex-col gap-3">
          {SATURATION.map((indicator) => (
            <li key={indicator.label} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">{indicator.label}</span>
                <span className="font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-ink-muted)]">
                  {Math.round(indicator.weight * 100)}%
                </span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${indicator.weight * 100 * 3}%`,
                    backgroundColor: "var(--color-coral)",
                  }}
                />
              </div>
              <p className="text-xs text-[color:var(--color-ink-muted)]">{indicator.why}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm">
          Au-delà de {t.verdictScoreBands.entrerMaintenantMax} sur 100, il te
          faut un angle. Au-delà de {t.verdictScoreBands.risqueMax}, mieux vaut
          passer ton tour. Et si la concurrence bondit de{" "}
          {t.saturationSpikeDeltaPoints} points en{" "}
          {t.saturationSpikeWindowDays} jours, on baisse la recommandation même
          si les ventes montent encore — c&apos;est le cas typique du produit
          sur lequel tout le monde se rue en même temps.
        </p>
      </Section>

      <Section id="gains" title="Ton gain, pas le chiffre d'affaires du vendeur">
        <p className="text-sm">
          La plupart des outils affichent le total vendu par la boutique.
          C&apos;est flatteur et ça ne t&apos;apprend rien : ce n&apos;est pas
          ton argent. Ici le calcul part de <em>tes</em> vues :
        </p>
        <div className="kai-card text-sm leading-relaxed">
          tes vues → combien achètent → × le prix du produit → × ta commission
          → moins les gens qui renvoient l&apos;article
        </div>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          On part sur environ 2 commandes pour 1 000 vues, et on retire{" "}
          {DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct}% pour les gens qui
          renvoient l&apos;article. C&apos;est volontairement bas. Gonfler ce
          chiffre est la faute la plus facile à commettre et la plus coûteuse :
          tu tournes la vidéo, tu touches le dixième de ce qu&apos;on
          t&apos;avait annoncé, et tu ne reviens jamais.
        </p>
      </Section>

      <Section id="honnetete" title="Ce qu'on refuse d'afficher">
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

      <Section id="etat" title="Où en est l’app, aujourd’hui">
        <p className="text-sm">
          <strong>Ce qui marche et dont tu peux te servir maintenant :</strong>{" "}
          la liste des produits avec la recommandation pour chacun, le calcul de
          ce que tu toucherais, ta liste de suivi jusqu&apos;à la publication,
          et le texte à dire face caméra avec le mode plein écran.
        </p>
        <p className="text-sm">
          <strong>Ce qui n&apos;y est pas encore :</strong> les messages
          d&apos;alerte quand un produit se remplit, et le fait de revoir les
          listes des semaines passées. C&apos;est marqué « pas encore là »
          partout où c&apos;est mentionné.
        </p>
        <p className="text-sm">
          <strong>Comment les produits arrivent :</strong> ils sont relevés à la
          main, un par un, lorsque le pipeline de collecte est exécuté, depuis
          les espaces et pages accessibles à l&apos;opérateur. Kairos n&apos;est ni
          partenaire ni porte-parole de TikTok, et ne prétend pas disposer d&apos;une
          API officielle. Chaque fiche doit donc afficher sa date de relevé et
          son niveau de confiance ; sans assez de relevés, aucune conclusion
          ferme ne doit être tirée.
        </p>
        <p className="text-sm">
          <strong>Le checkout vérifie son état avant toute ouverture.</strong>
          Les offres Creator et Pro s&apos;affichent avec leur prix indicatif ;
          aucun prélèvement ne doit être déclenché si le paiement n&apos;est pas
          explicitement configuré. Dans ce cas, le site renvoie vers le plan
          gratuit au lieu d&apos;afficher un bouton de paiement en panne.
        </p>
      </Section>

      <Section id="limites" title="Les limites, dites franchement">
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          KAIROS n&apos;a aucun lien avec TikTok ni ByteDance — ni partenaire,
          ni porte-parole. Les marchés sont activés seulement lorsqu&apos;ils
          disposent réellement de relevés : France, États-Unis, Royaume-Uni,
          Allemagne, Irlande, Italie, Espagne, Autriche, Belgique, Pays-Bas et
          Pologne. Les seuils ci-dessus sont des valeurs de départ, pas des
          vérités : ils s&apos;affineront avec le volume de données. Une estimation
          reste une estimation, même accompagnée de sa fourchette.
        </p>
      </Section>

      <div className="kai-card flex flex-col items-center gap-3 text-center">
        <p className="font-[family-name:var(--font-display)] text-lg font-bold">
          Voir ce que ça donne sur les produits du moment
        </p>
        <Link href="/connexion?mode=signup" className="kai-btn-primary">
          Créer mon compte gratuit
        </Link>
        <p className="text-xs text-[color:var(--color-ink-muted)]">
          Sans carte bancaire, sans engagement.
        </p>
      </div>
      </div>
    </main>
  );
}
