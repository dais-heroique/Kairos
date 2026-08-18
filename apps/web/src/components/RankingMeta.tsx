"use client";

// Deux informations que le classement portait déjà sans jamais les
// montrer :
//
//  1. `isDemo` — le bouton « peupler avec des données de démo » écrit dix
//     produits fictifs, avec des verdicts écrits en dur, dans les mêmes
//     documents `rankings/*` que le vrai pipeline. Rien ne les
//     distinguait à l'écran d'une analyse réelle.
//  2. `generatedAt` — était lu par getRankingPageData() puis jeté par les
//     pages. Or la saisie est manuelle : un classement peut dater de
//     plusieurs jours, et tout le produit repose sur le timing
//     (« la fenêtre de tir avant saturation »). Un classement sans date
//     est un classement dont on ne peut rien conclure.

function frenchAge(generatedAt: string): string {
  const ms = Date.now() - new Date(generatedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "date inconnue";

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "hier" : `il y a ${days} jours`;
}

// Au-delà de ce délai, le classement n'est plus une information de timing
// mais un souvenir — on le dit franchement plutôt que d'afficher une date
// discrète que personne ne lit.
const STALE_AFTER_DAYS = 3;

export function RankingMeta({
  generatedAt,
  isDemo,
  marketVerified = true,
  sourceMarket = null,
}: {
  generatedAt: string | null;
  isDemo: boolean;
  marketVerified?: boolean | undefined;
  sourceMarket?: string | null | undefined;
}) {
  if (!marketVerified) {
    return (
      <div
        className="kai-card border-l-4 text-sm"
        style={{ borderColor: "var(--color-coral)" }}
        role="status"
      >
        <p
          className="font-[family-name:var(--font-display)] font-bold"
          style={{ color: "var(--color-coral)" }}
        >
          Données de marché non vérifiées
        </p>
        <p className="text-[color:var(--color-ink-muted)]">
          Ce classement ancien n&apos;indique pas le marché réellement couvert par
          la source. Il est masqué pour éviter de présenter des données US comme
          des résultats France. Relance la récupération de la source avec le
          marché correct avant de l&apos;utiliser.
          {sourceMarket ? ` Marché source détecté : ${sourceMarket}.` : ""}
        </p>
      </div>
    );
  }

  if (isDemo) {
    return (
      <div
        className="kai-card border-l-4 text-sm"
        style={{ borderColor: "var(--color-coral)" }}
        role="status"
      >
        <p
          className="font-[family-name:var(--font-display)] font-bold"
          style={{ color: "var(--color-coral)" }}
        >
          Marché simulé
        </p>
        <p className="text-[color:var(--color-ink-muted)]">
          Ces produits n&apos;existent pas. Leurs verdicts sont en revanche
          calculés pour de vrai, par les mêmes moteurs que sur des données
          réelles — la démonstration montre donc comment KAIROS raisonne,
          mais aucun de ces produits n&apos;est à aller chercher sur TikTok
          Shop.
        </p>
      </div>
    );
  }

  if (!generatedAt) return null;

  const ageMs = Date.now() - new Date(generatedAt).getTime();
  const isStale = ageMs > STALE_AFTER_DAYS * 86_400_000;

  return (
    <p
      className="text-xs text-[color:var(--color-ink-muted)]"
      style={isStale ? { color: "var(--color-coral)" } : undefined}
    >
      {isStale
        ? `Classement calculé ${frenchAge(generatedAt)} — les relevés n'ont pas été mis à jour depuis.`
        : `Calculé ${frenchAge(generatedAt)}.`}
    </p>
  );
}
