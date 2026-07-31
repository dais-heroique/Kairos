import { describe, expect, it } from "vitest";
import {
  checkCircuit,
  FAILURE_THRESHOLD,
  isPaused,
  PAUSE_MS,
  recordFailure,
  recordSuccess,
  type CircuitBreakerState,
  type CircuitBreakerStore,
} from "./circuit-breaker.js";

function createInMemoryStore(): CircuitBreakerStore & { states: Map<string, CircuitBreakerState> } {
  const states = new Map<string, CircuitBreakerState>();
  return {
    states,
    async read(source) {
      return states.get(source) ?? { consecutiveFailures: 0, pausedUntil: null };
    },
    async write(source, state) {
      states.set(source, state);
    },
  };
}

describe("circuit breaker", () => {
  it("stays closed under the failure threshold", async () => {
    const store = createInMemoryStore();

    for (let i = 0; i < FAILURE_THRESHOLD - 1; i++) {
      await recordFailure(store, "tiktok-web");
    }

    const { allowed, state } = await checkCircuit(store, "tiktok-web");
    expect(allowed).toBe(true);
    expect(state.consecutiveFailures).toBe(FAILURE_THRESHOLD - 1);
  });

  it("opens (pauses) after the threshold is reached", async () => {
    const store = createInMemoryStore();
    const now = new Date("2026-07-28T12:00:00.000Z");

    let state: CircuitBreakerState = { consecutiveFailures: 0, pausedUntil: null };
    for (let i = 0; i < FAILURE_THRESHOLD; i++) {
      state = await recordFailure(store, "tiktok-web", now);
    }

    expect(state.pausedUntil).toBe(new Date(now.getTime() + PAUSE_MS).toISOString());
    expect(isPaused(state, now)).toBe(true);

    const { allowed } = await checkCircuit(store, "tiktok-web", now);
    expect(allowed).toBe(false);
  });

  it("closes again once the pause window elapses", async () => {
    const store = createInMemoryStore();
    const now = new Date("2026-07-28T12:00:00.000Z");
    for (let i = 0; i < FAILURE_THRESHOLD; i++) {
      await recordFailure(store, "tiktok-web", now);
    }

    const afterPause = new Date(now.getTime() + PAUSE_MS + 1000);
    const { allowed } = await checkCircuit(store, "tiktok-web", afterPause);

    expect(allowed).toBe(true);
  });

  it("a success resets the failure counter", async () => {
    const store = createInMemoryStore();
    await recordFailure(store, "tiktok-api");
    await recordFailure(store, "tiktok-api");

    await recordSuccess(store, "tiktok-api");

    const { state } = await checkCircuit(store, "tiktok-api");
    expect(state.consecutiveFailures).toBe(0);
    expect(state.pausedUntil).toBeNull();
  });

  it("tracks sources independently", async () => {
    const store = createInMemoryStore();
    for (let i = 0; i < FAILURE_THRESHOLD; i++) {
      await recordFailure(store, "tiktok-web");
    }

    const { allowed: tiktokWebAllowed } = await checkCircuit(store, "tiktok-web");
    const { allowed: thirdpartyAllowed } = await checkCircuit(store, "thirdparty");

    expect(tiktokWebAllowed).toBe(false);
    expect(thirdpartyAllowed).toBe(true);
  });
});
