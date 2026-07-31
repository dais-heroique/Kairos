import { describe, expect, it } from "vitest";
import { convertToAccountCredit } from "./credit-ledger";

describe("convertToAccountCredit", () => {
  it("converts 1:1, no Stripe fees since no transfer happens", () => {
    expect(convertToAccountCredit(1234)).toEqual({ creditCents: 1234 });
  });

  it("handles zero without crashing", () => {
    expect(convertToAccountCredit(0)).toEqual({ creditCents: 0 });
  });
});
