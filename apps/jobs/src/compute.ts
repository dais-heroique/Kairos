import { computeOpportunityScore, computeVerdict, hasInsufficientHistory } from "@kairos/core";
import type {
  Commission,
  ProductEstimates,
  ProductSnapshot,
  ProductVerdict,
  SellerTrust,
} from "@kairos/shared";

export interface ComputedProduct {
  productId: string;
  verdict: ProductVerdict;
  estimates: ProductEstimates;
  opportunityScore: number;
}

// Utilisées quand le document products/{id} existant n'a pas encore de
// commission/sellerTrust renseignées (produit jamais scoré, ou champ
// absent) — score d'opportunité neutre plutôt qu'un crash.
export const NEUTRAL_COMMISSION: Commission = {
  ratePct: 0,
  isOpenCollab: false,
  isTargetedOnly: false,
};

export const NEUTRAL_SELLER_TRUST: SellerTrust = {
  score: 50,
  shipDays: 5,
  commissionHonorRate: 0.5,
  sampleApprovalRate: 0.5,
  avgSampleResponseHours: 48,
  disputeRate: 0.1,
  sampleCount: 0,
};

export function computeProductVerdictAndEstimates(
  productId: string,
  snapshots: ProductSnapshot[],
  commission: Commission = NEUTRAL_COMMISSION,
  sellerTrust: SellerTrust = NEUTRAL_SELLER_TRUST,
): ComputedProduct {
  const verdict = computeVerdict(snapshots);
  const insufficientData = hasInsufficientHistory(snapshots);
  const latest = snapshots[snapshots.length - 1];

  const estimates: ProductEstimates = latest
    ? {
        salesLow: latest.estSalesLow,
        salesHigh: latest.estSalesHigh,
        confidence: insufficientData ? Math.min(latest.confidence, 0.1) : latest.confidence,
        method: insufficientData ? "insufficient_data" : "historical_regression",
      }
    : { salesLow: 0, salesHigh: 0, confidence: 0.05, method: "insufficient_data" };

  const opportunityScore = computeOpportunityScore(verdict, commission, sellerTrust);

  return { productId, verdict, estimates, opportunityScore };
}
