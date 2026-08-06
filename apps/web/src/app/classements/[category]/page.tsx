import { CategoryRankingList } from "./CategoryRankingList";
import { ProductRankingList } from "./ProductRankingList";

// Volontairement plus large que la navigation (classements/layout.tsx) :
// createurs, videos, sons et vagues n'y figurent plus faute de source
// gratuite, mais leurs routes restent générées pour qu'un favori ou un lien
// externe ne tombe pas en 404 — la page explique alors quelle source manque.
const LABELS: Record<string, string> = {
  boutiques: "Boutiques",
  createurs: "Créateurs",
  videos: "Vidéos",
  sons: "Sons",
  categories: "Catégories",
  nouveautes: "Nouveautés",
  vagues: "Vagues",
};

// Slug d'URL → type de document rankings/*. Seuls ces deux-là sont calculés
// aujourd'hui (agrégations dérivées des produits collectés, voir
// apps/jobs/src/rank.ts).
const RANKING_TYPE: Record<string, { type: string; countLabel: string; note?: string }> = {
  boutiques: { type: "shops", countLabel: "produit" },
  categories: {
    type: "categories",
    countLabel: "produit",
    // Sans cette mention, la page se lirait comme un classement des
    // catégories officielles TikTok Shop, que la source n'expose pas.
    note: "Agrégé par mot-clé de collecte, pas par catégorie officielle TikTok Shop.",
  },
};

// Classements dont les lignes sont des produits : même rendu que
// /classements/produits, pas le rendu d'agrégat.
const PRODUCT_RANKING: Record<string, { type: string; note: string }> = {
  nouveautes: {
    type: "newcomers",
    note: "Produits apparus pour la première fois dans KAIROS sur la période. À la première collecte, tout le catalogue est neuf : ce classement ne devient discriminant qu'à partir de la deuxième.",
  },
};

// Les classements sans source de données à ce jour. Le message dit lequel
// manque plutôt qu'un « bientôt disponible » vague.
const MISSING_SOURCE: Record<string, string> = {
  createurs:
    "Aucune source créateur n'est branchée — la collecte actuelle ne couvre que les produits.",
  videos:
    "Aucune source vidéo n'est branchée — la collecte actuelle ne couvre que les produits.",
  sons: "Aucune source son n'est branchée — la collecte actuelle ne couvre que les produits.",
  vagues:
    "Ce classement repère les produits qui percent sur un marché avant d'arriver en France : il demande une collecte sur plusieurs marchés.",
};

// generateStaticParams : les 7 slugs sont connus à l'avance, donc cette
// route reste 100% statique (aucune Cloud Function, donc aucun besoin du
// plan Blaze — voir §6.4). Sans ça, Next.js en fait une route dynamique
// server-rendered qui bloque le déploiement sur le plan Spark.
export function generateStaticParams() {
  return Object.keys(LABELS).map((category) => ({ category }));
}

// Sans ceci, Next.js prévoit un rendu "fallback" pour tout slug hors de la
// liste ci-dessus, ce qui exige une Cloud Function (donc le plan Blaze).
// dynamicParams=false : un slug inconnu devient un vrai 404 statique.
export const dynamicParams = false;

export default async function ClassementCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const label = LABELS[category] ?? category;
  const ranking = RANKING_TYPE[category];
  const productRanking = PRODUCT_RANKING[category];

  if (productRanking) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-[color:var(--color-ink-muted)]">{productRanking.note}</p>
        <ProductRankingList
          type={productRanking.type}
          emptyMessage={`Aucune nouveauté sur cette période — tous les produits collectés étaient déjà connus.`}
        />
      </div>
    );
  }

  if (ranking) {
    return (
      <div className="flex flex-col gap-3">
        {ranking.note && (
          <p className="text-xs text-[color:var(--color-ink-muted)]">{ranking.note}</p>
        )}
        <CategoryRankingList
          type={ranking.type}
          countLabel={ranking.countLabel}
          emptyMessage={`Aucune donnée ${label.toLowerCase()} — le pipeline n'a pas encore tourné sur des produits collectés.`}
        />
      </div>
    );
  }

  return (
    <div className="kai-card flex flex-col items-center gap-2 py-10 text-center">
      <p className="font-[family-name:var(--font-display)] text-xl font-bold">{label}</p>
      <p className="max-w-md text-sm text-[color:var(--color-ink-muted)]">
        {MISSING_SOURCE[category] ?? "Ce classement n'a pas encore d'agrégation dédiée."}
      </p>
    </div>
  );
}
