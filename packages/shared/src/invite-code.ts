import { z } from "zod";

// inviteCodes/{code} — perk simple pour les amis d'un admin : un code donne
// X jours d'essai du plan Pro à la création. Pas de commission, pas de
// Stripe Connect — juste un compteur d'usage. Rien à voir avec le programme
// d'affiliation §5 (Phase 6), qui reste séparé (voir referredByCode).
export const inviteCodeSchema = z.object({
  code: z.string().min(4).max(20),
  trialDays: z.number().int().positive().max(365),
  maxUses: z.number().int().positive(),
  usedCount: z.number().int().nonnegative(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
});
export type InviteCode = z.infer<typeof inviteCodeSchema>;
