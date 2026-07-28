import type { ReferralStatus } from "@kairos/shared";

export interface ClawbackResult {
  newStatus: ReferralStatus;
  clawbackCents: number;
}

// Sur remboursement/chargeback, on reprend tout ce qui n'est pas encore
// payé (pending + eligible) — jamais ce qui a déjà été versé (paidCents),
// irréversible une fois le virement parti.
export function applyClawback(pendingCents: number, eligibleCents: number): ClawbackResult {
  return {
    newStatus: "refunded",
    clawbackCents: pendingCents + eligibleCents,
  };
}
