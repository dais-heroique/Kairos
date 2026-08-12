"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import {
  listStoredProducts,
  saveProductWithSnapshot,
  type StoredProduct,
} from "@/lib/firestore/product-entry";
import { runPipeline, type PipelineResult } from "@/lib/pipeline/run-pipeline";

// Saisie manuelle depuis l'espace affilié TikTok Shop de l'utilisateur —
// seule source à 0 € légale pour le marché FR (API Affiliate fermée à
// l'UE, scraping contraire aux CGU). Voir lib/firestore/product-entry.ts.

const CATEGORIES = [
  "Beauté & soins",
  "Maison & électroménager",
  "Mode & sous-vêtements",
  "Téléphonie & électronique",
  "Sport & plein air",
  "Alimentation & boissons",
  "Bébé & enfant",
  "Animalerie",
] as const;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const EMPTY_FORM = {
  title: "",
  priceEur: "",
  commissionRatePct: "",
  shopName: "",
  category: CATEGORIES[0] as string,
  shopTrustScore: "70",
  emoji: "",
  reviewCount: "",
  ratingAvg: "",
  activeCreatorCount: "",
  videoCount: "",
  competingShopCount: "",
  salesMin: "",
  salesMax: "",
};

export default function AdminProduitsPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [products, setProducts] = useState<StoredProduct[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);

  async function refresh() {
    try {
      setProducts(await listStoredProducts());
    } catch {
      setError("Impossible de charger les produits.");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function update(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.shopName.trim()) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const id = slugify(form.title);
      await saveProductWithSnapshot(
        {
          id,
          title: form.title.trim(),
          priceCents: Math.round(Number(form.priceEur) * 100) || 0,
          commissionRatePct: Number(form.commissionRatePct) || 0,
          shopId: slugify(form.shopName),
          shopName: form.shopName.trim(),
          category: form.category,
          shopTrustScore: Number(form.shopTrustScore) || 50,
          ...(form.emoji.trim() ? { emoji: form.emoji.trim() } : {}),
        },
        {
          reviewCount: Number(form.reviewCount) || 0,
          ratingAvg: Number(form.ratingAvg) || 0,
          activeCreatorCount: Number(form.activeCreatorCount) || 0,
          videoCount: Number(form.videoCount) || 0,
          competingShopCount: Number(form.competingShopCount) || 0,
          estSalesLow: Number(form.salesMin) || 0,
          estSalesHigh: Number(form.salesMax) || 0,
        },
      );
      setMessage(`« ${form.title.trim()} » enregistré avec le relevé du jour.`);
      setForm(EMPTY_FORM);
      await refresh();
    } catch {
      setError("Échec de l'enregistrement. Vérifie que tu es bien admin.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRunPipeline() {
    setRunning(true);
    setError(null);
    setMessage(null);
    setPipelineResult(null);
    try {
      setPipelineResult(await runPipeline());
    } catch {
      setError("Le pipeline a échoué.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col gap-8 px-5 py-8 sm:max-w-2xl">
      <div>
        <Link
          href="/admin"
          className="text-sm font-medium underline"
          style={{ color: "var(--color-coral)" }}
        >
          ← Tableau de bord
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold">
          Produits
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          Relève les chiffres dans ton espace affilié TikTok Shop et saisis-les
          ici. Un relevé par produit par jour — au bout de 3 jours, les verdicts
          deviennent fiables.
        </p>
      </div>

      {error && (
        <p className="text-sm font-medium" style={{ color: "var(--color-coral)" }}>
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm font-medium" style={{ color: "var(--color-success)" }}>
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="kai-card flex flex-col gap-3">
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          Ajouter / mettre à jour un produit
        </h2>

        <label className="flex flex-col gap-1 text-sm">
          Nom du produit
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="ex. Sérum vitamine C éclat"
            className="kai-input"
            required
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Prix (€)
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.priceEur}
              onChange={(e) => update("priceEur", e.target.value)}
              className="kai-input"
              required
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Commission (%)
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.commissionRatePct}
              onChange={(e) => update("commissionRatePct", e.target.value)}
              className="kai-input"
              required
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Boutique
          <input
            value={form.shopName}
            onChange={(e) => update("shopName", e.target.value)}
            placeholder="ex. GlowLab Paris"
            className="kai-input"
            required
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Catégorie
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="kai-select"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Score boutique (0-100)
            <input
              type="number"
              min="0"
              max="100"
              value={form.shopTrustScore}
              onChange={(e) => update("shopTrustScore", e.target.value)}
              className="kai-input"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:w-24">
            Emoji
            <input
              value={form.emoji}
              onChange={(e) => update("emoji", e.target.value)}
              placeholder="🧴"
              className="kai-input"
            />
          </label>
        </div>

        <p className="mt-2 text-xs font-semibold tracking-wide text-[color:var(--color-ink-muted)] uppercase">
          Relevé du jour
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Nb d&apos;avis
            <input
              type="number"
              min="0"
              value={form.reviewCount}
              onChange={(e) => update("reviewCount", e.target.value)}
              className="kai-input"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Note (0-5)
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.ratingAvg}
              onChange={(e) => update("ratingAvg", e.target.value)}
              className="kai-input"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Créateurs actifs
            <input
              type="number"
              min="0"
              value={form.activeCreatorCount}
              onChange={(e) => update("activeCreatorCount", e.target.value)}
              className="kai-input"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Nb de vidéos
            <input
              type="number"
              min="0"
              value={form.videoCount}
              onChange={(e) => update("videoCount", e.target.value)}
              className="kai-input"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Boutiques concurrentes
            <input
              type="number"
              min="0"
              value={form.competingShopCount}
              onChange={(e) => update("competingShopCount", e.target.value)}
              className="kai-input"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Ventes est. min
            <input
              type="number"
              min="0"
              value={form.salesMin}
              onChange={(e) => update("salesMin", e.target.value)}
              className="kai-input"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Ventes est. max
            <input
              type="number"
              min="0"
              value={form.salesMax}
              onChange={(e) => update("salesMax", e.target.value)}
              className="kai-input"
            />
          </label>
        </div>

        <button type="submit" disabled={saving} className="kai-btn-primary mt-2">
          {saving ? "Enregistrement…" : "Enregistrer le relevé du jour"}
        </button>
      </form>

      <section className="kai-card flex flex-col gap-2">
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          Recalculer les classements
        </h2>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Fait tourner les vrais moteurs (verdict, saturation, opportunité) sur
          tout l&apos;historique saisi, puis réécrit les classements.
        </p>
        <button
          type="button"
          onClick={handleRunPipeline}
          disabled={running}
          className="kai-btn-outline mt-2"
        >
          {running ? "Calcul en cours…" : "Lancer le pipeline"}
        </button>
        {pipelineResult && (
          <div className="mt-1 flex flex-col gap-1 text-sm">
            <p style={{ color: "var(--color-success)" }}>
              {pipelineResult.productsRanked} produit(s) classé(s) sur{" "}
              {pipelineResult.productsProcessed}.
            </p>
            {pipelineResult.productsNeedingMoreHistory > 0 && (
              <p className="text-[color:var(--color-ink-muted)]">
                {pipelineResult.productsNeedingMoreHistory} produit(s) ont encore
                un verdict prudent — il leur faut au moins 3 jours de relevés.
              </p>
            )}
            {pipelineResult.productsSkippedNoHistory > 0 && (
              <p className="text-[color:var(--color-ink-muted)]">
                {pipelineResult.productsSkippedNoHistory} produit(s) sans aucun
                relevé, exclus des classements.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          Produits suivis{" "}
          {products && (
            <span className="text-sm font-normal text-[color:var(--color-ink-muted)]">
              ({products.length})
            </span>
          )}
        </h2>
        {products?.length === 0 && (
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            Aucun produit pour l&apos;instant.
          </p>
        )}
        {products?.map((p) => (
          <div key={p.id} className="kai-card flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {p.emoji ? `${p.emoji} ` : ""}
                {p.title}
              </p>
              <p className="text-xs text-[color:var(--color-ink-muted)]">
                {p.shopName} · {(p.priceCents / 100).toFixed(2)}€ ·{" "}
                {/* La collecte Apify ne renvoie pas les taux d'affiliation
                    (recover-apify-data.ts). Ils se saisissent ici, produit
                    par produit — donc cette table est le seul endroit d'où
                    l'on voit ce qui reste à faire. « 0 % » le noyait dans
                    les taux réels ; le signaler en corail le sort du lot. */}
                {p.commissionRatePct > 0 ? (
                  `${p.commissionRatePct} %`
                ) : (
                  <span style={{ color: "var(--color-coral)", fontWeight: 600 }}>
                    commission à saisir
                  </span>
                )}
              </p>
            </div>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold"
              style={{
                backgroundColor:
                  p.snapshotCount >= 3
                    ? "var(--color-success-soft)"
                    : "var(--color-warning-soft)",
                color:
                  p.snapshotCount >= 3
                    ? "var(--color-success)"
                    : "var(--color-warning)",
              }}
            >
              {p.snapshotCount}j
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
