import type { BigQuery } from "@google-cloud/bigquery";
import type { CollectorSource } from "../sources/types.js";
import {
  checkCircuit,
  recordFailure,
  recordSuccess,
  type CircuitBreakerStore,
} from "../circuit-breaker.js";
import { writeProductSnapshots } from "../bigquery/writers.js";

// Endpoint appelé par Cloud Tasks (file + backoff exponentiel géré côté
// Cloud Tasks, max 5 tentatives configuré sur la queue elle-même — pas
// ici). Respecte le contrat de sources/types.ts : la source ne fait que
// produire un ProductSnapshot, c'est ce handler qui écrit BigQuery.

export interface CollectTaskPayload {
  source: string;
  productExternalId: string;
}

export interface TaskHandlerDeps {
  sources: Record<string, CollectorSource>;
  circuitStore: CircuitBreakerStore;
  bq: BigQuery;
}

export type TaskResult =
  | { status: "written" }
  | { status: "skipped_circuit_open" }
  | { status: "unknown_source" }
  | { status: "error"; error: string };

export async function handleCollectTask(
  payload: CollectTaskPayload,
  deps: TaskHandlerDeps,
): Promise<TaskResult> {
  const source = deps.sources[payload.source];
  if (!source) {
    return { status: "unknown_source" };
  }

  const { allowed } = await checkCircuit(deps.circuitStore, payload.source);
  if (!allowed) {
    return { status: "skipped_circuit_open" };
  }

  try {
    const snapshot = await source.fetchProductSnapshot(payload.productExternalId);
    await writeProductSnapshots([snapshot], deps.bq);
    await recordSuccess(deps.circuitStore, payload.source);
    return { status: "written" };
  } catch (err) {
    await recordFailure(deps.circuitStore, payload.source);
    return { status: "error", error: err instanceof Error ? err.message : String(err) };
  }
}
