import { z } from "zod";
import { marketSchema } from "./market";
import { estimatedRangeSchema } from "./estimate";
import { hookTypeSchema } from "./hooks";

export const creatorRanksSchema = z.object({
  gmv: z.number().int().positive().optional(),
  engagement: z.number().int().positive().optional(),
  niche: z.number().int().positive().optional(),
});
export type CreatorRanks = z.infer<typeof creatorRanksSchema>;

export const creatorSchema = z.object({
  id: z.string(),
  handle: z.string(),
  followerCount: z.number().int().nonnegative(),
  avgViews: z.number().int().nonnegative(),
  engagementRate: z.number().min(0).max(1),
  categories: z.array(z.string()),
  market: marketSchema,
  estimatedMonthlyGmv: estimatedRangeSchema,
  productPortfolio: z.array(z.string()),
  hookSignature: z.array(hookTypeSchema),
  postingCadence: z.number().nonnegative(),
  ranks: creatorRanksSchema.optional(),
});
export type Creator = z.infer<typeof creatorSchema>;
