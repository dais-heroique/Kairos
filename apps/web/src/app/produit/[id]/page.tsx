import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EstimatedValue } from "@/components/EstimatedValue";
import { VerdictBadge } from "@/components/VerdictBadge";
import { getProductDetail } from "@/server/firestore/products";

// Page SSR dynamique et indexable — l'espace des IDs produit n'est pas
// énumérable à la compilation (contrairement à classements/[category], 7
// slugs fixes). Contrainte à assumer : contrairement au reste du site,
// une route SSR dynamique sur Firebase Hosting nécessite le plan Blaze
// (Cloud Functions/Cloud Run), pas le plan Spark gratuit — décision de
// coût à confirmer avant déploiement, voir docs/STATE.md.

interface Props {
  params: Promise<{ id: string }>;
}

// Reste sur le plan Spark (gratuit) pour l'instant : aucune page prérendue
// tant que le plan Blaze n'est pas activé (voir commentaire ci-dessus).
// À retirer ces deux exports dès que Blaze est confirmé.
export const dynamicParams = false;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { product } = await getProductDetail(id);
  if (!product) return { title: "Produit introuvable" };
  return {
    title: `${product.title} — Kairos`,
    description: `Verdict, fourchette de ventes et commission pour ${product.title}.`,
  };
}

export default async function ProduitDetailPage({ params }: Props) {
  const { id } = await params;
  const { product, shop } = await getProductDetail(id);

  if (!product) notFound();

  return (
    <div className="flex min-h-dvh flex-col gap-4 px-5 py-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          {product.title}
        </h1>
        {shop && (
          <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">{shop.name}</p>
        )}
      </header>

      {product.latestVerdict && (
        <div className="kai-card flex flex-col gap-2">
          <VerdictBadge verdict={product.latestVerdict.verdict} />
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            {product.latestVerdict.reasoning.join(" ")}
          </p>
        </div>
      )}

      {product.latestEstimates && (
        <div className="kai-card flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-wide text-[color:var(--color-ink-muted)] uppercase">
            Ventes estimées (7j)
          </p>
          <EstimatedValue
            range={{
              low: product.latestEstimates.salesLow,
              high: product.latestEstimates.salesHigh,
              confidence: product.latestEstimates.confidence,
              method: product.latestEstimates.method,
            }}
          />
        </div>
      )}

      <div className="kai-card flex flex-col gap-1 text-sm">
        <p>Prix : {(product.priceCents / 100).toFixed(2)}€</p>
        <p>Commission : {product.commission.ratePct}%</p>
      </div>
    </div>
  );
}
