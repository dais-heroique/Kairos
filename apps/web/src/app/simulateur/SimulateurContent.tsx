"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { computeEarnings, DEFAULT_EARNINGS_CONFIG } from "@kairos/core";
import { BottomNav } from "@/components/BottomNav";
import { EstimatedValue } from "@/components/EstimatedValue";
import { useAuth } from "@/lib/firebase/auth-context";
import { commissionLabel, shortTitle } from "@/lib/format/product";
import { getRankingPageData } from "@/server/firestore/rankings";
import type { ProductRankItem } from "@/types/product-rank-item";

// Position de départ du curseur, exprimée en pourcentage (le curseur, lui,
// reste librement réglable). Alignée sur DEFAULT_EARNINGS_CONFIG pour que
// le simulateur et les classements ne racontent pas deux histoires
// différentes du même produit — c'était le cas avec 1,5 % en dur ici.
const DEFAULT_CONVERSION_PCT = DEFAULT_EARNINGS_CONFIG.defaultConversionRate * 100;

export function SimulateurContent() {
  const { userDoc } = useAuth();
  // « Simuler » depuis une fiche produit ou le tableau de bord doit ouvrir
  // le simulateur *sur ce produit*, pas sur le premier de la liste.
  const preselectedId = useSearchParams().get("id");
  const [products, setProducts] = useState<ProductRankItem[] | null>(null);
  const [productId, setProductId] = useState("");
  // Le curseur est une hypothèse explicite de l'utilisateur, pas une portée
  // récupérée depuis son profil. Une valeur neutre évite une fausse précision.
  const [views, setViews] = useState(10000);
  const [conversionPct, setConversionPct] = useState(DEFAULT_CONVERSION_PCT);

  useEffect(() => {
    getRankingPageData("products", "FR", "7d").then((data) => {
      setProducts(data.items);
      setProductId(
        (current) => current || preselectedId || (data.items[0]?.id ?? ""),
      );
    });
  }, [preselectedId]);

  const product = useMemo(
    () => products?.find((p) => p.id === productId) ?? products?.[0],
    [productId, products],
  );

  // Vrai moteur (packages/core, Lot 1) — plus de formule de démonstration
  // en dur. Toujours une fourchette + confiance, jamais un nombre nu.
  const earnings = useMemo(() => {
    if (!product) return null;
    return computeEarnings({
      expectedViews: views,
      followerRange: userDoc?.profile.followerRange ?? "1k_5k",
      niche: userDoc?.profile.niches[0] ?? "",
      medianConversionRate: conversionPct / 100,
      priceCents: product.priceCents,
      commissionRatePct: product.commissionRatePct,
      commissionIsEstimated: product.commissionIsEstimated ?? false,
      estimatedReturnRatePct: DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct,
    });
  }, [views, conversionPct, product, userDoc]);

  if (products === null) {
    return (
      <div className="flex min-h-dvh flex-col">
        <BottomNav />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 kai-shell text-center">
          <p className="text-sm text-[color:var(--color-ink-muted)]">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-dvh flex-col">
        <BottomNav />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 kai-shell text-center">
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            Pas encore de produits à simuler — reviens une fois le classement
            alimenté par la collecte réelle.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <BottomNav />

      <header className="kai-shell pt-6 pb-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          Simulateur de gains
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          Bouge les curseurs — le montant réagit en direct.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-6 kai-shell py-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Produit
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="kai-select"
          >
            {products.map((p) => (
              // Le titre est raccourci **dans la valeur affichée**, pas
              // seulement par CSS : le menu déroulant natif d'iOS et
              // d'Android ignore `text-overflow`, et un titre TikTok Shop
              // complet y occupe trois lignes.
              <option key={p.id} value={p.id}>
                {(p.priceCents / 100).toFixed(2)} € · {shortTitle(p.title, 34)}
              </option>
            ))}
          </select>
          {/* Le titre entier reste lisible ici, sous le sélecteur : le
              raccourcir ne doit pas revenir à le cacher. */}
          <span className="text-xs text-[color:var(--color-ink-muted)]">{product.title}</span>
        </label>

        <div className="kai-card flex flex-col items-center gap-1 py-8">
          <p className="text-xs font-semibold tracking-wide text-[color:var(--color-ink-muted)] uppercase">
            Gains estimés
          </p>
          {earnings && (
            <p
              className="font-[family-name:var(--font-mono)] text-3xl font-bold"
              style={{ color: "var(--color-success)" }}
            >
              <EstimatedValue
                range={earnings}
                format={(v) =>
                  v.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0,
                  })
                }
              />
            </p>
          )}
          {/* Sans taux de commission, il n'y a pas de gain à simuler — et
              les curseurs ne peuvent rien y changer. Le dire ici évite de
              laisser croire à une panne devant un tiret immobile. */}
          {product.commissionRatePct <= 0 && (
            <p className="max-w-xs text-center text-xs text-[color:var(--color-ink-muted)]">
              Le taux de commission de ce produit n&apos;a pas été collecté.
              Sans lui, aucun gain n&apos;est calculable — choisis un autre
              produit pour voir le simulateur réagir.
            </p>
          )}
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium">
          <span className="flex justify-between">
            <span>Vues simulées</span>
            <span className="font-[family-name:var(--font-mono)]">
              {views.toLocaleString("fr-FR")}
            </span>
          </span>
          <p className="text-xs text-[color:var(--color-ink-muted)]">
            Ici, tu poses toi-même une hypothèse de portée ; elle ne vient pas de ton profil.
          </p>
          <input
            type="range"
            min={1000}
            max={500000}
            step={1000}
            value={views}
            onChange={(e) => setViews(Number(e.target.value))}
            className="kai-range"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium">
          <span className="flex justify-between">
            <span>Taux de conversion</span>
            <span className="font-[family-name:var(--font-mono)]">
              {conversionPct.toFixed(2)}%
            </span>
          </span>
          {/* L'échelle allait de 0,5 % à 5 %, c'est-à-dire entièrement
              au-dessus de ce qu'on observe en affiliation TikTok Shop
              (~0,1 à 0,3 %) : la valeur réaliste était littéralement
              hors de portée du curseur, et le simulateur ne pouvait donc
              produire qu'un chiffre trop optimiste. */}
          <input
            type="range"
            min={0.05}
            max={2}
            step={0.05}
            value={conversionPct}
            onChange={(e) => setConversionPct(Number(e.target.value))}
            className="kai-range"
          />
        </label>

        <p className="text-xs text-[color:var(--color-ink-muted)]">
          {commissionLabel(product.commissionRatePct, product.commissionIsEstimated)} · taux de retour estimé{" "}
          {DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct} % · calcul réel
          (packages/core, pas une formule de démonstration).
        </p>
      </div>
    </div>
  );
}
