import { callAI, type CallAIDeps } from "@kairos/ai-gateway";
import { videoAnalysisSchema, type ProductVideo, type VideoAnalysis } from "@kairos/shared";

const MODEL = "gemini-2.5-flash";
const MAX_ATTEMPTS = 2; // 1 essai + 1 retry, puis échec propre pour cette vidéo

function buildAnalysisPrompt(video: ProductVideo): string {
  return [
    "Analyse cette vidéo TikTok Shop et réponds UNIQUEMENT avec un JSON valide",
    `respectant ce schéma : hookType, hookText, hookDurationMs, structure[],`,
    `objectionsHandled[], ctaType, ctaTimingSec, visualTags[], soundId?, pacingScore (0-100), hasHumanFace.`,
    `Vidéo : ${video.url}`,
  ].join(" ");
}

export type AnalyzeVideoResult =
  | { status: "ok"; analysis: VideoAnalysis }
  | { status: "skipped"; reason: "quota_exceeded" | "global_cap_exceeded" | "invalid_output" };

// Sortie validée par Zod, 1 retry puis échec propre par vidéo — un échec
// n'interrompt jamais le traitement du reste du lot (voir aggregate.ts,
// appelé sur les seules analyses réussies).
export async function analyzeVideoWithRetry(
  video: ProductVideo,
  userId: string,
  deps: CallAIDeps,
): Promise<AnalyzeVideoResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await callAI(
      {
        userId,
        feature: "creative_dna",
        model: MODEL,
        prompt: buildAnalysisPrompt(video),
      },
      { ...deps, aiClient: { complete: (p) => deps.aiClient.complete({ ...p, mediaUrl: video.url }) } },
    );

    if (result.status === "quota_exceeded") return { status: "skipped", reason: "quota_exceeded" };
    if (result.status === "global_cap_exceeded") {
      return { status: "skipped", reason: "global_cap_exceeded" };
    }

    try {
      const parsed: unknown = JSON.parse(result.text);
      const analysis = videoAnalysisSchema.parse(parsed);
      return { status: "ok", analysis };
    } catch {
      if (attempt === MAX_ATTEMPTS) return { status: "skipped", reason: "invalid_output" };
      // sinon on boucle pour le retry
    }
  }
  return { status: "skipped", reason: "invalid_output" };
}
