import type { Commission } from "./product";

/**
 * Taux de commission d'affiliation de référence, par famille de produits.
 *
 * ⚠️ Ce sont des **taux de marché publiés**, pas les taux réels des produits.
 * La source de collecte (TikTok Shop Search) n'expose aucun taux : celui-ci
 * vit dans le compte affilié du créateur, pas sur la fiche produit publique.
 * Vérifié sur deux actors Apify se présentant comme « affiliate », qui le
 * disent noir sur blanc (voir docs/APIFY.md).
 *
 * Pourquoi poser une estimation plutôt que zéro : afficher « 0 % » et
 * « 0 € » se lit « ce produit ne rapporte rien », ce qui est faux. Une
 * fourchette de marché, explicitement marquée comme estimation
 * (`isEstimated: true`), dit la vérité — on connaît l'ordre de grandeur de
 * la catégorie, pas le taux du vendeur.
 *
 * Ordres de grandeur constatés sur le marché US en 2026 :
 *   - moyenne toutes catégories ......... ~13 %
 *   - beauté / compléments / maison ..... 18–20 %
 *   - mode ............................. 10–15 %
 *   - électronique / high-tech .......... 5–10 % (marges matérielles serrées)
 *   - plancher pour intéresser un créateur ... 10 %
 * Sources : dashboardly.io, shortformnation.com, hamstergarage.com (2026).
 *
 * Ces valeurs sont à remplacer produit par produit dès qu'un vrai taux est
 * relevé dans l'espace affilié — voir /admin/produits. Un taux saisi à la
 * main n'est jamais écrasé par la collecte.
 */
export interface CommissionBenchmark {
  /** Identifiant de famille, utilisé dans les libellés. */
  readonly family: string;
  /** Taux médian retenu pour la famille. */
  readonly ratePct: number;
  /** Fourchette observée, pour l'affichage et la documentation. */
  readonly lowPct: number;
  readonly highPct: number;
  /** Fragments de mots-clés qui rattachent un produit à cette famille. */
  readonly keywords: readonly string[];
}

export const COMMISSION_BENCHMARKS: readonly CommissionBenchmark[] = [
  {
    family: "Beauté & soin",
    ratePct: 19,
    lowPct: 18,
    highPct: 20,
    keywords: [
      "serum", "sérum", "cream", "crème", "skincare", "beauty", "makeup",
      "maquillage", "mask", "masque", "cleanser", "lotion", "shampoo",
      "shampooing", "hair", "cheveux", "nail", "ongle", "perfume", "parfum",
    ],
  },
  {
    family: "Compléments & bien-être",
    ratePct: 19,
    lowPct: 18,
    highPct: 20,
    keywords: [
      "vitamin", "vitamine", "supplement", "complément", "collagen",
      "collagène", "probiotic", "probiotique", "omega", "magnesium",
      "magnésium", "protein", "protéine", "ashwagandha",
    ],
  },
  {
    family: "Maison & déco",
    ratePct: 18,
    lowPct: 15,
    highPct: 20,
    keywords: [
      "chair", "chaise", "lamp", "lampe", "pillow", "oreiller", "cushion",
      "coussin", "rug", "tapis", "curtain", "rideau", "mirror", "miroir",
      "desk", "bureau", "furniture", "meuble", "storage", "rangement",
      "kitchen", "cuisine", "vase",
    ],
  },
  {
    family: "Mode & accessoires",
    ratePct: 13,
    lowPct: 10,
    highPct: 15,
    keywords: [
      "bag", "sac", "belt", "ceinture", "jewelry", "bijou", "necklace",
      "collier", "bracelet", "earring", "boucle", "watch", "montre",
      "shoe", "chaussure", "dress", "robe", "shirt", "hat", "chapeau",
    ],
  },
  {
    family: "Sport & fitness",
    ratePct: 17,
    lowPct: 15,
    highPct: 20,
    keywords: [
      "yoga", "fitness", "gym", "dumbbell", "haltère", "resistance",
      "élastique", "bottle", "gourde", "jump rope", "kettlebell", "mat",
    ],
  },
  {
    family: "Tech & électronique",
    ratePct: 8,
    lowPct: 5,
    highPct: 10,
    keywords: [
      "headphone", "casque", "earbud", "écouteur", "cable", "câble",
      "charger", "chargeur", "powerbank", "speaker", "enceinte", "phone",
      "téléphone", "usb", "bluetooth", "adapter", "adaptateur", "screen",
      "écran", "laptop", "keyboard", "clavier", "mouse", "souris", "camera",
    ],
  },
];

