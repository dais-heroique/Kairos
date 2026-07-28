import { describe, expect, it } from "vitest";
import { computeFraudScore, isFraudBlocked, isSelfReferral } from "./fraud-score";

const cleanSignals = {
  referrerUid: "u1",
  referredUid: "u2",
  referrerIpHash: "ip-a",
  referredIpHash: "ip-b",
  referrerFingerprint: "fp-a",
  referredFingerprint: "fp-b",
};

describe("isSelfReferral / computeFraudScore", () => {
  it("blocks self-referral with the maximum score, structurally not just as a penalty", () => {
    expect(isSelfReferral("u1", "u1")).toBe(true);
    expect(computeFraudScore({ ...cleanSignals, referrerUid: "u1", referredUid: "u1" })).toBe(100);
  });

  it("scores 0 for two genuinely different people on different devices/IPs", () => {
    expect(computeFraudScore(cleanSignals)).toBe(0);
    expect(isFraudBlocked(0)).toBe(false);
  });

  it("flags a shared IP between referrer and referred", () => {
    const score = computeFraudScore({ ...cleanSignals, referredIpHash: "ip-a" });
    expect(score).toBeGreaterThanOrEqual(50);
  });

  it("flags a shared device fingerprint between referrer and referred", () => {
    const score = computeFraudScore({ ...cleanSignals, referredFingerprint: "fp-a" });
    expect(score).toBeGreaterThanOrEqual(50);
  });

  it("blocks when both IP and fingerprint match, even without being the same account", () => {
    const score = computeFraudScore({
      ...cleanSignals,
      referredIpHash: "ip-a",
      referredFingerprint: "fp-a",
    });
    expect(isFraudBlocked(score)).toBe(true);
  });
});
