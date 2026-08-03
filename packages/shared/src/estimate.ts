import { z } from "zod";

// Contrat obligatoire pour toute valeur estimée affichée à l'utilisateur.
// Jamais un nombre nu — voir <EstimatedValue> côté apps/web et la règle
// ESLint qui interdit l'affichage brut d'un champ *Low/*High sans passer par
// ce composant. low <= high toujours, confidence dans [0, 1].
export const confidenceSchema = z.number().min(0).max(1);

export const estimateMethodSchema = z.enum([
  "historical_regression",
  "category_benchmark",
  "seller_declared",
  "ground_truth_calibrated",
  "insufficient_data",
  // Relevé transcrit à la main depuis l'espace affilié TikTok Shop
  // (décision #8) : ce n'est ni une régression ni un benchmark, et le dire
  // franchement vaut mieux que de le déguiser en "seller_declared".
  "manual_entry",
]);
export type EstimateMethod = z.infer<typeof estimateMethodSchema>;

export const estimatedRangeSchema = z
  .object({
    low: z.number().nonnegative(),
    high: z.number().nonnegative(),
    confidence: confidenceSchema,
    method: estimateMethodSchema,
  })
  .refine((v) => v.low <= v.high, {
    message: "low must be <= high",
    path: ["low"],
  });
export type EstimatedRange = z.infer<typeof estimatedRangeSchema>;
