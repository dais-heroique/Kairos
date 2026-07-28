import { describe, expect, it } from "vitest";
import { computeBriefCacheKey } from "./brief";

describe("computeBriefCacheKey", () => {
  it("is deterministic for the same product/niche/followerRange", () => {
    const a = computeBriefCacheKey("p1", "beaute", "20k_100k");
    const b = computeBriefCacheKey("p1", "beaute", "20k_100k");
    expect(a).toBe(b);
  });

  it("is not keyed by user — same product/niche/followerRange always gives the same key", () => {
    // Pas de paramètre userId dans la signature elle-même : le test
    // documente/verrouille ce contrat plutôt que de le vérifier à
    // l'exécution.
    const key = computeBriefCacheKey("p1", "beaute", "20k_100k");
    expect(key).toBe("p1_beaute_20k_100k");
  });

  it("differs when the follower range differs", () => {
    const a = computeBriefCacheKey("p1", "beaute", "0_1k");
    const b = computeBriefCacheKey("p1", "beaute", "100k_plus");
    expect(a).not.toBe(b);
  });
});
