import { ApifyClient } from "apify-client";
import { z } from "zod";
import type { ProductSnapshot } from "@kairos/shared";
import type { CollectorSource } from "./types.js";

// Apify TikTok Shop Search Pro integration
// Actor ID: Hr1hjEAGdYMr1RbUj
// Requires APIFY_API_TOKEN environment variable

export interface ApifyConfig {
  apiToken: string;
  actorId: string;
  maxPagesPerQuery?: number;
  maxResultsPerQuery?: number;
}

// Schema pour valider la réponse d'Apify
const apifyProductSchema = z
  .object({
    product_id: z.string(),
    product_name: z.string(),
    brand_name: z.string().optional(),
    seller: z.string().optional(),
    min_price: z.number().nullish().default(0),
    max_price: z.number().nullish().default(0),
    avg_price: z.number().nullish().default(0),
    discount_pct: z.number().nullish().default(0),
    product_rating: z.number().nullish().default(0),
    review_count: z.number().nullish().default(0),
    product_url: z.string().optional(),
    rank_on_page: z.number().nullish().default(0),
    rank_global: z.number().nullish().default(0),
    query: z.string().optional(),
    page: z.number().nullish().default(1),
    searchRegion: z.string().nullish().default("US"),
    scraped_at: z.string().optional(),
  })
  .passthrough(); // Accepter les champs supplémentaires d'Apify

type ApifyProduct = z.infer<typeof apifyProductSchema>;

// Convertir la réponse Apify en ProductSnapshot KAIROS
export function parseApifyProduct(raw: ApifyProduct, capturedDate: string): ProductSnapshot {
  const avgPrice = raw.avg_price ?? raw.max_price ?? 0;
  const rating = raw.product_rating ?? 0;

  return {
    productId: raw.product_id,
    capturedDate,
    priceCents: Math.round(avgPrice * 100),
    reviewCount: raw.review_count ?? 0,
    ratingAvg: Math.min(rating, 5),
    activeCreatorCount: 0, // Apify ne retourne pas ce champ pour TikTok Shop
    videoCount: 0, // Apify ne retourne pas ce champ pour TikTok Shop
    competingShopCount: 0, // Apify ne retourne pas ce champ pour TikTok Shop
    estSalesLow: 0, // Apify ne retourne pas ce champ pour TikTok Shop
    estSalesHigh: 0, // Apify ne retourne pas ce champ pour TikTok Shop
    confidence: rating > 0 ? 0.8 : 0.5, // Confiance haute si rating existe
  };
}

export function loadApifyConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ApifyConfig | undefined {
  const apiToken = env.APIFY_API_TOKEN;
  const actorId = env.APIFY_ACTOR_ID;
  if (!apiToken || !actorId) return undefined;
  return {
    apiToken,
    actorId,
    maxPagesPerQuery: Number(env.APIFY_MAX_PAGES) || 3,
    maxResultsPerQuery: Number(env.APIFY_MAX_RESULTS) || 200,
  };
}

// Récupérer un produit spécifique via Apify par son ID
export async function fetchFromApify(
  productExternalId: string,
  config: ApifyConfig,
): Promise<ProductSnapshot> {
  const client = new ApifyClient({ token: config.apiToken });

  try {
    // Lancer un run du TikTok Shop Search Pro Actor
    // On cherche le produit par son ID exact
    const input = {
      queries: [productExternalId],
      maxPagesPerQuery: 1, // Juste une page pour un produit spécifique
      maxResultsPerQuery: 10,
      includeRawProduct: false,
      requireAllQueryTokens: false,
    };

    const run = await client.actor(config.actorId).call(input);

    // Récupérer les résultats depuis le dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items.length) {
      throw new Error(
        `Apify: no products found for ID "${productExternalId}"`,
      );
    }

    // Parser le premier résultat (le plus pertinent)
    const rawProduct = apifyProductSchema.parse(items[0]);
    return parseApifyProduct(rawProduct, new Date().toISOString().slice(0, 10));
  } catch (err) {
    throw new Error(
      `Apify fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// Créer une source Apify prête à être utilisée
export function createApifySource(
  config: ApifyConfig | undefined = loadApifyConfigFromEnv(),
): CollectorSource {
  return {
    name: "apify",
    async fetchProductSnapshot(productExternalId: string): Promise<ProductSnapshot> {
      if (!config) {
        throw new Error(
          "apifySource: APIFY_API_TOKEN and APIFY_ACTOR_ID not configured — set these env vars (see .env.example)",
        );
      }
      return fetchFromApify(productExternalId, config);
    },
  };
}

export const apifySource: CollectorSource = createApifySource();
