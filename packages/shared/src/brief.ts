import { z } from "zod";
import { hookTypeSchema } from "./hooks";
import { followerRangeSchema, type FollowerRange } from "./user";

export const briefHookSchema = z.object({
  type: hookTypeSchema,
  spokenLine: z.string(),
});
export type BriefHook = z.infer<typeof briefHookSchema>;

export const shotListItemSchema = z.object({
  description: z.string(),
  done: z.boolean().default(false),
});
export type ShotListItem = z.infer<typeof shotListItemSchema>;

// Cache 7 jours par (produit × bucket de profil) — jamais par utilisateur,
// sinon zéro réutilisation (§ Lot 6). bucket = niche × fourchette
// d'abonnés, pas l'utilisateur lui-même.
export const briefSchema = z.object({
  productId: z.string(),
  nicheBucket: z.string(),
  followerRange: followerRangeSchema,
  hooks: z.array(briefHookSchema).min(1).max(3),
  shotList: z.array(shotListItemSchema).min(1),
  script: z.string(),
  objections: z.array(z.string()),
  // "generic" quand aucun commentaire réel n'est disponible (voir
  // packages/shared/src/comment.ts, capture best-effort) — dégrade
  // proprement plutôt que d'inventer de fausses objections.
  objectionsSource: z.enum(["real_comments", "generic"]),
  doNots: z.array(z.string()),
  generatedAt: z.string().datetime(),
  cacheExpiresAt: z.string().datetime(),
});
export type Brief = z.infer<typeof briefSchema>;

// Clé de cache briefCache/{cacheId} — (produit × niche × fourchette
// d'abonnés), jamais par utilisateur individuel, sinon zéro réutilisation.
export function computeBriefCacheKey(
  productId: string,
  nicheBucket: string,
  followerRange: FollowerRange,
): string {
  return `${productId}_${nicheBucket}_${followerRange}`;
}

export const BRIEF_CACHE_TTL_DAYS = 7;
