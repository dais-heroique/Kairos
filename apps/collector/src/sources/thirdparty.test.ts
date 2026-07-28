import { describe, expect, it, vi } from "vitest";
import {
  createThirdpartySource,
  fetchFromThirdpartyProvider,
  loadThirdpartyConfigFromEnv,
} from "./thirdparty.js";

const validPayload = {
  productId: "p1",
  capturedDate: "2026-07-28",
  priceCents: 1999,
  reviewCount: 10,
  ratingAvg: 4.5,
  activeCreatorCount: 3,
  videoCount: 5,
  competingShopCount: 2,
  estSalesLow: 10,
  estSalesHigh: 20,
  confidence: 0.6,
};

describe("loadThirdpartyConfigFromEnv", () => {
  it("returns undefined when unconfigured", () => {
    expect(loadThirdpartyConfigFromEnv({} as NodeJS.ProcessEnv)).toBeUndefined();
  });

  it("builds a config from env vars", () => {
    const config = loadThirdpartyConfigFromEnv({
      THIRDPARTY_PROVIDER_BASE_URL: "https://provider.example",
      THIRDPARTY_PROVIDER_API_KEY: "key123",
    } as NodeJS.ProcessEnv);
    expect(config).toEqual({ baseUrl: "https://provider.example", apiKey: "key123", maxRetries: 3 });
  });
});

describe("fetchFromThirdpartyProvider", () => {
  it("parses a valid response into a ProductSnapshot", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validPayload,
    });

    const snapshot = await fetchFromThirdpartyProvider(
      "p1",
      { baseUrl: "https://provider.example", apiKey: "key" },
      fetchImpl as unknown as typeof fetch,
    );

    expect(snapshot).toEqual(validPayload);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://provider.example/products/p1",
      { headers: { Authorization: "Bearer key" } },
    );
  });

  it("retries on failure then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ ok: true, json: async () => validPayload });

    const snapshot = await fetchFromThirdpartyProvider(
      "p1",
      { baseUrl: "https://provider.example", apiKey: "key", maxRetries: 2 },
      fetchImpl as unknown as typeof fetch,
    );

    expect(snapshot.productId).toBe("p1");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all retries", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(
      fetchFromThirdpartyProvider(
        "p1",
        { baseUrl: "https://provider.example", apiKey: "key", maxRetries: 1 },
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow(/failed after 2 attempt/);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("rejects a malformed response instead of returning bad data", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ productId: "p1" }),
    });

    await expect(
      fetchFromThirdpartyProvider(
        "p1",
        { baseUrl: "https://provider.example", apiKey: "key", maxRetries: 0 },
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow();
  });
});

describe("createThirdpartySource", () => {
  it("throws a clear configuration error when unconfigured", async () => {
    const source = createThirdpartySource(undefined);
    await expect(source.fetchProductSnapshot("p1")).rejects.toThrow(/not configured/);
  });
});
