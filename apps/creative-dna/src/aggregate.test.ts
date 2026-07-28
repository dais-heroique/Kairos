import { describe, expect, it } from "vitest";
import type { VideoAnalysis } from "@kairos/shared";
import { aggregateCreativeSummary } from "./aggregate.js";

function makeAnalysis(overrides: Partial<VideoAnalysis> = {}): VideoAnalysis {
  return {
    hookType: "pov",
    hookText: "test",
    hookDurationMs: 1000,
    structure: ["hook", "demo", "cta"],
    objectionsHandled: [],
    ctaType: "swipe_up",
    ctaTimingSec: 15,
    visualTags: [],
    pacingScore: 50,
    hasHumanFace: true,
    ...overrides,
  };
}

describe("aggregateCreativeSummary", () => {
  it("counts analyzed videos", () => {
    const summary = aggregateCreativeSummary([makeAnalysis(), makeAnalysis()]);
    expect(summary.analyzedVideoCount).toBe(2);
  });

  it("ranks the top 3 hook types by frequency", () => {
    const summary = aggregateCreativeSummary([
      makeAnalysis({ hookType: "pov" }),
      makeAnalysis({ hookType: "pov" }),
      makeAnalysis({ hookType: "unboxing" }),
      makeAnalysis({ hookType: "storytime" }),
      makeAnalysis({ hookType: "comparaison" }),
    ]);
    expect(summary.topHookTypes[0]).toBe("pov");
    expect(summary.topHookTypes.length).toBeLessThanOrEqual(3);
  });

  it("classifies high-pacing videos as winning patterns and low-pacing as dead patterns", () => {
    const summary = aggregateCreativeSummary([
      makeAnalysis({ pacingScore: 90, structure: ["fast_hook"] }),
      makeAnalysis({ pacingScore: 20, structure: ["slow_intro"] }),
    ]);
    expect(summary.winningPatterns).toContain("fast_hook");
    expect(summary.deadPatterns).toContain("slow_intro");
    expect(summary.winningPatterns).not.toContain("slow_intro");
  });

  it("handles an empty analysis list without crashing", () => {
    const summary = aggregateCreativeSummary([]);
    expect(summary).toEqual({
      topHookTypes: [],
      winningPatterns: [],
      deadPatterns: [],
      analyzedVideoCount: 0,
    });
  });
});
