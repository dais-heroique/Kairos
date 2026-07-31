import { describe, expect, it, vi } from "vitest";
import type { CallAIDeps } from "@kairos/ai-gateway";
import type { ProductVideo } from "@kairos/shared";
import { analyzeVideoWithRetry } from "./analyze-video.js";

const video: ProductVideo = {
  id: "v1",
  creatorId: "c1",
  url: "https://example.com/v1",
  postedAt: new Date().toISOString(),
  views: 10000,
  likes: 100,
  comments: 10,
  shares: 5,
  gmvPer1kViews: 3.2,
};

const validAnalysisJson = JSON.stringify({
  hookType: "pov",
  hookText: "Tu ne vas pas croire ça",
  hookDurationMs: 1500,
  structure: ["hook", "demo", "cta"],
  objectionsHandled: ["prix"],
  ctaType: "swipe_up",
  ctaTimingSec: 18,
  visualTags: ["closeup"],
  pacingScore: 80,
  hasHumanFace: true,
});

function makeDeps(completeImpl: (p: unknown) => Promise<{ text: string; inputTokens: number; outputTokens: number }>): CallAIDeps {
  return {
    aiClient: { complete: vi.fn(completeImpl) },
    quotaReader: {
      getPlan: vi.fn().mockResolvedValue("pro"),
      getMonthlyUsage: vi.fn().mockResolvedValue(0),
      getGlobalDailySpendCents: vi.fn().mockResolvedValue(0),
      getGlobalDailyCapCents: vi.fn().mockResolvedValue(5000),
    },
    spendRecorder: { recordSpend: vi.fn().mockResolvedValue(undefined) },
  };
}

describe("analyzeVideoWithRetry", () => {
  it("returns a validated analysis on a valid first response", async () => {
    const deps = makeDeps(async () => ({ text: validAnalysisJson, inputTokens: 100, outputTokens: 50 }));

    const result = await analyzeVideoWithRetry(video, "u1", deps);

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.analysis.hookType).toBe("pov");
    }
  });

  it("retries once on invalid JSON then succeeds", async () => {
    let calls = 0;
    const deps = makeDeps(async () => {
      calls++;
      return calls === 1
        ? { text: "not json", inputTokens: 10, outputTokens: 5 }
        : { text: validAnalysisJson, inputTokens: 100, outputTokens: 50 };
    });

    const result = await analyzeVideoWithRetry(video, "u1", deps);

    expect(result.status).toBe("ok");
    expect(calls).toBe(2);
  });

  it("fails cleanly (does not throw) after exhausting the retry on invalid output", async () => {
    const deps = makeDeps(async () => ({ text: "still not json", inputTokens: 10, outputTokens: 5 }));

    const result = await analyzeVideoWithRetry(video, "u1", deps);

    expect(result).toEqual({ status: "skipped", reason: "invalid_output" });
  });

  it("stops immediately (no retry) when the quota is exhausted", async () => {
    const deps = makeDeps(async () => ({ text: validAnalysisJson, inputTokens: 0, outputTokens: 0 }));
    deps.quotaReader.getMonthlyUsage = vi.fn().mockResolvedValue(9999);
    deps.quotaReader.getPlan = vi.fn().mockResolvedValue("radar");

    const result = await analyzeVideoWithRetry(video, "u1", deps);

    expect(result).toEqual({ status: "skipped", reason: "quota_exceeded" });
    expect(deps.aiClient.complete).not.toHaveBeenCalled();
  });
});
