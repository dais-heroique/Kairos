import { describe, expect, it, vi } from "vitest";
import type { Browser, Page, Route } from "playwright";
import { createTiktokWebSource, parseTiktokWebData, tiktokWebSource } from "./tiktok-web.js";

describe("parseTiktokWebData", () => {
  it("parses French-formatted price/review/rating text", () => {
    const snapshot = parseTiktokWebData(
      { priceText: "19,99 €", reviewCountText: "128 avis", ratingText: "4,6" },
      "p1",
      "2026-07-28",
    );

    expect(snapshot.priceCents).toBe(1999);
    expect(snapshot.reviewCount).toBe(128);
    expect(snapshot.ratingAvg).toBe(4.6);
    expect(snapshot.confidence).toBeLessThan(0.5);
  });

  it("degrades gracefully instead of crashing on unparseable text", () => {
    const snapshot = parseTiktokWebData(
      { priceText: "indisponible", reviewCountText: "", ratingText: "n/a" },
      "p1",
      "2026-07-28",
    );

    expect(Number.isFinite(snapshot.priceCents)).toBe(true);
    expect(Number.isFinite(snapshot.reviewCount)).toBe(true);
    expect(Number.isFinite(snapshot.ratingAvg)).toBe(true);
  });
});

describe("tiktokWebSource (legacy export)", () => {
  it("throws instructing to use createTiktokWebSource(browser) instead", async () => {
    await expect(tiktokWebSource.fetchProductSnapshot("p1")).rejects.toThrow(/createTiktokWebSource/);
  });
});

describe("createTiktokWebSource", () => {
  it("blocks non-essential resources and closes the page after scraping", async () => {
    const routeCalls: unknown[] = [];
    const page = {
      route: vi.fn((pattern: string, handler: (route: Route) => unknown) => {
        routeCalls.push({ pattern, handler });
        return Promise.resolve();
      }),
      goto: vi.fn().mockResolvedValue(undefined),
      locator: vi.fn().mockReturnValue({ innerText: vi.fn().mockResolvedValue("19,99 €") }),
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as Page;
    const browser = { newPage: vi.fn().mockResolvedValue(page) } as unknown as Browser;

    const source = createTiktokWebSource(browser);
    const snapshot = await source.fetchProductSnapshot("p1");

    expect(routeCalls.length).toBe(1);
    expect(page.close).toHaveBeenCalledTimes(1);
    expect(snapshot.productId).toBe("p1");
  });

  it("still closes the page when scraping throws", async () => {
    const page = {
      route: vi.fn().mockResolvedValue(undefined),
      goto: vi.fn().mockRejectedValue(new Error("timeout")),
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as Page;
    const browser = { newPage: vi.fn().mockResolvedValue(page) } as unknown as Browser;

    const source = createTiktokWebSource(browser);
    await expect(source.fetchProductSnapshot("p1")).rejects.toThrow("timeout");
    expect(page.close).toHaveBeenCalledTimes(1);
  });
});
