import { describe, expect, it } from "vitest";
import { buildReferralUrl, buildShareCaptions, generateReferralQrCode } from "./share-kit";

describe("buildReferralUrl", () => {
  it("builds a referral URL from a code", () => {
    expect(buildReferralUrl("ABC12345")).toBe("https://kairos.app/r/ABC12345");
  });

  it("respects a custom base URL", () => {
    expect(buildReferralUrl("ABC12345", "https://staging.example.com")).toBe(
      "https://staging.example.com/r/ABC12345",
    );
  });
});

describe("generateReferralQrCode", () => {
  it("generates a PNG data URL, offline, no network dependency", async () => {
    const dataUrl = await generateReferralQrCode("ABC12345");
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });
});

describe("buildShareCaptions", () => {
  it("returns exactly 3 captions, each mentioning the referral link or code", () => {
    const captions = buildShareCaptions("ABC12345");
    expect(captions).toHaveLength(3);
    for (const caption of captions) {
      expect(caption.includes("ABC12345") || caption.includes("/r/ABC12345")).toBe(true);
    }
  });
});
