import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseApifyProduct,
  loadApifyConfigFromEnv,
  createApifySource,
  type ApifyConfig,
} from "./apify.js";

describe("Apify Source", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseApifyProduct", () => {
    it("should parse Apify product data correctly", () => {
      const rawProduct = {
        product_id: "tiktok-123",
        product_name: "Ergonomic Chair",
        brand_name: "BrandX",
        seller: "shop-456",
        min_price: 99.99,
        max_price: 149.99,
        avg_price: 124.99,
        discount_pct: 10,
        product_rating: 4.5,
        review_count: 1250,
        product_url: "https://tiktok.com/shop/product/123",
        rank_on_page: 1,
        rank_global: 1,
        query: "ergo chair",
        page: 1,
        searchRegion: "US",
        scraped_at: "2026-08-02T00:00:00Z",
      };

      const result = parseApifyProduct(rawProduct, "2026-08-02");

      expect(result).toEqual({
        productId: "tiktok-123",
        capturedDate: "2026-08-02",
        priceCents: 12499, // 124.99 * 100
        reviewCount: 1250,
        ratingAvg: 4.5,
        activeCreatorCount: 0,
        videoCount: 0,
        competingShopCount: 0,
        estSalesLow: 0,
        estSalesHigh: 0,
        confidence: 0.8, // Haute confiance car rating > 0
      });
    });

    it("should handle missing fields with defaults", () => {
      const rawProduct = {
        product_id: "tiktok-456",
        product_name: "Unknown Product",
        brand_name: undefined,
        seller: undefined,
        min_price: null,
        max_price: null,
        avg_price: null,
        discount_pct: null,
        product_rating: null,
        review_count: null,
        product_url: undefined,
        rank_on_page: null,
        rank_global: null,
        query: undefined,
        page: null,
        searchRegion: null,
        scraped_at: undefined,
      };

      const result = parseApifyProduct(rawProduct, "2026-08-02");

      expect(result.productId).toBe("tiktok-456");
      expect(result.priceCents).toBe(0);
      expect(result.reviewCount).toBe(0);
      expect(result.ratingAvg).toBe(0);
      expect(result.confidence).toBe(0.5); // Basse confiance sans rating
    });

    it("should cap rating at 5.0", () => {
      const rawProduct = {
        product_id: "tiktok-789",
        product_name: "Product",
        brand_name: undefined,
        seller: undefined,
        min_price: null,
        max_price: null,
        avg_price: null,
        discount_pct: null,
        product_rating: 5.5, // Au-dessus du max
        review_count: null,
        product_url: undefined,
        rank_on_page: null,
        rank_global: null,
        query: undefined,
        page: null,
        searchRegion: null,
        scraped_at: undefined,
      };

      const result = parseApifyProduct(rawProduct, "2026-08-02");
      expect(result.ratingAvg).toBe(5); // Capped at 5
    });
  });

  describe("loadApifyConfigFromEnv", () => {
    it("should load config from environment variables", () => {
      const env = {
        APIFY_API_TOKEN: "apk_test_token_123",
        APIFY_ACTOR_ID: "Hr1hjEAGdYMr1RbUj",
        APIFY_MAX_PAGES: "5",
        APIFY_MAX_RESULTS: "500",
      };

      const config = loadApifyConfigFromEnv(env);

      expect(config).toEqual({
        apiToken: "apk_test_token_123",
        actorId: "Hr1hjEAGdYMr1RbUj",
        maxPagesPerQuery: 5,
        maxResultsPerQuery: 500,
      });
    });

    it("should return undefined if required env vars are missing", () => {
      const env = {
        APIFY_API_TOKEN: "apk_token",
        // Missing APIFY_ACTOR_ID
      };

      const config = loadApifyConfigFromEnv(env);
      expect(config).toBeUndefined();
    });

    it("should use default pagination values", () => {
      const env = {
        APIFY_API_TOKEN: "apk_token",
        APIFY_ACTOR_ID: "Hr1hjEAGdYMr1RbUj",
        // No APIFY_MAX_PAGES/APIFY_MAX_RESULTS
      };

      const config = loadApifyConfigFromEnv(env);

      expect(config?.maxPagesPerQuery).toBe(3);
      expect(config?.maxResultsPerQuery).toBe(200);
    });
  });

  describe("createApifySource", () => {
    it("should create a source without config", () => {
      const source = createApifySource(undefined);

      expect(source.name).toBe("apify");
      expect(typeof source.fetchProductSnapshot).toBe("function");
    });

    it("should throw error when fetching without config", async () => {
      const source = createApifySource(undefined);

      await expect(source.fetchProductSnapshot("test-id")).rejects.toThrow(
        "APIFY_API_TOKEN and APIFY_ACTOR_ID not configured",
      );
    });

    it("should throw error on fetch failure", async () => {
      const config = {
        apiToken: "fake_token",
        actorId: "fake_actor",
      };

      const source = createApifySource(config);

      // Note: This will fail in real scenario but we're testing error handling
      await expect(source.fetchProductSnapshot("test-id")).rejects.toThrow(
        "Apify fetch failed",
      );
    });
  });
});
