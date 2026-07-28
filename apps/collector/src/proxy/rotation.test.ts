import { describe, expect, it } from "vitest";
import {
  computeJitterMs,
  createProxyRotator,
  loadProxyConfigFromEnv,
  randomUserAgent,
  REALISTIC_USER_AGENTS,
  type ProxyConfig,
} from "./rotation.js";

describe("loadProxyConfigFromEnv", () => {
  it("parses a comma-separated PROXY_LIST_URL", () => {
    const config = loadProxyConfigFromEnv({
      PROXY_LIST_URL: "http://proxy1:8080, http://proxy2:8080 ,http://proxy3:8080",
      PROXY_USERNAME: "user",
      PROXY_PASSWORD: "pass",
    } as NodeJS.ProcessEnv);

    expect(config.urls).toEqual(["http://proxy1:8080", "http://proxy2:8080", "http://proxy3:8080"]);
    expect(config.username).toBe("user");
  });

  it("returns an empty pool when unset", () => {
    const config = loadProxyConfigFromEnv({} as NodeJS.ProcessEnv);
    expect(config.urls).toEqual([]);
  });
});

describe("createProxyRotator", () => {
  it("round-robins through the pool deterministically", () => {
    const config: ProxyConfig = { urls: ["a", "b", "c"] };
    const next = createProxyRotator(config);

    expect([next(), next(), next(), next()]).toEqual(["a", "b", "c", "a"]);
  });

  it("returns undefined when the pool is empty (no proxy configured)", () => {
    const next = createProxyRotator({ urls: [] });
    expect(next()).toBeUndefined();
  });
});

describe("randomUserAgent", () => {
  it("always returns one of the known realistic user agents", () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(REALISTIC_USER_AGENTS).toContain(randomUserAgent(() => r));
    }
  });
});

describe("computeJitterMs", () => {
  it("stays within [min, max]", () => {
    expect(computeJitterMs(500, 2500, () => 0)).toBe(500);
    expect(computeJitterMs(500, 2500, () => 1)).toBe(2500);
    expect(computeJitterMs(500, 2500, () => 0.5)).toBe(1500);
  });
});
