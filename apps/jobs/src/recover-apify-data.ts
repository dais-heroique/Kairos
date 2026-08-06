/**
 * Récupère les produits de runs Apify DÉJÀ PAYÉS et les écrit en production.
 *
 * listItems() relit le dataset d'un run terminé — il ne relance pas l'actor
 * et ne coûte donc rien de plus. Les runs ci-dessous ont déjà été facturés.
 *
 * Prérequis :
 *   - APIFY_API_TOKEN
 *   - GOOGLE_APPLICATION_CREDENTIALS (clé de compte de service Firebase) —
 *     l'Admin SDK ignore les règles de sécurité, rien à assouplir.
 *
 * Usage :
 *   APIFY_API_TOKEN=... GOOGLE_APPLICATION_CREDENTIALS=~/cle.json \
 *     pnpm recover:apify
 */

import type { BigQuery } from "@google-cloud/bigquery";
import { ApifyClient } from "apify-client";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { ProductSnapshot } from "@kairos/shared";
import { NEUTRAL_COMMISSION, NEUTRAL_SELLER_TRUST } from "./compute.js";
import {
  parseApifyProduct,
  type ApifyProductMeta,
  type ApifyRawProduct,
} from "./datasource/apify-product.js";
import { FixtureSnapshotSource } from "./datasource/fixture-source.js";
import { findServiceAccountKey, loadEnvLocal } from "./load-env.js";
import { runDailyPipeline } from "./pipeline.js";

// Avant toute lecture de process.env.
loadEnvLocal();

// Runs déjà exécutés et facturés le 2026-08-02 (~0,48 €).
const PAID_RUNS = [
  { runId: "L2YTpwgx664k4nhW5", label: "ergonomic chair" },
  { runId: "GeGXBoaaCX2ewxHht", label: "wireless headphones" },
  { runId: "BEHvPetAoXMrjYBGp", label: "desk lamp" },
];

// L'actor renvoie des prix en USD (searchRegion: US, marché unique
// supporté), alors que productSchema impose currency: "EUR". Conversion à
// taux fixe faute de source de change branchée — approximation assumée et
// signalée, à remplacer par un vrai taux si le prix devient un chiffre sur
// lequel l'utilisateur décide.
const USD_TO_EUR = 0.92;


// BigQuery ne sert qu'à verdict_history (journal d'audit, idempotency.ts).
// Aucun écran du site n'en dépend et aucun projet GCP n'est branché
// (docs/STATE.md) : double inerte plutôt qu'un échec du pipeline.
function createNoopBigQuery(): BigQuery {
  return {
    query: async () => {
      console.log("  BigQuery non configuré — verdict_history ignoré (non bloquant)");
      return [[]];
    },
    dataset: () => ({ table: () => ({ insert: async () => undefined }) }),
  } as unknown as BigQuery;
}

