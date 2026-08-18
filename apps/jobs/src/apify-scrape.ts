/**
 * SCRIPT DE SCRAPING APIFY
 *
 * Lance le scraping TikTok Shop via Apify et écrit les snapshots dans Firestore
 * Usage:
 *   pnpm apify:scrape                    # Scrape et écrit tout
 *   pnpm apify:scrape --dry-run          # Dry-run (pas d'écriture)
 *   pnpm apify:scrape --single product-id # Un seul produit
 */

import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createNoopBigQuery } from "./bigquery/client.js";
import { ApifySnapshotSource } from "./datasource/apify-source.js";
import { findServiceAccountKey, loadEnvLocal } from "./load-env.js";
import { runDailyPipeline } from "./pipeline.js";
import { getProductsToTrack } from "./datasource/products.config.js";

loadEnvLocal();

interface ScrapingOptions {
  dryRun: boolean;
  singleProduct?: string | undefined;
}

async function main(): Promise<void> {
  // Parser les arguments
  const singleProduct = process.argv.find((arg) => arg.startsWith("--single="))?.split("=")[1];
  const options: ScrapingOptions = {
    dryRun: process.argv.includes("--dry-run"),
    ...(singleProduct && { singleProduct }),
  };

  // Vérifier la config
  const products = getProductsToTrack();
  if (products.length === 0) {
    console.error("[apify-scrape] ❌ Aucun produit configuré dans products.config.ts");
    console.error("[apify-scrape] Ajoute tes produits et relance.");
    process.exitCode = 1;
    return;
  }

  console.log(`[apify-scrape] 📦 ${products.length} produit(s) à scraper`);
  products.forEach((p) => {
    console.log(`  - ${p.id}: "${p.name}" (queries: ${p.queries.join(", ")})`);
  });

  // Vérifier le token Apify
  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken) {
    console.error("[apify-scrape] ❌ APIFY_API_TOKEN non configuré");
    console.error("[apify-scrape] Ajoute-le à .env.local: APIFY_API_TOKEN=apk_xxx");
    process.exitCode = 1;
    return;
  }
  console.log(`[apify-scrape] ✅ Token Apify trouvé`);

  // Initialiser Firebase avec la même configuration que les commandes admin.
  // `initializeApp()` seul ne trouve pas le project ID depuis un Mac local.
  const keyPath = findServiceAccountKey();
  if (!keyPath) {
    console.error(
      "[apify-scrape] ❌ Clé Firebase introuvable. Télécharge une clé de compte de service depuis la Console Firebase et place-la dans ~/Downloads, ou définis GOOGLE_APPLICATION_CREDENTIALS.",
    );
    process.exitCode = 1;
    return;
  }
  process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
  const projectId = process.env.GCP_PROJECT_ID?.trim() || "kairos-on";
  if (getApps().length === 0) {
    initializeApp({ projectId, credential: applicationDefault() });
  }
  console.log(`[apify-scrape] ✅ Projet Firebase : ${projectId}`);
  const db = getFirestore();
  // BigQuery ne sert qu'au journal d'audit ; il ne doit pas bloquer
  // l'écriture Firestore qui alimente le dashboard.
  const bq = createNoopBigQuery();

  // Créer la source Apify
  const source = new ApifySnapshotSource(apiToken);

  console.log(`[apify-scrape] 🚀 Lancement du pipeline...`);
  if (options.dryRun) {
    console.log(`[apify-scrape] ⚠️  Mode DRY-RUN (pas d'écriture)`);
  }

  const start = Date.now();
  try {
    const result = await runDailyPipeline(source, db, bq, { dryRun: options.dryRun });
    const totalMs = Date.now() - start;

    console.log(
      `[apify-scrape] ✅ Pipeline terminé en ${totalMs}ms — ${result.productCount} produit(s), ${result.rankingDocCount} doc(s) de classement${options.dryRun ? " (dry-run)" : ""}`,
    );

    if (totalMs > 20 * 60 * 1000) {
      console.warn(`[apify-scrape] ⚠️  Pipeline dépasse les 20min (${Math.round(totalMs / 60000)}min)`);
    }
  } catch (err) {
    const totalMs = Date.now() - start;
    console.error(`[apify-scrape] ❌ Erreur après ${totalMs}ms:`, err);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[apify-scrape] Erreur fatale:", err);
  process.exitCode = 1;
});
