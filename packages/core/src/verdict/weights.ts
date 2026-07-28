import { z } from "zod";

// Poids de la saturation (0-100), somme = 1. Source de vérité : Remote
// Config config/scoringWeights — jamais en dur dans le code.
export const scoringWeightsSchema = z.object({
  competingShops: z.number().min(0).max(1).default(0.3),
  creatorDensity: z.number().min(0).max(1).default(0.25),
  priceDropAmplitude14d: z.number().min(0).max(1).default(0.2),
  newSellerArrivalRate7d: z.number().min(0).max(1).default(0.15),
  reviewVelocityDeceleration: z.number().min(0).max(1).default(0.1),
});
export type ScoringWeights = z.infer<typeof scoringWeightsSchema>;

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  competingShops: 0.3,
  creatorDensity: 0.25,
  priceDropAmplitude14d: 0.2,
  newSellerArrivalRate7d: 0.15,
  reviewVelocityDeceleration: 0.1,
};
