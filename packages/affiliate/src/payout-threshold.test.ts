import { describe, expect, it } from "vitest";
import { isPayoutThresholdMet, PAYOUT_THRESHOLD_CENTS, shouldCreateStripeConnectAccount } from "./payout-threshold";

describe("isPayoutThresholdMet", () => {
  it("is met at or above 25€", () => {
    expect(isPayoutThresholdMet(PAYOUT_THRESHOLD_CENTS)).toBe(true);
    expect(isPayoutThresholdMet(PAYOUT_THRESHOLD_CENTS + 1)).toBe(true);
  });

  it("is not met below 25€", () => {
    expect(isPayoutThresholdMet(PAYOUT_THRESHOLD_CENTS - 1)).toBe(false);
  });
});

describe("shouldCreateStripeConnectAccount", () => {
  it("never creates a Connect account below the payout threshold, however early the user is", () => {
    expect(shouldCreateStripeConnectAccount(0, "cash", null)).toBe(false);
    expect(shouldCreateStripeConnectAccount(100, "cash", null)).toBe(false);
  });

  it("creates a Connect account once the threshold is met for cash mode", () => {
    expect(shouldCreateStripeConnectAccount(PAYOUT_THRESHOLD_CENTS, "cash", null)).toBe(true);
  });

  it("never creates a second account when one already exists", () => {
    expect(shouldCreateStripeConnectAccount(PAYOUT_THRESHOLD_CENTS, "cash", "acct_123")).toBe(
      false,
    );
  });

  it("never creates a Connect account for credit-mode payouts", () => {
    expect(shouldCreateStripeConnectAccount(PAYOUT_THRESHOLD_CENTS, "credit", null)).toBe(false);
  });
});
