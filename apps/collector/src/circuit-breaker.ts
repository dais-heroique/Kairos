import type { Firestore } from "firebase-admin/firestore";

// 3 échecs consécutifs sur une source → pause 30 min + alerte (§ Lot 2).
// L'état vit dans Firestore (config/collectorCircuitBreaker), jamais en
// mémoire process : Cloud Run peut faire tourner plusieurs instances
// stateless en parallèle, un compteur local ne verrait pas les échecs des
// instances soeurs.
export const FAILURE_THRESHOLD = 3;
export const PAUSE_MS = 30 * 60 * 1000;

export interface CircuitBreakerState {
  consecutiveFailures: number;
  pausedUntil: string | null;
}

const DEFAULT_STATE: CircuitBreakerState = { consecutiveFailures: 0, pausedUntil: null };

export interface CircuitBreakerStore {
  read(source: string): Promise<CircuitBreakerState>;
  write(source: string, state: CircuitBreakerState): Promise<void>;
}

export function isPaused(state: CircuitBreakerState, now: Date = new Date()): boolean {
  return state.pausedUntil !== null && new Date(state.pausedUntil).getTime() > now.getTime();
}

export async function checkCircuit(
  store: CircuitBreakerStore,
  source: string,
  now: Date = new Date(),
): Promise<{ allowed: boolean; state: CircuitBreakerState }> {
  const state = await store.read(source);
  return { allowed: !isPaused(state, now), state };
}

export async function recordSuccess(store: CircuitBreakerStore, source: string): Promise<void> {
  await store.write(source, { consecutiveFailures: 0, pausedUntil: null });
}

export async function recordFailure(
  store: CircuitBreakerStore,
  source: string,
  now: Date = new Date(),
): Promise<CircuitBreakerState> {
  const current = await store.read(source);
  const consecutiveFailures = current.consecutiveFailures + 1;
  const shouldPause = consecutiveFailures >= FAILURE_THRESHOLD;

  const next: CircuitBreakerState = shouldPause
    ? { consecutiveFailures: 0, pausedUntil: new Date(now.getTime() + PAUSE_MS).toISOString() }
    : { consecutiveFailures, pausedUntil: current.pausedUntil };

  await store.write(source, next);

  if (shouldPause) {
    // Alerte best-effort : un vrai canal (Sentry/Slack) se branche ici une
    // fois SENTRY_DSN configuré — voir .env.example.
    console.error(
      `[circuit-breaker] source "${source}" paused for 30min after ${FAILURE_THRESHOLD} consecutive failures`,
    );
  }

  return next;
}

export function createFirestoreCircuitBreakerStore(db: Firestore): CircuitBreakerStore {
  const docRef = db.collection("config").doc("collectorCircuitBreaker");
  return {
    async read(source) {
      const snap = await docRef.get();
      const data = snap.data();
      const state = data?.[source] as CircuitBreakerState | undefined;
      return state ?? DEFAULT_STATE;
    },
    async write(source, state) {
      await docRef.set({ [source]: state }, { merge: true });
    },
  };
}
