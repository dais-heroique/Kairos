import { z } from "zod";

// Code parrain : 8 caractères base32 sans caractères ambigus (pas de 0 O 1 I L).
export const AFFILIATE_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const affiliateCodeSchema = z
  .string()
  .length(8)
  .regex(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);

export const payoutModeSchema = z.enum(["cash", "credit"]);
export type PayoutMode = z.infer<typeof payoutModeSchema>;

export const AFFILIATE_TIERS = [
  { name: "eclaireur", minReferrals: 1 },
  { name: "radar", minReferrals: 3 },
  { name: "chasseur", minReferrals: 10 },
  { name: "ambassadeur", minReferrals: 25 },
] as const;
export const affiliateTierNameSchema = z.enum([
  "eclaireur",
  "radar",
  "chasseur",
  "ambassadeur",
]);
export type AffiliateTierName = z.infer<typeof affiliateTierNameSchema>;

// users/{uid}/affiliate (doc unique)
export const affiliateProfileSchema = z.object({
  code: affiliateCodeSchema,
  customSlug: z.string().nullable(),
  payoutMode: payoutModeSchema,
  stripeConnectAccountId: z.string().nullable(),
  referralCount: z.number().int().nonnegative(),
  tier: affiliateTierNameSchema.nullable(),
  lifetimeCommissionFlag: z.boolean(),
  pendingCents: z.number().int().nonnegative(),
  eligibleCents: z.number().int().nonnegative(),
  paidCents: z.number().int().nonnegative(),
});
export type AffiliateProfile = z.infer<typeof affiliateProfileSchema>;

export const referralStatusSchema = z.enum([
  "pending",
  "qualified",
  "converted",
  "active",
  "expired",
  "rejected",
  "refunded",
]);
export type ReferralStatus = z.infer<typeof referralStatusSchema>;

// affiliateReferrals/{referralId}
export const affiliateReferralSchema = z.object({
  id: z.string(),
  referrerUid: z.string(),
  referredUid: z.string(),
  code: affiliateCodeSchema,
  status: referralStatusSchema,
  clickedAt: z.string().datetime().nullable(),
  signedUpAt: z.string().datetime(),
  qualifiedAt: z.string().datetime().nullable(),
  convertedAt: z.string().datetime().nullable(),
  monthsCommissioned: z.number().int().min(0).max(12),
  fraudScore: z.number().min(0).max(100),
});
export type AffiliateReferral = z.infer<typeof affiliateReferralSchema>;

export const affiliatePayoutStatusSchema = z.enum([
  "scheduled",
  "paid",
  "failed",
  "clawed_back",
]);
export type AffiliatePayoutStatus = z.infer<typeof affiliatePayoutStatusSchema>;

// affiliatePayouts/{payoutId}
export const affiliatePayoutSchema = z.object({
  id: z.string(),
  affiliateUid: z.string(),
  amountCents: z.number().int().nonnegative(),
  mode: payoutModeSchema,
  status: affiliatePayoutStatusSchema,
  scheduledFor: z.string().datetime(),
  paidAt: z.string().datetime().nullable(),
});
export type AffiliatePayout = z.infer<typeof affiliatePayoutSchema>;

// affiliateClicks/{clickId} — attribution first-touch, cookie kai_ref 90j.
export const affiliateClickSchema = z.object({
  id: z.string(),
  code: affiliateCodeSchema,
  clickedAt: z.string().datetime(),
  ipHash: z.string(),
  fingerprint: z.string(),
});
export type AffiliateClick = z.infer<typeof affiliateClickSchema>;
