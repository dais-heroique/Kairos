import type { ProductSnapshot, ProductVerdict } from "@kairos/shared";
import type { ScoringWeights } from "./weights";

// Fonction pure — implémentée en Phase 2 avec les tests fixtures d'abord.
// snapshots doit couvrir jusqu'à 45 jours, trié par capturedDate croissant.
// weights vient de Remote Config (config/scoringWeights), jamais en dur.
export function computeVerdict(
  _snapshots: ProductSnapshot[],
  _weights: ScoringWeights,
): ProductVerdict {
  throw new Error("computeVerdict: not implemented — Phase 2");
}
