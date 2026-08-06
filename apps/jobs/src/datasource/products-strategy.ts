/**
 * STRATÉGIE DE SCRAPING APIFY OPTIMISÉE
 *
 * Plutôt que scraper n'importe quel produit, on cible les VRAIS produits
 * rentables pour des créateurs TikTok Shop en France.
 *
 * Critères de sélection :
 * ✅ Commission 15%+ (viability financière)
 * ✅ Notes 4.2+ (confiance acheteur = plus de ventes)
 * ✅ Phase croissance (avant saturation)
 * ✅ Volume reviews croissant (pas un vieux produit délaissé)
 *
 * Budget : 500 requests gratuit/mois + 5€ (~250 requests)
 * = 750 requests/mois = 25/jour
 */

export interface ScrapingNiche {
  id: string;
  name: string;
  queries: string[];
  targetCommission: number; // minimum %
  targetRating: number; // minimum rating
  why: string;
}

/**
 * 6 NICHES PERTINENTES POUR TIKTOK SHOP FRANCE
 * Chacune : forte demande + commission + audience TikTok
 */
export const SCRAPING_NICHES: ScrapingNiche[] = [
  {
    id: "beaute-skincare",
    name: "💄 Beauté & Skincare",
    queries: [
      "sérum vitamine c",
      "crème hydratante",
      "masque visage",
      "nettoyant visage",
      "anti-âge serum",
      "acné treatment",
      "BB cream",
      "foundation",
    ],
    targetCommission: 20,
    targetRating: 4.3,
    why: "Audience féminine dominante sur TikTok, forte tendance beauty, commissions 20-35%, viral-friendly",
  },

  {
    id: "wellness-health",
    name: "🧘 Bien-être & Santé",
    queries: [
      "multivitamines",
      "vitamine d3",
      "oméga 3",
      "collagène",
      "magnésium",
      "probiotiques",
      "ashwagandha",
      "sleep supplement",
    ],
    targetCommission: 18,
    targetRating: 4.3,
    why: "Tendance wellness 📈, audience créateurs santé, micro-influenceurs powerful, commissions 15-25%",
  },

  {
    id: "tech-accessoires",
    name: "🔌 Tech & Accessoires",
    queries: [
      "câble usb-c",
      "support téléphone",
      "chargeur rapide",
      "protection écran",
      "powerbank",
      "adaptateur",
      "hub usb",
      "câble lightning",
    ],
    targetCommission: 15,
    targetRating: 4.4,
    why: "Besoin constant, audience large, repeat buyers, commissions 12-20%, faible retour",
  },

  {
    id: "mode-accessories",
    name: "👜 Mode & Accessoires",
    queries: [
      "sac à main",
      "ceinture",
      "bijoux collier",
      "bracelet",
      "boucles oreilles",
      "montre",
      "foulard",
      "chapeau",
    ],
    targetCommission: 18,
    targetRating: 4.2,
    why: "Haut volume TikTok, audience mode/style, commissions 18-30%, aspiration + affordable",
  },

  {
    id: "home-living",
    name: "🏠 Home & Déco",
    queries: [
      "oreiller confortable",
      "lampe led",
      "rideau",
      "tapis",
      "miroir",
      "panier rangement",
      "vase",
      "coussin",
    ],
    targetCommission: 16,
    targetRating: 4.2,
    why: "Marché stable, audience décoration/lifestyle, commissions 15-25%, petit-ticket mais volume",
  },

  {
    id: "fitness-sport",
    name: "💪 Fitness & Sport",
    queries: [
      "yoga mat",
      "gourde inox",
      "bande élastique",
      "tapis gymnastique",
      "haltères",
      "resistance band",
      "jump rope",
      "kettle bell",
    ],
    targetCommission: 17,
    targetRating: 4.3,
    why: "Audience jeune/active croissante, commissions 15-25%, transformation content marche bien",
  },
];

/**
 * Produits à ÉVITER (même si commande élevée)
 */
export const PRODUCTS_TO_AVOID_KEYWORDS = [
  // Saturation extrême
  "phone case",
  "phone screen protector",
  "generic bluetooth speaker",

  // Problèmes qualitatifs
  "cheap replicas",
  "counterfeit",
  "unauthorized",

  // Audience mismatch
  "heavy machinery",
  "professional industrial",
  "automotive parts",
];

/**
 * Configuration des produits à tracker MAINTENANT
 * (après scraping intelligent, ce fichier sera peuplé automatiquement)
 */
export interface ProductConfig {
  id: string;
  name: string;
  niche: string;
  queries: string[];
  minCommission: number;
  minRating: number;
}

/**
 * Products découverts par les scrapers intelligents
 * À peupler avec les meilleurs résultats
 */
export const HIGH_VALUE_PRODUCTS: ProductConfig[] = [
  // Sera rempli par le scraping intelligent
  // Exemple :
  // {
  //   id: "beaute-serum-vitc-bestseller",
  //   name: "Sérum Vitamine C Éclat Premium",
  //   niche: "beaute-skincare",
  //   queries: ["sérum vitamine c", "serum vitamine c éclat"],
  //   minCommission: 22,
  //   minRating: 4.5,
  // },
];

/**
 * Scoring intelligents pour les produits Apify
 * (utilisé par apify-source.ts)
 */
export function scoreProduct(product: any, targetNiche: ScrapingNiche): number {
  let score = 0;

  // Prix dans une fourchette acceptable (5-100€ = sweet spot TikTok Shop)
  const price = product.avg_price || product.max_price || 0;
  if (price >= 5 && price <= 100) score += 25;
  else if (price > 100) score -= 10; // Trop cher pour micro-influenceurs

  // ⚠️ Pas de scoring sur la commission : l'actor TikTok Shop Search ne la
  // renvoie pas. discount_pct est une remise acheteur, pas une rémunération
  // affilié — les confondre fait sortir des gains faux en euros. Tant
  // qu'aucune source ne fournit le vrai taux, ce critère reste absent
  // plutôt qu'approximé (targetCommission n'est donc pas encore appliqué).

  // Rating
  const rating = product.product_rating || 0;
  if (rating >= targetNiche.targetRating) score += 25;
  else if (rating >= targetNiche.targetRating - 0.5) score += 15;
  else score -= 10;

  // Volume reviews (indicateur de croissance)
  const reviews = product.review_count || 0;
  if (reviews >= 100) score += 20; // Produit établi
  else if (reviews >= 50) score += 15; // En croissance
  else if (reviews >= 20) score += 10; // Nouveau mais prometteur

  // Pas top 1 (surcompétition) ni complètement inexisté
  const rank = product.rank_global || 999;
  if (rank > 10 && rank < 200) score += 10; // Sweet spot (pas trop visé, pas invisible)

  return score;
}

export function filterProductByNiche(product: any, targetNiche: ScrapingNiche): boolean {
  const price = product.avg_price || product.max_price || 0;
  const rating = product.product_rating || 0;

  // Hard filters
  if (price < 3 || price > 200) return false; // Hors budget TikTok
  if (rating < 4.0) return false; // Qualité insuffisante
  // Pas de filtre sur la commission : elle n'est pas dans la réponse de
  // l'actor (voir scoreProduct). L'ancien filtre lisait discount_pct et
  // rejetait silencieusement tout produit sans remise ≥10 %.

  // Soft filters
  const score = scoreProduct(product, targetNiche);
  return score >= 30; // Minimum viable
}
