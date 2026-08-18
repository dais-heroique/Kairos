/**
 * SCRAPING INTELLIGENT MULTI-NICHE
 *
 * Découvre automatiquement les MEILLEURS produits TikTok Shop par niche.
 *
 * Usage:
 *   pnpm apify:intelligent              # Run complet
 *   pnpm apify:intelligent --dry-run    # Dry-run (pas d'écriture)
 *   pnpm apify:intelligent --verbose    # Logs détaillés
 */

import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createNoopBigQuery } from "./bigquery/client.js";
import { createApifyIntelligentSourceFromEnv, printScrapingStrategy } from "./datasource/apify-intelligent-source.js";
import { findServiceAccountKey, loadEnvLocal } from "./load-env.js";
import { runDailyPipeline } from "./pipeline.js";

loadEnvLocal();

interface IntelligentScrapingOptions {
  dryRun: boolean;
  verbose: boolean;
}

async function main(): Promise<void> {
  // Parser args
  const options: IntelligentScrapingOptions = {
    dryRun: process.argv.includes("--dry-run"),
    verbose: process.argv.includes("--verbose"),
  };

  // Afficher la stratégie
  printScrapingStrategy();

  // Vérifier le token
  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken) {
    console.error("[apify-intelligent] ❌ APIFY_API_TOKEN not configured");
    console.error("[apify-intelligent] Add it to .env.local: APIFY_API_TOKEN=apk_xxx");
    process.exitCode = 1;
    return;
  }
  console.log("[apify-intelligent] ✅ Apify token found");

  // Initialiser Firebase avec une clé et un projet explicites pour les
  // exécutions locales sur macOS.
  const keyPath = findServiceAccountKey();
  if (!keyPath) {
    console.error(
      "[apify-intelligent] ❌ Clé Firebase introuvable. Place-la dans ~/Downloads ou définis GOOGLE_APPLICATION_CREDENTIALS.",
    );
    process.exitCode = 1;
    return;
  }
  process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
  const projectId = process.env.GCP_PROJECT_ID?.trim() || "kairos-on";
  if (getApps().length === 0) {
    initializeApp({ projectId, credential: applicationDefault() });
  }
  console.log(`[apify-intelligent] ✅ Firebase project: ${projectId}`);
  const db = getFirestore();
  const bq = createNoopBigQuery();

  // Créer la source intelligente
  console.log("[apify-intelligent] 🚀 Starting intelligent discovery...\n");
  const source = createApifyIntelligentSourceFromEnv();

  if (options.dryRun) {
    console.log("[apify-intelligent] ⚠️  DRY-RUN mode (no database writes)");
  }

  const start = Date.now();
  try {
    // Lancer le pipeline avec la source intelligente
    const result = await runDailyPipeline(source, db, bq, { dryRun: options.dryRun });
    const totalMs = Date.now() - start;

    console.log("\n╔═══════════════════════════════════════════════════════════════╗");
    console.log("║                    ✅ DISCOVERY COMPLETE                      ║");
    console.log("╚═══════════════════════════════════════════════════════════════╝");
    console.log(`\n[apify-intelligent] Pipeline finished in ${totalMs}ms`);
    console.log(`[apify-intelligent] ${result.productCount} product(s) discovered`);
    console.log(`[apify-intelligent] ${result.rankingDocCount} ranking document(s) generated`);

    if (!options.dryRun) {
      console.log(`\n✨ Next step: Check https://kairos-on.web.app/classements/produits`);
    }

    if (totalMs > 20 * 60 * 1000) {
      console.warn(`[apify-intelligent] ⚠️  Pipeline exceeded 20min target (${Math.round(totalMs / 60000)}min)`);
    }
  } catch (err) {
    const totalMs = Date.now() - start;
    console.error(`[apify-intelligent] ❌ Error after ${totalMs}ms:`, err);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[apify-intelligent] Fatal error:", err);
  process.exitCode = 1;
});