async function main(): Promise<void> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) {
    console.error("❌ APIFY_API_TOKEN introuvable.");
    console.error("   Attendu dans apps/jobs/.env.local, ou passé en ligne de commande.\n");
    process.exitCode = 1;
    return;
  }

  const useEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const keyPath = findServiceAccountKey();

  if (!keyPath && !useEmulator) {
    console.error("❌ Clé de compte de service Firebase introuvable.\n");
    console.error("   Cherchée dans : ~/Downloads, ~, et la racine du projet");
    console.error("   (fichier .json contenant « firebase-adminsdk » ou « service-account »).\n");
    console.error("   Console Firebase > Paramètres du projet > Comptes de service");
    console.error("   > « Générer une nouvelle clé privée »\n");
    console.error("   Si le fichier est ailleurs, indique-le explicitement :");
    console.error("     GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/cle.json pnpm recover:apify\n");
    process.exitCode = 1;
    return;
  }
  if (keyPath) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
    console.log(`Clé de service : ${keyPath}`);
  }

  const target = useEmulator
    ? `émulateur (${process.env.FIRESTORE_EMULATOR_HOST})`
    : "PRODUCTION (kairos-on)";
  console.log(`Cible          : ${target}\n`);

  const client = new ApifyClient({ token: apifyToken });

  // ---- 1. Relecture des datasets déjà payés -------------------------------
  const rawProducts: ApifyRawProduct[] = [];
  for (const { runId, label } of PAID_RUNS) {
    try {
      const run = await client.run(runId).get();
      if (!run?.defaultDatasetId) {
        console.warn(`⚠️  ${label} (${runId}) : dataset introuvable, ignoré`);
        continue;
      }
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      console.log(`✓ ${label} : ${items.length} produit(s) relus (run déjà facturé)`);
      rawProducts.push(...(items as ApifyRawProduct[]));
    } catch (err) {
      console.warn(`⚠️  ${label} (${runId}) : ${err instanceof Error ? err.message : err}`);
    }
  }

  if (rawProducts.length === 0) {
    console.error("\n❌ Aucun produit récupéré — les datasets ont peut-être expiré.");
    process.exitCode = 1;
    return;
  }

  // ---- 2. Conversion, filtrage et déduplication ----------------------------
  const today = new Date().toISOString().slice(0, 10);
  const parsed = new Map<string, { snapshot: ProductSnapshot; meta: ApifyProductMeta }>();
  let skipped = 0;

  for (const raw of rawProducts) {
    const result = parseApifyProduct(raw, { capturedDate: today, usdToEur: USD_TO_EUR });
    // Le plan gratuit d'Apify masque une partie des champs ("limited to
    // preview results") : sans identifiant, titre ou prix, le produit ne
    // peut alimenter ni le classement ni le simulateur — on l'écarte plutôt
    // que d'inventer une valeur.
    if (!result) {
      skipped++;
      continue;
    }
    if (!parsed.has(result.meta.externalId)) parsed.set(result.meta.externalId, result);
  }

  console.log(
    `\n${parsed.size} produit(s) unique(s) retenu(s) sur ${rawProducts.length}` +
      ` — ${skipped} incomplet(s), ${rawProducts.length - skipped - parsed.size} doublon(s)`,
  );

  if (parsed.size === 0) {
    console.error("❌ Rien d'exploitable après filtrage.");
    process.exitCode = 1;
    return;
  }

  // ---- 3. Écriture Firestore ----------------------------------------------
  if (getApps().length === 0) {
    initializeApp({
      projectId: process.env.GCP_PROJECT_ID ?? "kairos-on",
      ...(process.env.GOOGLE_APPLICATION_CREDENTIALS ? { credential: applicationDefault() } : {}),
    });
  }
  const db = getFirestore();

  const fixtureData: Record<string, ProductSnapshot[]> = {};
  const shopNames = new Map<string, string>();
  let batch = db.batch();
  let pending = 0;

  // firstSeenAt ne doit être posé qu'à la toute première insertion : c'est
  // lui qui distingue une nouveauté d'un produit déjà connu (classement
  // "Nouveautés"). Le réécrire à chaque passage rendrait tous les produits
  // éternellement neufs. Une seule RPC groupée plutôt qu'un get() par
  // produit.
  const ids = [...parsed.values()].map((p) => p.snapshot.productId);
  const existingSnaps = await db.getAll(
    ...ids.map((id) => db.collection("products").doc(id)),
  );
  const knownFirstSeen = new Map<string, string>();
  // Les taux de commission ne peuvent venir que d'une saisie manuelle : la
  // source produit ne les expose pas (voir docs/APIFY.md). Les réécrire à
  // NEUTRAL_COMMISSION à chaque passage effacerait le travail de saisie —
  // on ne pose donc la valeur neutre que sur les produits qui n'en ont pas.
  const knownCommission = new Map<string, unknown>();
  existingSnaps.forEach((snap, i) => {
    const data = snap.data();
    const existing = data?.firstSeenAt as string | undefined;
    if (existing) knownFirstSeen.set(ids[i]!, existing);
    const commission = data?.commission as { ratePct?: number } | undefined;
    if (commission && typeof commission.ratePct === "number" && commission.ratePct > 0) {
      knownCommission.set(ids[i]!, commission);
    }
  });
  const nowIso = new Date().toISOString();
  const newCount = ids.length - knownFirstSeen.size;
  console.log(
    `${newCount} produit(s) jamais vu(s) auparavant, ${knownFirstSeen.size} déjà connu(s)\n`,
  );

  for (const { snapshot, meta } of parsed.values()) {
    fixtureData[snapshot.productId] = [snapshot];
    if (meta.shopId && meta.shopName) shopNames.set(meta.shopId, meta.shopName);

    batch.set(
      db.collection("products").doc(snapshot.productId),
      {
        title: meta.title,
        externalId: meta.externalId,
        priceCents: meta.priceCents,
        shopId: meta.shopId,
        shopName: meta.shopName,
        sourceQuery: meta.sourceQuery,
        imageUrl: meta.imageUrl,
        productUrl: meta.productUrl,
        soldTotal: meta.sold,
        // ⚠️ L'actor ne renvoie PAS de taux de commission (discountDecimal
        // est une remise acheteur, pas une rémunération affilié). Laisser la
        // commission à 0 fait sortir un gain neutre ; la renseigner depuis la
        // remise produirait un montant en euros faux, ce que le produit
        // s'interdit explicitement. Un taux déjà saisi à la main est
        // préservé — sans quoi chaque collecte l'effacerait.
        commission: knownCommission.get(snapshot.productId) ?? NEUTRAL_COMMISSION,
        sellerTrust: NEUTRAL_SELLER_TRUST,
        firstSeenAt: knownFirstSeen.get(snapshot.productId) ?? nowIso,
        lastSeenAt: nowIso,
        updatedAt: new Date(),
      },
      { merge: true },
    );
    batch.set(
      db.collection("products").doc(snapshot.productId).collection("snapshots").doc(today),
      snapshot,
    );

    pending += 2;
    if (pending >= 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  // Les lignes de classement affichent un nom de boutique lu depuis shops/*
  // (resolveShopNames côté web) — sans ces documents, chaque ligne afficherait
  // « Boutique ».
  for (const [shopId, name] of shopNames) {
    batch.set(db.collection("shops").doc(shopId), { name }, { merge: true });
    pending++;
    if (pending >= 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending > 0) await batch.commit();

  console.log(
    `${parsed.size} fiche(s) + ${parsed.size} relevé(s) + ${shopNames.size} boutique(s) écrit(s)\n`,
  );

  // ---- 4. Pipeline ---------------------------------------------------------
  console.log("Pipeline…");
  const result = await runDailyPipeline(
    new FixtureSnapshotSource(fixtureData),
    db,
    createNoopBigQuery(),
    { dryRun: false, today },
  );

  console.log(`\n✅ ${result.productCount} produit(s), ${result.rankingDocCount} document(s) de classement`);
  console.log("→ https://kairos-on.web.app/classements/produits\n");
  console.log("ℹ️  Verdicts attendus : « Historique trop court » sur tous les produits.");
  console.log("   computeVerdict exige 3 relevés (minSnapshotsAbsolute) et il n'y en a");
  console.log("   qu'un seul jour de réel. Relance ce type de collecte 2 jours de plus");
  console.log("   pour obtenir de vrais verdicts — aucun historique n'est fabriqué ici.\n");
}

main().catch((err: unknown) => {
  console.error("\n❌ Échec :", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
