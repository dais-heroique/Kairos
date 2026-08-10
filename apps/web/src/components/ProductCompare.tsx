"use client";

import { useMemo, useState } from "react";
import { computeEarnings, DEFAULT_EARNINGS_CONFIG } from "@kairos/core";
import { entitlementsOf, PHASE_LABELS } from "@kairos/shared";
import { useAuth } from "@/lib/firebase/auth-context";
import type { ProductRankItem } from "@/types/product-rank-item";
import { EstimatedValue } from "@/components/EstimatedValue";
import { PaywallGate } from "@/components/PaywallGate";
import { VerdictBadge } from "@/components/VerdictBadge";

// Comparateur — capacité Pro.
//
// Ce qu'il résout : le classement répond « lequel est le mieux placé »,
// mais pas « lequel je tourne, entre ces trois-là ». Un créateur qui a
// trois échantillons en route ne veut pas parcourir trois fiches, il veut
// les voir côte à côte sur les mêmes lignes.
//
// Zéro lecture Firestore supplémentaire : tout est déjà dans les items du
// classement, dénormalisés à l'écriture par le pipeline.

const MAX_COMPARES = 4;

export function ProductCompare({ items }: { items: ProductRankItem[] }) {
  const { userDoc } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const entitlements = entitlementsOf(userDoc);

  const chosen = useMemo(
    () => selected.map((id) => items.find((i) => i.id === id)).filter((i): i is ProductRankItem => !!i),
    [selected, items],
  );

  if (!entitlements.can("productCompare")) {
    return (
      <PaywallGate
        capability="productCompare"
        entitlements={entitlements}
        title="Comparer jusqu'à quatre produits côte à côte"
        preview={
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            Verdict, concurrence, fenêtre restante et gain — sur les mêmes
            lignes, pour trancher en une fois.
          </p>
        }
      >
        {null}
      </PaywallGate>
    );
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_COMPARES
          ? prev
          : [...prev, id],
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold">
          Choisis jusqu&apos;à {MAX_COMPARES} produits
          {selected.length > 0 && ` — ${selected.length} sélectionné${selected.length > 1 ? "s" : ""}`}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {items.slice(0, 30).map((item) => {
            const on = selected.includes(item.id);
            const plein = !on && selected.length >= MAX_COMPARES;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                disabled={plein}
                aria-pressed={on}
                className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40"
                style={{
                  backgroundColor: on ? "var(--color-accent)" : "var(--color-surface)",
                  color: on ? "#fff" : "var(--color-ink-muted)",
                  border: `1px solid ${on ? "var(--color-accent)" : "var(--color-border)"}`,
                }}
              >
                {item.emoji ? `${item.emoji} ` : ""}
                {item.title.length > 28 ? `${item.title.slice(0, 28)}…` : item.title}
              </button>
            );
          })}
        </div>
      </div>

      {chosen.length === 0 ? (
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Sélectionne au moins deux produits pour les mettre face à face.
        </p>
      ) : (
        <CompareTable items={chosen} avgViews={userDoc?.profile.avgViews ?? 0} />
      )}
    </div>
  );
}

function CompareTable({ items, avgViews }: { items: ProductRankItem[]; avgViews: number }) {
  const eur = (v: number) =>
    v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    // Le défilement horizontal est enfermé ici : le corps de la page ne
    // défile jamais latéralement, même à quatre colonnes sur un téléphone.
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left font-semibold">&nbsp;</th>
            {items.map((item) => (
              <th key={item.id} className="min-w-[9rem] p-2 text-left align-bottom">
                <span className="block text-lg" aria-hidden>
                  {item.emoji ?? "📦"}
                </span>
                <span className="block font-bold">{item.title}</span>
                <span className="block text-xs font-normal text-[color:var(--color-ink-muted)]">
                  {item.shopName}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <Ligne titre="Verdict">
            {items.map((item) => (
              <td key={item.id} className="p-2 align-top">
                <VerdictBadge verdict={item.verdict} />
              </td>
            ))}
          </Ligne>

          <Ligne titre="Où en est le produit">
            {items.map((item) => (
              <td key={item.id} className="p-2 align-top text-[color:var(--color-ink-muted)]">
                {item.phase ? PHASE_LABELS[item.phase].short : "—"}
              </td>
            ))}
          </Ligne>

          <Ligne titre="Concurrence">
            {items.map((item) => (
              <td key={item.id} className="p-2 align-top">
                {item.saturationScore === undefined ? (
                  <span className="text-[color:var(--color-ink-muted)]">—</span>
                ) : (
                  <span className="font-[family-name:var(--font-mono)] font-bold">
                    {item.saturationScore}/100
                  </span>
                )}
              </td>
            ))}
          </Ligne>

          <Ligne titre="Fenêtre restante">
            {items.map((item) => (
              <td key={item.id} className="p-2 align-top text-[color:var(--color-ink-muted)]">
                {item.windowDaysHigh === undefined
                  ? "—"
                  : `${item.windowDaysLow}–${item.windowDaysHigh} j`}
              </td>
            ))}
          </Ligne>

          <Ligne titre="Commission">
            {items.map((item) => (
              <td key={item.id} className="p-2 align-top text-[color:var(--color-ink-muted)]">
                {/* 0 % n'est pas une commission : c'est une absence. */}
                {item.commissionRatePct > 0 ? `${item.commissionRatePct} %` : "inconnue"}
              </td>
            ))}
          </Ligne>

          <Ligne titre={`Gain pour ${(avgViews || 1000).toLocaleString("fr-FR")} vues`}>
            {items.map((item) => (
              <td key={item.id} className="p-2 align-top">
                <EstimatedValue
                  range={computeEarnings({
                    expectedViews: avgViews || 1000,
                    followerRange: "5k_20k",
                    niche: "",
                    medianConversionRate: DEFAULT_EARNINGS_CONFIG.defaultConversionRate,
                    priceCents: item.priceCents,
                    commissionRatePct: item.commissionRatePct,
                    estimatedReturnRatePct: DEFAULT_EARNINGS_CONFIG.defaultReturnRatePct,
                  })}
                  format={eur}
                  className="font-[family-name:var(--font-mono)] text-sm font-bold"
                />
              </td>
            ))}
          </Ligne>
        </tbody>
      </table>
    </div>
  );
}

function Ligne({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <tr className="border-t" style={{ borderColor: "var(--color-border)" }}>
      <th className="p-2 text-left align-top text-xs font-semibold whitespace-nowrap text-[color:var(--color-ink-muted)]">
        {titre}
      </th>
      {children}
    </tr>
  );
}
