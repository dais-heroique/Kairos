import { describe, expect, it } from "vitest";
import { computeCommission, COMMISSION_MONTHS_LIMIT, COMMISSION_RATE_PCT } from "./compute-commission";

describe("computeCommission", () => {
  it("pays 30% of the payment amount", () => {
    const result = computeCommission({
      paymentAmountCents: 2000,
      monthsCommissioned: 0,
      isLifetimeAmbassador: false,
    });
    expect(result.commissionCents).toBe(600);
    expect(COMMISSION_RATE_PCT).toBe(30);
  });

  it("increments monthsCommissioned by one each payment", () => {
    const result = computeCommission({
      paymentAmountCents: 1000,
      monthsCommissioned: 3,
      isLifetimeAmbassador: false,
    });
    expect(result.monthsCommissioned).toBe(4);
  });

  it("stops paying after 12 months for a regular referral", () => {
    const result = computeCommission({
      paymentAmountCents: 1000,
      monthsCommissioned: COMMISSION_MONTHS_LIMIT,
      isLifetimeAmbassador: false,
    });
    expect(result.commissionCents).toBe(0);
    expect(result.monthsCommissioned).toBe(COMMISSION_MONTHS_LIMIT);
  });

  it("keeps paying past 12 months for a lifetime Ambassador", () => {
    const result = computeCommission({
      paymentAmountCents: 1000,
      monthsCommissioned: COMMISSION_MONTHS_LIMIT,
      isLifetimeAmbassador: true,
    });
    expect(result.commissionCents).toBe(300);
  });

  it("never lets monthsCommissioned exceed 12, even for a lifetime Ambassador", () => {
    const result = computeCommission({
      paymentAmountCents: 1000,
      monthsCommissioned: COMMISSION_MONTHS_LIMIT,
      isLifetimeAmbassador: true,
    });
    expect(result.monthsCommissioned).toBe(COMMISSION_MONTHS_LIMIT);
  });
});
