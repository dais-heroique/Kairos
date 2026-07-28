import { describe, expect, it } from "vitest";
import { estimatedRangeSchema } from "./estimate";
import { affiliateCodeSchema } from "./affiliate";

describe("estimatedRangeSchema", () => {
  it("accepts a valid range", () => {
    const result = estimatedRangeSchema.safeParse({
      low: 10,
      high: 20,
      confidence: 0.6,
      method: "category_benchmark",
    });
    expect(result.success).toBe(true);
  });

  it("rejects low > high", () => {
    const result = estimatedRangeSchema.safeParse({
      low: 30,
      high: 20,
      confidence: 0.6,
      method: "category_benchmark",
    });
    expect(result.success).toBe(false);
  });
});

describe("affiliateCodeSchema", () => {
  it("accepts an unambiguous base32 code", () => {
    expect(affiliateCodeSchema.safeParse("K7XM4P2R").success).toBe(true);
  });

  it("rejects ambiguous characters", () => {
    expect(affiliateCodeSchema.safeParse("K7XM0O1I").success).toBe(false);
  });
});
