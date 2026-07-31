import type { PayoutMode } from "@kairos/shared";

export const PAYOUT_THRESHOLD_CENTS = 2500; // 25€

export function isPayoutThresholdMet(eligibleCents: number): boolean {
  return eligibleCents >= PAYOUT_THRESHOLD_CENTS;
}

// Compte Stripe Connect créé UNIQUEMENT au seuil de paiement, jamais à
// l'inscription — Stripe facture ~2$/mois par compte Connect actif, donc
// en créer un pour chaque inscrit reviendrait cher pour rien. Le mode
// crédit ne passe jamais par Connect (voir credit-ledger.ts).
export function shouldCreateStripeConnectAccount(
  eligibleCents: number,
  payoutMode: PayoutMode,
  existingAccountId: string | null,
): boolean {
  return (
    payoutMode === "cash" && existingAccountId === null && isPayoutThresholdMet(eligibleCents)
  );
}
