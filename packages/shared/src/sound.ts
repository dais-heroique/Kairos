import { z } from "zod";

export const soundPhaseSchema = z.enum(["rising", "peak", "dead"]);
export type SoundPhase = z.infer<typeof soundPhaseSchema>;

export const soundSchema = z.object({
  id: z.string(),
  title: z.string(),
  usageCount7d: z.number().int().nonnegative(),
  usageGrowth: z.number(),
  conversionIndex: z.number().nonnegative(),
  phase: soundPhaseSchema,
  linkedProductIds: z.array(z.string()),
});
export type Sound = z.infer<typeof soundSchema>;
