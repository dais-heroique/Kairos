// 30% récurrent sur 12 mois, pas à vie — sauf palier Ambassadeur (flag
// Remote Config `isLifetimeAmbassador`, résolu par l'appelant).
export const COMMISSION_RATE_PCT = 30;
export const COMMISSION_MONTHS_LIMIT = 12;

export interface CommissionInput {
  paymentAmountCents: number;
  // Nombre de mois déjà commissionnés pour ce filleul avant ce paiement.
  monthsCommissioned: number;
  isLifetimeAmbassador: boolean;
}

export interface CommissionResult {
  commissionCents: number;
  // Plafonné à COMMISSION_MONTHS_LIMIT même pour un Ambassadeur (le champ
  // Firestore monthsCommissioned est borné à 12, voir
  // packages/shared/src/affiliate.ts) — c'est isLifetimeAmbassador qui
  // fait continuer à commissionner au-delà, pas ce compteur.
  monthsCommissioned: number;
}

export function computeCommission(input: CommissionInput): CommissionResult {
  const eligible =
    input.isLifetimeAmbassador || input.monthsCommissioned < COMMISSION_MONTHS_LIMIT;

  if (!eligible) {
    return { commissionCents: 0, monthsCommissioned: input.monthsCommissioned };
  }

  return {
    commissionCents: Math.round(input.paymentAmountCents * (COMMISSION_RATE_PCT / 100)),
    monthsCommissioned: Math.min(COMMISSION_MONTHS_LIMIT, input.monthsCommissioned + 1),
  };
}
