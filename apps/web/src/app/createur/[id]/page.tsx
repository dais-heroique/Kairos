import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EstimatedValue } from "@/components/EstimatedValue";
import { getCreatorDetail } from "@/server/firestore/creators";

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
  const creator = await getCreatorDetail(id);
  if (!creator) return { title: "Créateur introuvable" };
  return { title: `@${creator.handle} — Kairos` };
}

export default async function CreateurDetailPage({ params }: Props) {
  const { id } = await params;
  const creator = await getCreatorDetail(id);

  if (!creator) notFound();

  return (
    <div className="flex min-h-dvh flex-col gap-4 px-5 py-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          @{creator.handle}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          {creator.followerCount.toLocaleString("fr-FR")} abonnés ·{" "}
          {creator.avgViews.toLocaleString("fr-FR")} vues moyennes
        </p>
      </header>

      <div className="kai-card flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-wide text-[color:var(--color-ink-muted)] uppercase">
          GMV mensuel estimé
        </p>
        <EstimatedValue range={creator.estimatedMonthlyGmv} format={(v) => `${v}€`} />
      </div>

      <div className="kai-card flex flex-col gap-1 text-sm">
        <p>Taux d&apos;engagement : {Math.round(creator.engagementRate * 100)}%</p>
        <p>Cadence de publication : {creator.postingCadence.toFixed(1)}/semaine</p>
      </div>
    </div>
  );
}
