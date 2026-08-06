import { ApifyClient } from "apify-client";
import type { ProductSnapshot } from "@kairos/shared";
import type { SnapshotSource } from "./types.js";
import {
  SCRAPING_NICHES,
  PRODUCTS_TO_AVOID_KEYWORDS,
  scoreProduct,
  filterProductByNiche,
  type ScrapingNiche,
} from "./products-strategy.js";

/**
 * SCRAPER INTELLIGENT MULTI-NICHE
 *
 * Au lieu de chercher des produits spécifiques, on scrape les NICHES pertinentes
 * et on récupère les meilleurs produits de chaque niche selon des critères d'éligibilité.
 *
 * Workflow :
 * 1. Pour chaque niche (beauté, wellness, tech, etc.)
 * 2. Scraper TikTok Shop avec les queries de la niche
 * 3. Scorer les produits (commission, rating, prix, volume)
 * 4. Retourner top N produits par niche
 * 5. Peupler la DB avec ces produits
 */

interface NicheResult {
  niche: ScrapingNiche;
  products: Array<{
    product: any;
    score: number;
  }>;
  topProducts: ProductSnapshot[];
}

export class ApifyIntelligentSource implements SnapshotSource {
  private client: ApifyClient;
  private actorId: string;
  private today: string;
  private topProductsPerNiche: number = 3; // Top 3 par niche

  constructor(
    apiToken: string,
    actorId: string = "Hr1hjEAGdYMr1RbUj",
    today: string = new Date().toISOString().slice(0, 10),
  ) {
    if (!apiToken) {
      throw new Error("ApifyIntelligentSource: APIFY_API_TOKEN required");
    }
    this.client = new ApifyClient({ token: apiToken });
    this.actorId = actorId;
    this.today = today;
  }

  /**
   * Scrape TOUTES les niches et retourne les IDs des produits trouvés
   */
  async listActiveProductIds(): Promise<string[]> {
    const productIds: string[] = [];

    console.log("[apify-intelligent] 🎯 Scraping all niches...");

    for (const niche of SCRAPING_NICHES) {
      console.log(`[apify-intelligent] 📍 Niche: ${niche.name}`);

      try {
        const result = await this.scrapeNiche(niche);
        const ids = result.topProducts.map((p) => p.productId);
        productIds.push(...ids);
        console.log(`[apify-intelligent] ✅ Found ${ids.length} products in ${niche.name}`);
      } catch (err) {
        console.warn(`[apify-intelligent] ⚠️  Error scraping ${niche.name}:`, err);
      }
    }

    console.log(`[apify-intelligent] 🎉 Total products across all niches: ${productIds.length}`);
    return productIds;
  }

  /**
   * Get snapshots pour un produit spécifique
   */
  async getSnapshotSeries(productId: string, days: number): Promise<ProductSnapshot[]> {
    // Pour un scraper intelligent, on retourne juste le snapshot du jour
    // (ce scraper est conçu pour découvrir, pas pour tracker l'historique)
    const snapshot: ProductSnapshot = {
      productId,
      capturedDate: this.today,
      priceCents: 0, // Sera rempli par le scrape
      reviewCount: 0,
      ratingAvg: 0,
      activeCreatorCount: 0,
      videoCount: 0,
      competingShopCount: 0,
      estSalesLow: 0,
      estSalesHigh: 0,
      confidence: 0.6,
    };
    return [snapshot];
  }

  /**
   * Scrape une niche avec ses queries
   */
  private async scrapeNiche(niche: ScrapingNiche): Promise<NicheResult> {
    const input = {
      queries: niche.queries,
      maxPagesPerQuery: 2, // 2 pages par query = ~50 produits par niche
      maxResultsPerQuery: 50,
      includeRawProduct: false,
    };

    console.log(
      `[apify-intelligent] 🔍 Scraping niche "${niche.name}" with ${niche.queries.length} queries`,
    );
    const run = await this.client.actor(this.actorId).call(input);

    // Récupérer les résultats
    const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
    console.log(`[apify-intelligent] 📊 Got ${items.length} raw products from Apify for ${niche.name}`);

    // Filtrer et scorer
    const validProducts = items
      .filter((item: any) => !this.shouldSkipProduct(item))
      .map((item: any) => ({
        product: item,
        score: scoreProduct(item, niche),
      }))
      .filter(({ score }) => score >= 30) // Minimum viable
      .sort((a, b) => b.score - a.score); // Top scores first

    console.log(
      `[apify-intelligent] ⭐ Valid products after scoring: ${validProducts.length} (top score: ${validProducts[0]?.score ?? 0})`,
    );

    // Prendre les top N par niche
    const topProducts = validProducts
      .slice(0, this.topProductsPerNiche)
      .map(({ product }) => this.parseApifyProduct(product, niche));

    return { niche, products: validProducts, topProducts };
  }

