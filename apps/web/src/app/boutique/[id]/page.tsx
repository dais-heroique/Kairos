import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShopDetail } from "@/server/firestore/products";

// Même contrainte que produit/[id] : route SSR dynamique, nécessite le
// plan Blaze pour Firebase Hosting — voir docs/STATE.md.

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
  const shop = await getShopDetail(id);
  if (!shop) return { title: "Boutique introuvable" };
  return { title: `${shop.name} — Kairos` };
}

export default async function BoutiqueDetailPage({ params }: Props) {
  const { id } = await params;
  const shop = await getShopDetail(id);

  if (!shop) notFound();

  return (
    <div className="flex min-h-dvh flex-col gap-4 px-5 py-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          {shop.name}
        </h1>
        {shop.verified && (
          <p className="mt-1 text-xs font-semibold text-[color:var(--color-success)]">
            Boutique vérifiée
          </p>
        )}
      </header>

      <div className="kai-card flex flex-col gap-1 text-sm">
        <p>Score de confiance : {shop.trustScore}/100</p>
        <p>Délai d&apos;expédition moyen : {shop.shipDays} jours</p>
        <p>Taux d&apos;acceptation échantillon : {Math.round(shop.sampleApprovalRate * 100)}%</p>
        <p>Taux de respect de commission : {Math.round(shop.commissionHonorRate * 100)}%</p>
        <p>Produits actifs : {shop.productCount}</p>
      </div>
    </div>
  );
}
