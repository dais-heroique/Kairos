"use client";

import { useEffect, useMemo, useState } from "react";
import { opportunityGroupOf, type OpportunityGroup } from "@kairos/core";
import {
  applyFilters,
  DEFAULT_FILTERS,
  RankingControls,
  type RankingFilters,
} from "@/components/RankingControls";
import { RankingList } from "@/components/RankingList";
import { RankingMeta } from "@/components/RankingMeta";
import type { ProductRankItem } from "@/types/product-rank-item";
import { getRankingPageData, type RankingPageData } from "@/server/firestore/rankings";

// Les trois groupes sont déjà dans l'ordre du document (compareOpportunity,
// packages/core) : les séparer à l'écran, c'est seulement rendre visible
// une frontière qui existe dans les données. Sans ça, un produit « éviter »
// et un produit sans historique se lisent comme des opportunités classées.
const GROUP_HEADINGS: Record<OpportunityGroup, { titre: string; explication: string } | null> = {
  classable: null,
  sans_base: {
    titre: "Pas encore classables",
    explication:
      "Il n'y a encore rien à mesurer sur ces produits : pas assez de relevés, pas de taux de commission, pas de confiance vendeur établie. Leur donner une note reviendrait à l'inventer.",
  },
  a_eviter: {
    titre: "Ceux qu'on te dit d'éviter",
    explication:
      "Ils remontent haut sur un ou deux critères, mais le verdict est « éviter ». Ils restent affichés — c'est une information utile — simplement pas en tête d'un classement d'opportunités.",
  },
};

function groupOf(item: ProductRankItem): OpportunityGroup {
  return opportunityGroupOf({
    opportunityScore: item.opportunityScore ?? null,
    verdict: item.verdict,
  });
}

// Voir classements/produits/page.tsx : chargement client, pas au build, et
// mêmes réglages (période/marché relisent Firestore, tri et filtres
// s'appliquent à la liste déjà chargée).
export default function OpportunitesPage() {
  const [data, setData] = useState<RankingPageData | null>(null);
  const [filters, setFilters] = useState<RankingFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    getRankingPageData("opportunities", filters.market, filters.period)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData({ items: [], generatedAt: null, isDemo: false });
      });
    return () => {
      cancelled = true;
    };
  }, [filters.market, filters.period]);

  const items = data?.items ?? null;
  const visible = useMemo(
    () => (items ? applyFilters(items, filters) : []),
    [items, filters],
  );

  // Découpe en tranches consécutives plutôt qu'en trois listes filtrées :
  // l'ordre du document fait déjà foi, et les rangs restent croissants à
  // l'écran.
  const sections = useMemo(() => {
    const out: Array<{ group: OpportunityGroup; items: ProductRankItem[]; startIndex: number }> = [];
    for (const [index, item] of visible.entries()) {
      const group = groupOf(item);
      const last = out[out.length - 1];
      if (last && last.group === group) last.items.push(item);
      else out.push({ group, items: [item], startIndex: index });
    }
    return out;
  }, [visible]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[color:var(--color-ink-muted)]">
        Phase précoce × commission élevée × vendeur fiable × faible
        saturation.
      </p>
      {data && <RankingMeta generatedAt={data.generatedAt} isDemo={data.isDemo} />}

      <RankingControls
        filters={filters}
        onChange={setFilters}
        totalCount={items?.length ?? 0}
        visibleCount={visible.length}
      />

      {items === null ? (
        <p className="text-sm text-[color:var(--color-ink-muted)]">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="kai-card text-sm text-[color:var(--color-ink-muted)]">
          Pas encore de données pour {filters.market} sur cette période — le
          pipeline quotidien n&apos;a pas encore tourné sur de vrais produits
          collectés.
        </p>
      ) : visible.length === 0 ? (
        <p className="kai-card text-sm text-[color:var(--color-ink-muted)]">
          Aucun produit ne correspond à ces filtres. Élargis la fourchette de
          prix ou retire un verdict.
        </p>
      ) : (
        sections.map((section, sectionIndex) => {
          const heading = GROUP_HEADINGS[section.group];
          return (
            <div key={section.group} className="flex flex-col gap-2">
              {heading && (
                <div className="mt-2 flex flex-col gap-1 border-t border-[color:var(--color-line)] pt-3">
                  <h2 className="font-[family-name:var(--font-display)] text-base font-bold">
                    {heading.titre}
                  </h2>
                  <p className="text-sm text-[color:var(--color-ink-muted)]">
                    {heading.explication}
                  </p>
                </div>
              )}
              <RankingList
                items={section.items}
                startIndex={section.startIndex}
                totalCount={visible.length}
                showLockedSummary={sectionIndex === sections.length - 1}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
