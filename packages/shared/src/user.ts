import { z } from "zod";
import { marketSchema } from "./market";
import { affiliateCodeSchema } from "./affiliate";

export const PLAN_SLUGS = ["radar", "creator", "pro"] as const;
export const planSlugSchema = z.enum(PLAN_SLUGS);
export type PlanSlug = z.infer<typeof planSlugSchema>;

export const planStatusSchema = z.enum([
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
]);
export type PlanStatus = z.infer<typeof planStatusSchema>;

// users/{uid}.plan — jamais modifiable par le client (Firestore Rules),
// écrit uniquement par les webhooks Stripe via Admin SDK.
export const planSchema = z.object({
  slug: planSlugSchema,
  status: planStatusSchema,
  currentPeriodEnd: z.string().datetime().nullable(),
  stripeCustomerId: z.string().nullable(),
});
export type Plan = z.infer<typeof planSchema>;

export const experienceLevelSchema = z.enum([
  "debutant",
  "intermediaire",
  "confirme",
]);
export type ExperienceLevel = z.infer<typeof experienceLevelSchema>;

export const followerRangeSchema = z.enum([
  "0_1k",
  "1k_5k",
  "5k_20k",
  "20k_100k",
  "100k_plus",
]);
export type FollowerRange = z.infer<typeof followerRangeSchema>;

// Capturé à l'onboarding — la fourchette d'abonnés + vues moyennes est ce
// qui permet au simulateur de gains (M3) de convertir en €.
export const userProfileSchema = z.object({
  niches: z.array(z.string()),
  markets: z.array(marketSchema),
  creatorHandle: z.string().optional(),
  followerRange: followerRangeSchema,
  avgViews: z.number().int().nonnegative(),
  experienceLevel: experienceLevelSchema,
  onboardingCompletedAt: z.string().datetime().nullable(),
  timezone: z.string(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const userStatsSchema = z.object({
  briefsGenerated: z.number().int().nonnegative(),
  videosPosted: z.number().int().nonnegative(),
  estimatedEarningsCents: z.number().int().nonnegative(),
});
export type UserStats = z.infer<typeof userStatsSchema>;

export const userRoleSchema = z.enum(["user", "admin"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
  locale: z.literal("fr"),
  role: userRoleSchema,
  createdAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
  profile: userProfileSchema,
  plan: planSchema,
  stats: userStatsSchema,
  // Capturé à l'inscription (§5.3) — code brut, non encore vérifié/scoré.
  // La Phase 6 le transforme en affiliateReferrals réel (fraudScore, etc.).
  // Immutable après création (voir firestore.rules).
  referredByCode: affiliateCodeSchema.nullable(),
  // Code d'invitation utilisé pour obtenir l'essai Pro (voir invite-code.ts).
  // Immutable une fois posé — voir firestore.rules isValidTrialGrant().
  // .optional() : les comptes créés avant l'ajout de ce champ n'en ont pas
  // encore en base — sans ça, userSchema.parse() plante à la lecture pour
  // tout compte existant et bloque l'app sur un écran blanc.
  appliedInviteCode: z.string().nullable().optional(),
});
export type User = z.infer<typeof userSchema>;

export const watchlistStatusSchema = z.enum([
  "watching",
  "sample_requested",
  "sample_received",
  "filmed",
  "posted",
  "dropped",
]);
export type WatchlistStatus = z.infer<typeof watchlistStatusSchema>;

// users/{uid}/watchlist/{productId} — un pipeline, pas une liste de favoris.
export const watchlistEntrySchema = z.object({
  productId: z.string(),
  addedAt: z.string().datetime(),
  notes: z.string().optional(),
  alertsEnabled: z.boolean(),
  status: watchlistStatusSchema,
});
export type WatchlistEntry = z.infer<typeof watchlistEntrySchema>;

export const portfolioStatusSchema = z.enum([
  "posted",
  "pending_settlement",
  "settled",
  "disputed",
]);
export type PortfolioStatus = z.infer<typeof portfolioStatusSchema>;

export const portfolioEntrySchema = z.object({
  productId: z.string(),
  videoUrl: z.string().url(),
  postedAt: z.string().datetime(),
  views: z.number().int().nonnegative(),
  estimatedCommissionCents: z.number().int().nonnegative(),
  confirmedCommissionCents: z.number().int().nonnegative().nullable(),
  settlementDate: z.string().datetime().nullable(),
  status: portfolioStatusSchema,
});
export type PortfolioEntry = z.infer<typeof portfolioEntrySchema>;