  /**
   * Vérifier si on doit ignorer ce produit
   */
  private shouldSkipProduct(product: any): boolean {
    const name = (product.product_name || "").toLowerCase();

    // Skip si contient des keywords à éviter
    for (const keyword of PRODUCTS_TO_AVOID_KEYWORDS) {
      if (name.includes(keyword.toLowerCase())) {
        return true;
      }
    }

    // Skip si pas assez de données
    if (!product.product_name || !product.product_rating) {
      return true;
    }

    return false;
  }

  /**
   * Convertir produit Apify en ProductSnapshot
   */
  private parseApifyProduct(raw: any, niche: ScrapingNiche): ProductSnapshot {
    const avgPrice = raw.avg_price ?? raw.max_price ?? 0;
    const rating = raw.product_rating ?? 0;
    const reviewCount = raw.review_count ?? 0;

    return {
      productId: `${niche.id}:${raw.product_id || raw.product_name}`.substring(0, 100), // Prefix avec niche
      capturedDate: this.today,
      priceCents: Math.round(avgPrice * 100),
      reviewCount: Math.max(0, reviewCount),
      ratingAvg: Math.min(Math.max(rating, 0), 5),
      activeCreatorCount: 0,
      videoCount: 0,
      competingShopCount: 0,
      estSalesLow: 0,
      estSalesHigh: 0,
      confidence: rating >= 4.3 ? 0.9 : rating >= 4.0 ? 0.75 : 0.5,
    };
  }
}

/**
 * Factory — crée un intelligent source si le token est configuré
 */
export function createApifyIntelligentSourceFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): SnapshotSource {
  const token = env.APIFY_API_TOKEN;
  const actorId = env.APIFY_ACTOR_ID || "Hr1hjEAGdYMr1RbUj";
  const today = env.TODAY;

  if (!token) {
    throw new Error(
      "ApifyIntelligentSource: APIFY_API_TOKEN not configured. Set it in .env.local",
    );
  }

  return new ApifyIntelligentSource(token, actorId, today);
}

/**
 * Afficher le récapitulatif intelligible de la stratégie
 */
export function printScrapingStrategy(): void {
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║         🎯 APIFY INTELLIGENT MULTI-NICHE STRATEGY              ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  console.log("📊 NICHES TO SCRAPE:");
  SCRAPING_NICHES.forEach((niche, idx) => {
    console.log(
      `  ${idx + 1}. ${niche.name} (${niche.queries.length} keywords, min commission: ${niche.targetCommission}%)`,
    );
    console.log(`     Why: ${niche.why}`);
  });

  console.log("\n💰 BUDGET OPTIMIZATION:");
  console.log(`  • 500 requests/month = FREE (Apify default)`);
  console.log(`  • 5€ credit = ~250 additional requests`);
  console.log(`  • TOTAL = 750 requests/month (~25/day)`);
  console.log(`  • Per niche: ~125 requests/month (sustainable)`);

  console.log("\n✅ FILTERING CRITERIA:");
  console.log(`  • Price: $5-100 (sweet spot for micro-influencers)`);
  console.log(`  • Commission: 15%+ minimum`);
  console.log(`  • Rating: 4.2+ minimum`);
  console.log(`  • Reviews: 20+ (growing trend signal)`);

  console.log("\n🚀 OUTPUT:");
  console.log(`  • Top 3 products/niche = 18 high-value products`);
  console.log(`  • Scored by: price, commission, rating, review count, ranking`);
  console.log(`  • Auto-popsulates HIGH_VALUE_PRODUCTS in products.config.ts`);

  console.log("\n");
}
