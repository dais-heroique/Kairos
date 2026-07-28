import { z } from "zod";
import { marketSchema } from "./market";
import { productVerdictSchema, productEstimatesSchema } from "./verdict";
import { hookTypeSchema } from "./hooks";

export const commissionSchema = z.object({
  ratePct: z.number().min(0).max(100),
  isOpenCollab: z.boolean(),
  isTargetedOnly: z.boolean(),
});
export type Commission = z.infer<typeof commissionSchema>;

export const sellerTrustSchema = z.object({
  score: z.number().min(0).max(100),
  shipDays: z.number().nonnegative(),
  commissionHonorRate: z.number().min(0).max(1),
  sampleApprovalRate: z.number().min(0).max(1),
  avgSampleResponseHours: z.number().nonnegative(),
  disputeRate: z.number().min(0).max(1),
  sampleCount: z.number().int().nonnegative(),
});
export type SellerTrust = z.infer<typeof sellerTrustSchema>;

export const returnRiskSchema = z.object({
  estimatedReturnRatePct: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
});
export type ReturnRisk = z.infer<typeof returnRiskSchema>;

export const creativeSummarySchema = z.object({
  topHookTypes: z.array(hookTypeSchema),
  winningPatterns: z.array(z.string()),
  deadPatterns: z.array(z.string()),
  analyzedVideoCount: z.number().int().nonnegative(),
});
export type CreativeSummary = z.infer<typeof creativeSummarySchema>;

export const productRanksSchema = z.object({
  sales7d: z.number().int().positive().optional(),
  growth7d: z.number().int().positive().optional(),
  opportunity: z.number().int().positive().optional(),
  category: z.number().int().positive().optional(),
});
export type ProductRanks = z.infer<typeof productRanksSchema>;

export const productSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  market: marketSchema,
  title: z.string(),
  imageUrl: z.string().url(),
  priceCents: z.number().int().nonnegative(),
  currency: z.literal("EUR"),
  categoryPath: z.array(z.string()),
  shopId: z.string(),
  dedupeHash: z.string(),
  isActive: z.boolean(),
  firstSeenAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  commission: commissionSchema,
  latestVerdict: productVerdictSchema.optional(),
  latestEstimates: productEstimatesSchema.optional(),
  sellerTrust: sellerTrustSchema.optional(),
  returnRisk: returnRiskSchema.optional(),
  creativeSummary: creativeSummarySchema.optional(),
  ranks: productRanksSchema.optional(),
});
export type Product = z.infer<typeof productSchema>;

export const videoAnalysisSchema = z.object({
  hookType: hookTypeSchema,
  hookText: z.string(),
  hookDurationMs: z.number().int().nonnegative(),
  structure: z.array(z.string()),
  objectionsHandled: z.array(z.string()),
  ctaType: z.string(),
  ctaTimingSec: z.number().nonnegative(),
  visualTags: z.array(z.string()),
  soundId: z.string().optional(),
  pacingScore: z.number().min(0).max(100),
  hasHumanFace: z.boolean(),
});
export type VideoAnalysis = z.infer<typeof videoAnalysisSchema>;

export const productVideoSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  url: z.string().url(),
  postedAt: z.string().datetime(),
  views: z.number().int().nonnegative(),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  gmvPer1kViews: z.number().nonnegative(),
  analysis: videoAnalysisSchema.optional(),
});
export type ProductVideo = z.infer<typeof productVideoSchema>;
