import type { CreativeSummary, HookType, VideoAnalysis } from "@kairos/shared";

const WINNING_PACING_THRESHOLD = 70;
const DEAD_PACING_THRESHOLD = 40;
const MAX_PATTERNS = 5;

export function aggregateCreativeSummary(analyses: VideoAnalysis[]): CreativeSummary {
  const hookCounts = new Map<HookType, number>();
  for (const analysis of analyses) {
    hookCounts.set(analysis.hookType, (hookCounts.get(analysis.hookType) ?? 0) + 1);
  }
  const topHookTypes = [...hookCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hookType]) => hookType);

  const winningPatterns = [
    ...new Set(
      analyses
        .filter((a) => a.pacingScore >= WINNING_PACING_THRESHOLD)
        .flatMap((a) => a.structure),
    ),
  ].slice(0, MAX_PATTERNS);

  const deadPatterns = [
    ...new Set(
      analyses.filter((a) => a.pacingScore < DEAD_PACING_THRESHOLD).flatMap((a) => a.structure),
    ),
  ].slice(0, MAX_PATTERNS);

  return {
    topHookTypes,
    winningPatterns,
    deadPatterns,
    analyzedVideoCount: analyses.length,
  };
}
