import { describe, expect, it } from "vitest";
import { checkQuota, computeCostCents, isGlobalCapExceeded, PLAN_QUOTAS } from "./spend-guard";

describe("checkQuota", () => {
  it("allows usage under the plan limit", () => {
    const result = checkQuota("radar", 2);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("blocks usage at or above the plan limit", () => {
    expect(checkQuota("radar", 3).allowed).toBe(false);
    expect(checkQuota("radar", 5).allowed).toBe(false);
    expect(checkQuota("radar", 5).remaining).toBe(0);
  });

  it("applies the correct limit per plan", () => {
    expect(PLAN_QUOTAS.radar).toBe(3);
    expect(PLAN_QUOTAS.creator).toBe(60);
    expect(PLAN_QUOTAS.pro).toBe(200);
    expect(checkQuota("pro", 150).remaining).toBe(50);
  });
});

describe("computeCostCents", () => {
  it("computes cost from input/output token pricing", () => {
    const cost = computeCostCents("claude-sonnet-5", 1000, 1000);
    // (1000/1000)*0.3 + (1000/1000)*1.5 = 1.8 -> ceil = 2
    expect(cost).toBe(2);
  });

  it("rounds up rather than down (conservative for a cost guard)", () => {
    const cost = computeCostCents("gemini-2.5-flash", 100, 0);
    expect(cost).toBeGreaterThanOrEqual(1);
  });

  it("throws on an unknown model rather than silently returning 0", () => {
    expect(() => computeCostCents("unknown-model", 100, 100)).toThrow(/no pricing configured/);
  });
});

describe("isGlobalCapExceeded", () => {
  it("is exceeded at or above the cap", () => {
    expect(isGlobalCapExceeded(5000, 5000)).toBe(true);
    expect(isGlobalCapExceeded(5001, 5000)).toBe(true);
  });

  it("is not exceeded below the cap", () => {
    expect(isGlobalCapExceeded(4999, 5000)).toBe(false);
  });
});
