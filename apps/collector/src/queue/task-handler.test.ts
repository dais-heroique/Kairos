import { describe, expect, it, vi } from "vitest";
import type { BigQuery } from "@google-cloud/bigquery";
import type { ProductSnapshot } from "@kairos/shared";
import type { CollectorSource } from "../sources/types.js";
import type { CircuitBreakerState, CircuitBreakerStore } from "../circuit-breaker.js";
import { handleCollectTask } from "./task-handler.js";

function makeInMemoryCircuitStore(): CircuitBreakerStore {
  const states = new Map<string, CircuitBreakerState>();
  return {
    async read(source) {
      return states.get(source) ?? { consecutiveFailures: 0, pausedUntil: null };
    },
    async write(source, state) {
      states.set(source, state);
    },
  };
}

function makeFakeBigQuery() {
  const insert = vi.fn().mockResolvedValue(undefined);
  const table = vi.fn().mockReturnValue({ insert });
  const dataset = vi.fn().mockReturnValue({ table });
  return { dataset } as unknown as BigQuery;
}

const snapshot: ProductSnapshot = {
  productId: "p1",
  capturedDate: "2026-07-28",
  priceCents: 1000,
  reviewCount: 1,
  ratingAvg: 4,
  activeCreatorCount: 1,
  videoCount: 1,
  competingShopCount: 1,
  estSalesLow: 1,
  estSalesHigh: 2,
  confidence: 0.5,
};

describe("handleCollectTask", () => {
  it("writes the snapshot and records success on a working source", async () => {
    const source: CollectorSource = {
      name: "thirdparty",
      fetchProductSnapshot: vi.fn().mockResolvedValue(snapshot),
    };
    const bq = makeFakeBigQuery();
    const circuitStore = makeInMemoryCircuitStore();

    const result = await handleCollectTask(
      { source: "thirdparty", productExternalId: "p1" },
      { sources: { thirdparty: source }, circuitStore, bq },
    );

    expect(result.status).toBe("written");
    expect(bq.dataset).toHaveBeenCalledWith("kairos");
  });

  it("returns unknown_source for an unregistered source name", async () => {
    const result = await handleCollectTask(
      { source: "nope", productExternalId: "p1" },
      { sources: {}, circuitStore: makeInMemoryCircuitStore(), bq: makeFakeBigQuery() },
    );
    expect(result.status).toBe("unknown_source");
  });

  it("skips the fetch entirely when the circuit is open", async () => {
    const source: CollectorSource = {
      name: "tiktok-web",
      fetchProductSnapshot: vi.fn().mockResolvedValue(snapshot),
    };
    const circuitStore = makeInMemoryCircuitStore();
    await circuitStore.write("tiktok-web", {
      consecutiveFailures: 0,
      pausedUntil: new Date(Date.now() + 60_000).toISOString(),
    });

    const result = await handleCollectTask(
      { source: "tiktok-web", productExternalId: "p1" },
      { sources: { "tiktok-web": source }, circuitStore, bq: makeFakeBigQuery() },
    );

    expect(result.status).toBe("skipped_circuit_open");
    expect(source.fetchProductSnapshot).not.toHaveBeenCalled();
  });

  it("records a failure and returns an error when the source throws", async () => {
    const source: CollectorSource = {
      name: "tiktok-api",
      fetchProductSnapshot: vi.fn().mockRejectedValue(new Error("boom")),
    };
    const circuitStore = makeInMemoryCircuitStore();

    const result = await handleCollectTask(
      { source: "tiktok-api", productExternalId: "p1" },
      { sources: { "tiktok-api": source }, circuitStore, bq: makeFakeBigQuery() },
    );

    expect(result).toEqual({ status: "error", error: "boom" });
    const { state } = await import("../circuit-breaker.js").then((m) =>
      m.checkCircuit(circuitStore, "tiktok-api"),
    );
    expect(state.consecutiveFailures).toBe(1);
  });
});
