import { z } from "zod";

// Miroir de BigQuery kairos.video_comments — capture best-effort du texte
// des commentaires (apps/collector, non validé contre le site réel),
// nécessaire pour extraire de vraies objections dans le brief généré
// (Lot 6) plutôt que des objections génériques.
export const videoCommentSchema = z.object({
  videoId: z.string(),
  commentId: z.string(),
  text: z.string(),
  likeCount: z.number().int().nonnegative(),
  capturedDate: z.string().date(),
});
export type VideoComment = z.infer<typeof videoCommentSchema>;
