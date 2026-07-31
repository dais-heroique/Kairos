import { describe, expect, it } from "vitest";
import { applyClawback } from "./clawback";

describe("applyClawback", () => {
  it("reclaims both pending and eligible commissions", () => {
    const result = applyClawback(500, 1000);
    expect(result.clawbackCents).toBe(1500);
    expect(result.newStatus).toBe("refunded");
  });

  it("reclaims nothing when there was nothing owed", () => {
    const result = applyClawback(0, 0);
    expect(result.clawbackCents).toBe(0);
  });

  it("never touches already-paid amounts — those aren't part of this function's inputs at all", () => {
    // paidCents deliberately isn't a parameter: money already sent can't
    // be clawed back by this function, only pending/eligible balances.
    const result = applyClawback(200, 300);
    expect(result.clawbackCents).toBe(500);
  });
});
