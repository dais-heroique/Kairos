import { describe, expect, it } from "vitest";
import { daysUntilPayable, isCommissionPayable } from "./hold-period";

describe("isCommissionPayable", () => {
  it("is not payable before 30 days", () => {
    const earnedAt = new Date("2026-07-01T00:00:00.000Z");
    const now = new Date("2026-07-15T00:00:00.000Z");
    expect(isCommissionPayable(earnedAt, now)).toBe(false);
  });

  it("becomes payable exactly at 30 days", () => {
    const earnedAt = new Date("2026-07-01T00:00:00.000Z");
    const now = new Date("2026-07-31T00:00:00.000Z");
    expect(isCommissionPayable(earnedAt, now)).toBe(true);
  });

  it("stays payable well after 30 days", () => {
    const earnedAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-07-28T00:00:00.000Z");
    expect(isCommissionPayable(earnedAt, now)).toBe(true);
  });
});

describe("daysUntilPayable", () => {
  it("counts down to zero", () => {
    const earnedAt = new Date("2026-07-01T00:00:00.000Z");
    expect(daysUntilPayable(earnedAt, new Date("2026-07-01T00:00:00.000Z"))).toBe(30);
    expect(daysUntilPayable(earnedAt, new Date("2026-07-31T00:00:00.000Z"))).toBe(0);
  });

  it("never goes negative", () => {
    const earnedAt = new Date("2026-01-01T00:00:00.000Z");
    expect(daysUntilPayable(earnedAt, new Date("2026-07-28T00:00:00.000Z"))).toBe(0);
  });
});
