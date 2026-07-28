import { z } from "zod";
import { marketSchema } from "./market";

export const shopRanksSchema = z.object({
  trust: z.number().int().positive().optional(),
  gmv: z.number().int().positive().optional(),
});
export type ShopRanks = z.infer<typeof shopRanksSchema>;

export const shopSchema = z.object({
  id: z.string(),
  name: z.string(),
  market: marketSchema,
  trustScore: z.number().min(0).max(100),
  shipDays: z.number().nonnegative(),
  sampleApprovalRate: z.number().min(0).max(1),
  commissionHonorRate: z.number().min(0).max(1),
  disputeRate: z.number().min(0).max(1),
  productCount: z.number().int().nonnegative(),
  verified: z.boolean(),
  ranks: shopRanksSchema.optional(),
});
export type Shop = z.infer<typeof shopSchema>;
