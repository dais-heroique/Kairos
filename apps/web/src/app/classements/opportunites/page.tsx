import { RankingList } from "@/components/RankingList";
import { getRankingPageData } from "@/server/firestore/rankings";

export default async function OpportunitesPage() {
  const { items } = await getRankingPageData("opportunities", "FR", "7d");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[color:var(--color-ink-muted)]">
        Phase précoce × commission élevée × vendeur fiable × faible
        saturation.
      </p>
      {items.length === 0 ? (
        <p className="kai-card text-sm text-[color:var(--color-ink-muted)]">
          Pas encore de données — le pipeline quotidien n&apos;a pas encore
          tourné sur de vrais produits collectés.
        </p>
      ) : (
        <RankingList items={items} />
      )}
    </div>
  );
}
