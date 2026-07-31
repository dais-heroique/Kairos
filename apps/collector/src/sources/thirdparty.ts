import { z } from "zod";
import type { ProductSnapshot } from "@kairos/shared";
import type { CollectorSource } from "./types.js";

// Sources tierces complémentaires — à privilégier sur le scraping
// reverse-engineered (tiktok-web.ts/tiktok-api.ts) : c'est un contrat REST
// documenté par un fournisseur de données marché, pas un endpoint interne
// susceptible de changer sans préavis. Le fournisseur réel (URL, clé) reste
// à choisir par l'utilisateur — voir THIRDPARTY_PROVIDER_BASE_URL/API_KEY
// dans .env.example. Ce module fournit la plomberie (auth, retry,
// validation) prête à recevoir n'importe quel provider respectant ce
// contrat minimal côté réponse.

export interface ThirdpartyProviderConfig {
  baseUrl: string;
  apiKey: string;
  maxRetries?: number;
}

const providerResponseSchema = z.object({
  productId: z.string(),
  capturedDate: z.string(),
  priceCents: z.number().int().nonnegative(),
  reviewCount: z.number().int().nonnegative(),
  ratingAvg: z.number().min(0).max(5),
  activeCreatorCount: z.number().int().nonnegative(),
  videoCount: z.number().int().nonnegative(),
  competingShopCount: z.number().int().nonnegative(),
  estSalesLow: z.number().nonnegative(),
  estSalesHigh: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
});

export function loadThirdpartyConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ThirdpartyProviderConfig | undefined {
  const baseUrl = env.THIRDPARTY_PROVIDER_BASE_URL;
  const apiKey = env.THIRDPARTY_PROVIDER_API_KEY;
  if (!baseUrl || !apiKey) return undefined;
  return { baseUrl, apiKey, maxRetries: 3 };
}

export async function fetchFromThirdpartyProvider(
  productExternalId: string,
  config: ThirdpartyProviderConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ProductSnapshot> {
  const maxRetries = config.maxRetries ?? 3;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchImpl(
        `${config.baseUrl}/products/${encodeURIComponent(productExternalId)}`,
        { headers: { Authorization: `Bearer ${config.apiKey}` } },
      );
      if (!res.ok) throw new Error(`thirdparty provider responded ${res.status}`);
      const json: unknown = await res.json();
      return providerResponseSchema.parse(json);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      }
    }
  }

  throw new Error(
    `thirdparty provider fetch failed after ${maxRetries + 1} attempt(s): ${String(lastError)}`,
  );
}

export function createThirdpartySource(
  config: ThirdpartyProviderConfig | undefined = loadThirdpartyConfigFromEnv(),
): CollectorSource {
  return {
    name: "thirdparty",
    async fetchProductSnapshot(productExternalId: string): Promise<ProductSnapshot> {
      if (!config) {
        throw new Error(
          "thirdpartySource: THIRDPARTY_PROVIDER_BASE_URL/THIRDPARTY_PROVIDER_API_KEY not configured — pick a real market-data provider and set these env vars (see .env.example)",
        );
      }
      return fetchFromThirdpartyProvider(productExternalId, config);
    },
  };
}

export const thirdpartySource: CollectorSource = createThirdpartySource();
