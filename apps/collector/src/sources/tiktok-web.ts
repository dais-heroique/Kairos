import type { Browser, Page } from "playwright";
import type { ProductSnapshot } from "@kairos/shared";
import type { CollectorSource } from "./types.js";
import { blockNonEssentialResources } from "../resource-blocking.js";

// ⚠️ NEEDS VALIDATION AGAINST LIVE SITE — sélecteurs et URL hypothétiques,
// écrits sans accès réseau à tiktok.com depuis cet environnement. Dernier
// recours seulement (§ Lot 2) : privilégier tiktok-api.ts tant que
// possible — le rendu de page complète coûte ~5x plus cher en bande
// passante proxy, d'où le blocage systématique des ressources non
// essentielles ci-dessous.

export interface TiktokWebScrapedData {
  priceText: string; // ex. "19,99 €"
  reviewCountText: string; // ex. "128 avis"
  ratingText: string; // ex. "4,6"
}

export function parseTiktokWebData(
  data: TiktokWebScrapedData,
  productExternalId: string,
  capturedDate: string,
): ProductSnapshot {
  const priceMatch = parseFloat(data.priceText.replace(/[^\d,.-]/g, "").replace(",", "."));
  const priceCents = Number.isFinite(priceMatch) ? Math.round(priceMatch * 100) : 0;
  const reviewCount = parseInt(data.reviewCountText.replace(/[^\d]/g, ""), 10) || 0;
  const ratingAvg = parseFloat(data.ratingText.replace(",", ".")) || 0;

  return {
    productId: productExternalId,
    capturedDate,
    priceCents,
    reviewCount,
    ratingAvg,
    // Non disponible depuis la seule fiche produit — nécessite les
    // pages créateurs/vendeur associées (hors scope de ce scrape minimal).
    activeCreatorCount: 0,
    videoCount: 0,
    competingShopCount: 0,
    estSalesLow: 0,
    estSalesHigh: 0,
    // Fourchette large : ce scrape ne couvre qu'un sous-ensemble des
    // champs de ProductSnapshot, la confiance reflète ces données partielles.
    confidence: 0.2,
  };
}

export async function scrapeTiktokProductPage(
  page: Page,
  productExternalId: string,
): Promise<TiktokWebScrapedData> {
  await blockNonEssentialResources(page);
  // TODO(validation): URL et sélecteurs hypothétiques.
  await page.goto(`https://shop.tiktok.com/view/product/${encodeURIComponent(productExternalId)}`);
  const priceText = await page.locator("[data-testid=product-price]").innerText();
  const reviewCountText = await page.locator("[data-testid=product-review-count]").innerText();
  const ratingText = await page.locator("[data-testid=product-rating]").innerText();
  return { priceText, reviewCountText, ratingText };
}

export function createTiktokWebSource(browser: Browser): CollectorSource {
  return {
    name: "tiktok-web",
    async fetchProductSnapshot(productExternalId: string): Promise<ProductSnapshot> {
      const page = await browser.newPage();
      try {
        const data = await scrapeTiktokProductPage(page, productExternalId);
        return parseTiktokWebData(data, productExternalId, new Date().toISOString().slice(0, 10));
      } finally {
        await page.close();
      }
    },
  };
}

// Export compatible avec l'interface CollectorSource existante, mais sans
// instance Browser (son cycle de vie doit être géré par l'appelant, pas
// recréé à chaque produit) — utiliser createTiktokWebSource(browser)
// depuis le task-handler à la place.
export const tiktokWebSource: CollectorSource = {
  name: "tiktok-web",
  async fetchProductSnapshot(): Promise<ProductSnapshot> {
    throw new Error(
      "tiktokWebSource: use createTiktokWebSource(browser) from the task handler — a shared Playwright Browser instance is required, not created per call.",
    );
  },
};
