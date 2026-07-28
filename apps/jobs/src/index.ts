// Point d'entrée du job quotidien (Phase 4) : BigQuery → packages/core →
// verdicts dans Firestore → génération des 9 documents de classement + feeds.
// Déclenché par Cloud Scheduler → Pub/Sub → Cloud Run Jobs.
async function main() {
  console.log("daily job: not implemented — Phase 4");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
