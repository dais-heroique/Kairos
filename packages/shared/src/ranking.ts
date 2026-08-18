import { z } from "zod";
import { marketSchema } from "./market";

// Les 9 classements de M2. Chaque doc rankings/{type}_{market}_{period}_{category}
// est écrit une fois par jour par le job de recalcul — jamais par une requête
// à la volée (voir garde-fou §6.4 n°9).
export const RANKING_TYPES = [
  "products",
  "shops",
  "creators",
  "videos",
  "sounds",
  "categories",
  "newcomers",
  "waves",
  "opportunities",
] as const;
export const rankingTypeSchema = z.enum(RANKING_TYPES);
export type RankingType = z.infer<typeof rankingTypeSchema>;

export const RANKING_PERIODS = ["24h", "7d", "30d"] as const;
export const rankingPeriodSchema = z.enum(RANKING_PERIODS);
export type RankingPeriod = z.infer<typeof rankingPeriodSchema>;

export const rankingItemSchema = z.object({
  id: z.string(),
  rank: z.number().int().positive(),
});
export type RankingItem = z.infer<typeof rankingItemSchema>;

// items[] est un payload minimal (id + champs d'affichage de liste), pas
// l'entité complète — la page de détail refait 1 lecture dédiée.
export const rankingDocSchema = z.object({
  generatedAt: z.string().datetime(),
  type: rankingTypeSchema,
  market: marketSchema,
  period: rankingPeriodSchema,
  category: z.string().nullable(),
  /** Marché réellement couvert par la source, distinct du marché demandé par l'écran. */
  sourceMarket: marketSchema.optional(),
  items: z.array(rankingItemSchema.passthrough()).max(100),
});
export type RankingDoc = z.infer<typeof rankingDocSchema>;

export const feedDocSchema = z.object({
  generatedAt: z.string().datetime(),
  market: marketSchema,
  nicheBucket: z.string(),
  date: z.string(),
  items: z.array(rankingItemSchema.passthrough()).max(40),
});
export type FeedDoc = z.infer<typeof feedDocSchema>;