/** Moyenne toutes catégories, quand aucun mot-clé ne correspond. */
export const DEFAULT_COMMISSION_BENCHMARK: CommissionBenchmark = {
  family: "Toutes catégories",
  ratePct: 13,
  lowPct: 10,
  highPct: 15,
  keywords: [],
};

/**
 * Rattache un produit à une famille à partir de son titre et du mot-clé de
 * collecte. Le titre prime : c'est lui qui décrit le produit, alors que le
 * mot-clé décrit seulement la recherche qui l'a fait remonter.
 */
export function findCommissionBenchmark(
  title: string,
  sourceQuery?: string | null,
): CommissionBenchmark {
  // Deux passes, et non une seule chaîne concaténée. Avec un `${title}
  // ${sourceQuery}` unique, l'ordre du tableau tranchait à la place du
  // titre : un casque Bluetooth remonté par une requête « skincare »
  // ressortait en « Beauté & soin » (19 %) au lieu de « Tech » (8 %),
  // parce que la famille beauté est déclarée en premier. Soit un gain
  // annoncé plus du double du réel, sur la seule foi du mot-clé de
  // recherche.
  const match = (haystack: string): CommissionBenchmark | null => {
    const lower = haystack.toLowerCase();
    for (const bench of COMMISSION_BENCHMARKS) {
      if (bench.keywords.some((k) => lower.includes(k))) return bench;
    }
    return null;
  };

  return match(title) ?? (sourceQuery ? match(sourceQuery) : null) ?? DEFAULT_COMMISSION_BENCHMARK;
}

/** Commission estimée à partir du taux de marché de la famille détectée. */
export function estimatedCommissionFor(
  title: string,
  sourceQuery?: string | null,
): Commission {
  const bench = findCommissionBenchmark(title, sourceQuery);
  return {
    ratePct: bench.ratePct,
    // Le taux de marché correspond à la collaboration ouverte, celle qu'un
    // créateur peut rejoindre sans invitation.
    isOpenCollab: true,
    isTargetedOnly: false,
    isEstimated: true,
  };
}

/**
 * La commission à utiliser pour un produit : celle qui est stockée si elle
 * porte un taux, le barème de catégorie sinon.
 *
 * **À la lecture, et pas seulement à l'écriture.** Poser l'estimation
 * uniquement au moment de la collecte ne corrige que les produits
 * recollectés ensuite : tous les documents déjà en base gardent leur
 * `ratePct: 0` et continuent d'afficher « inconnue » jusqu'à ce qu'ils
 * repassent par le scrape. Comme la règle est purement dérivée du titre,
 * l'appliquer à la lecture donne le même résultat sans réécrire la base —
 * et reste juste le jour où un vrai taux est saisi, puisqu'un taux
 * existant n'est jamais remplacé.
 *
 * C'est le seul endroit qui décide. Les trois appelants (les deux
 * pipelines et la lecture des classements) ne dupliquent pas la règle.
 */
export function resolveCommission(
  stored: Commission | null | undefined,
  title: string,
  sourceQuery?: string | null,
): Commission {
  if (stored && stored.ratePct > 0) return stored;
  return estimatedCommissionFor(title, sourceQuery);
}
