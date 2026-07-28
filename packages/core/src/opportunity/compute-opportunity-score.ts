import type { Commission, ProductVerdict, SellerTrust } from "@kairos/shared";

// Classement "opportunités" (M2 #9) — phase précoce × commission élevée ×
// vendeur fiable × faible saturation. Fonction pure, implémentée en Phase 2.
export function computeOpportunityScore(
  _verdict: ProductVerdict,
  _commission: Commission,
  _sellerTrust: SellerTrust,
): number {
  throw new Error("computeOpportunityScore: not implemented — Phase 2");
}
