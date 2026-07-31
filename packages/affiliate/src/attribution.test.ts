import { describe, expect, it } from "vitest";
import { canEnterCodeManually, resolveFirstTouchAttribution } from "./attribution";

describe("resolveFirstTouchAttribution", () => {
  const signupAt = new Date("2026-07-28T00:00:00.000Z");

  it("picks the earliest click within the 90-day window (first-touch, not last-touch)", () => {
    const result = resolveFirstTouchAttribution(
      [
        { code: "SECOND01", clickedAt: new Date("2026-07-20T00:00:00.000Z") },
        { code: "FIRST001", clickedAt: new Date("2026-07-01T00:00:00.000Z") },
      ],
      signupAt,
    );
    expect(result).toBe("FIRST001");
  });

  it("ignores clicks outside the 90-day window", () => {
    const result = resolveFirstTouchAttribution(
      [{ code: "TOOOLD01", clickedAt: new Date("2026-01-01T00:00:00.000Z") }],
      signupAt,
    );
    expect(result).toBeNull();
  });

  it("ignores clicks that happen after signup", () => {
    const result = resolveFirstTouchAttribution(
      [{ code: "FUTURE01", clickedAt: new Date("2026-08-01T00:00:00.000Z") }],
      signupAt,
    );
    expect(result).toBeNull();
  });

  it("returns null with no clicks at all", () => {
    expect(resolveFirstTouchAttribution([], signupAt)).toBeNull();
  });
});

describe("canEnterCodeManually", () => {
  const signupAt = new Date("2026-07-01T00:00:00.000Z");

  it("allows manual entry within 7 days of signup", () => {
    expect(canEnterCodeManually(signupAt, new Date("2026-07-05T00:00:00.000Z"))).toBe(true);
  });

  it("blocks manual entry after 7 days", () => {
    expect(canEnterCodeManually(signupAt, new Date("2026-07-10T00:00:00.000Z"))).toBe(false);
  });
});
