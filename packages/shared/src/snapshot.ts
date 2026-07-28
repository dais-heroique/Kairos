import { z } from "zod";

// Miroir de BigQuery kairos.product_snapshots — une ligne par produit par
// jour. C'est l'unique forme d'entrée du moteur packages/core/verdict :
// jamais de lecture Firestore historique, toujours un tableau de ces
// snapshots (45 jours) sorti d'une requête BigQuery partitionnée.
export const productSnapshotSchema = z.object({
  productId: z.string(),
  capturedDate: z.string().date(),
  priceCents: z.number().int().nonnegative(),
  reviewCount: z.number().int().nonnegative(),
  ratingAvg: z.number().min(0).max(5),
  activeCreatorCount: z.number().int().nonnegative(),
  videoCount: z.number().int().nonnegative(),
  competingShopCount: z.number().int().nonnegative(),
  estSalesLow: z.number().nonnegative(),
  estSalesHigh: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
});
export type ProductSnapshot = z.infer<typeof productSnapshotSchema>;
