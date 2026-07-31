import { describe, expect, it } from "vitest";
import type { ProductVideo } from "@kairos/shared";
import { isEligibleForAnalysis, selectTopVideos } from "./selection.js";

describe("isEligibleForAnalysis", () => {
  it("accepts an emergence-phase product with enough creators and commission", () => {
    expect(
      isEligibleForAnalysis({ phase: "emergence", activeCreatorCount: 5, commissionRatePct: 8 }),
    ).toBe(true);
  });

  it("accepts a growth-phase product too", () => {
    expect(
      isEligibleForAnalysis({ phase: "growth", activeCreatorCount: 10, commissionRatePct: 15 }),
    ).toBe(true);
  });

  it("rejects maturity/decline/late_growth phases regardless of other criteria", () => {
    for (const phase of ["late_growth", "maturity", "decline"] as const) {
      expect(isEligibleForAnalysis({ phase, activeCreatorCount: 100, commissionRatePct: 50 })).toBe(
        false,
      );
    }
  });

  it("rejects too few active creators", () => {
    expect(
      isEligibleForAnalysis({ phase: "growth", activeCreatorCount: 4, commissionRatePct: 20 }),
    ).toBe(false);
  });

  it("rejects too low a commission", () => {
    expect(
      isEligibleForAnalysis({ phase: "growth", activeCreatorCount: 20, commissionRatePct: 7.9 }),
    ).toBe(false);
  });
});

function makeVideo(id: string, gmvPer1kViews: number, views = 10000): ProductVideo {
  return {
    id,
    creatorId: "c1",
    url: `https://example.com/${id}`,
    postedAt: new Date().toISOString(),
    views,
    likes: 100,
    comments: 10,
    shares: 5,
    gmvPer1kViews,
  };
}

describe("selectTopVideos", () => {
  it("sorts by gmvPer1kViews descending, never by raw views", () => {
    const videos = [
      makeVideo("low-gmv-high-views", 1, 1_000_000),
      makeVideo("high-gmv-low-views", 50, 100),
    ];

    const selected = selectTopVideos(videos);

    expect(selected[0]!.id).toBe("high-gmv-low-views");
  });

  it("caps at 12 videos", () => {
    const videos = Array.from({ length: 30 }, (_, i) => makeVideo(`v${i}`, i));
    expect(selectTopVideos(videos).length).toBe(12);
  });
});
