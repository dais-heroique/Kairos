import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getBigQueryClient } from "./bigquery/client.js";
import { BigQuerySnapshotSource } from "./datasource/bigquery-source.js";
import { runDailyPipeline } from "./pipeline.js";

// Point d'entrée du job quotidien : BigQuery → packages/core → verdicts
// dans Firestore → génération des 9 documents de classement + feeds.
// Déclenché par Cloud Scheduler → Pub/Sub → Cloud Run Jobs.
// `--dry-run` exécute lecture + calcul + classement sans rien écrire.
async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  if (getApps().length === 0) initializeApp();
  const db = getFirestore();
  const bq = getBigQueryClient();
  const source = new BigQuerySnapshotSource(bq);

  const start = Date.now();
  const result = await runDailyPipeline(source, db, bq, { dryRun });
  const totalMs = Date.now() - start;

  console.log(
    `[jobs] daily pipeline done in ${totalMs}ms — ${result.productCount} product(s), ${result.rankingDocCount} ranking doc(s)${dryRun ? " (dry-run)" : ""}`,
  );
  if (totalMs > 20 * 60 * 1000) {
    console.warn(`[jobs] pipeline exceeded the 20min target (${Math.round(totalMs / 60000)}min)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
