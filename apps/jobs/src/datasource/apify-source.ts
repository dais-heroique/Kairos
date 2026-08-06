import { ApifyClient } from "apify-client";
import type { ProductSnapshot } from "@kairos/shared";
import type { SnapshotSource } from "./types.js";
import { getProductsToTrack } from "./products.config.js";

/**
 * Apify TikTok Shop Search Pro — source de scraping en temps réel
 * Chaque produit = une requête indépendante avec ses queries configurées
 * Résultats convertis en ProductSnapshot pour le pipeline
 */
export class ApifySnapshotSource implements SnapshotSource {
  private client: ApifyClient;
  private actorId: string;
  private today: string;

  constructor(
    apiToken: string,
    actorId: string = "Hr1hjEAGdYMr1RbUj", // TikTok Shop Search Pro par défaut
    today: string = new Date().toISOString().slice(0, 10),
  ) {
    if (!apiToken) {
      throw new Error("ApifySnapshotSource: APIFY_API_TOKEN required");
    }
    this.client = new ApifyClient({ token: apiToken });
    this.actorId = actorId;
    this.today = today;
  }

  async listActiveProductIds(): Promise<string[]> {
    return getProductsToTrack().map((p) => p.id);
  }

  async getSnapshotSeries(productId: string, days: number): Promise<ProductSnapshot[]> {
    console.log(`[apify] Scraping "${productId}" for ${days} days...`);

    try {
      // Récupérer les queries configurées pour ce produit
      const config = getProductsToTrack().find((p) => p.id === productId);
      if (!config) {
        console.warn(`[apify] Product "${productId}" not found in config`);
        return [];
      }

      // Lancer le scrape Apify avec les queries du produit
      const input = {
        queries: config.queries,
        maxPagesPerQuery: 3,
        maxResultsPerQuery: 200,
        includeRawProduct: false,
        requireAllQueryTokens: false,
      };

      console.log(`[apify] Running actor ${this.actorId} with queries:`, config.queries);
      const run = await this.client.actor(this.actorId).call(input);

      // Récupérer les résultats du dataset
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
      console.log(`[apify] Got ${items.length} products from Apify`);

      // Convertir en ProductSnapshot
      const snapshots = items
        .map((item: any) => this.parseApifyProduct(item, productId))
        .filter((s): s is ProductSnapshot => s !== null);

      console.log(`[apify] Converted to ${snapshots.length} ProductSnapshots`);
      return snapshots;
    } catch (err) {
      console.error(`[apify] Error scraping "${productId}":`, err);
      return [];
    }
  }

  private parseApifyProduct(raw: any, sourceProductId: string): ProductSnapshot | null {
    try {
      const avgPrice = raw.avg_price ?? raw.max_price ?? 0;
      const rating = raw.product_rating ?? 0;
      const reviewCount = raw.review_count ?? 0;

      return {
        productId: sourceProductId, // Notre ID de config, pas l'ID TikTok
        capturedDate: this.today,
        priceCents: Math.round(avgPrice * 100),
        reviewCount: Math.max(0, reviewCount),
        ratingAvg: Math.min(Math.max(rating, 0), 5),
        activeCreatorCount: 0, // Apify ne fournit pas
        videoCount: 0, // Apify ne fournit pas
        competingShopCount: 0, // Apify ne fournit pas
        estSalesLow: 0, // Apify ne fournit pas
        estSalesHigh: 0, // Apify ne fournit pas
        confidence: rating > 0 ? 0.85 : 0.5,
      };
    } catch (err) {
      console.warn(`[apify] Failed to parse product:`, err);
      return null;
    }
  }
}

/**
 * Factory — crée une source Apify si le token est configuré
 */
export function createApifySourceFromEnv(env: NodeJS.ProcessEnv = process.env): SnapshotSource {
  const token = env.APIFY_API_TOKEN;
  const actorId = env.APIFY_ACTOR_ID || "Hr1hjEAGdYMr1RbUj";
  const today = env.TODAY; // Injecté pour les tests

  if (!token) {
    throw new Error(
      "ApifySnapshotSource: APIFY_API_TOKEN not configured. Set it in .env.local",
    );
  }

  return new ApifySnapshotSource(token, actorId, today);
}
