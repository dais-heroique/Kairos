"use client";

import { useEffect, useState } from "react";
import { rankTrend, type RankPoint, type RankingArchive } from "@kairos/core";
import { entitlementsOf, ordinalSuffix } from "@kairos/shared";
import { useAuth } from "@/lib/firebase/auth-context";
import { getRankingArchive } from "@/lib/pro/archive";
import { PaywallGate } from "@/components/PaywallGate";

// La trajectoire d'un produit dans le classement — capacité Pro.
//
// Ce que la fiche produit montrait déjà : la courbe des ventes de *ce*
// produit. Ce qu'elle ne pouvait pas montrer : sa place **par rapport aux
// autres**. Un produit dont les ventes montent pendant que dix concurrents
// montent plus vite est en train de perdre, et rien ne le disait.
//
// Une seule lecture Firestore (voir lib/pro/archive.ts).

const WIDTH = 320;
const HEIGHT = 96;
const PAD = 8;

export function RankTrend({ productId }: { productId: string }) {
  const { userDoc } = useAuth();
  const [archive, setArchive] = useState<RankingArchive | null>(null);
  const entitlements = entitlementsOf(userDoc);
  const allowed = entitlements.can("rankTrend");

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    getRankingArchive().then((a) => {
      if (!cancelled) setArchive(a);
    });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (!allowed) {
    return (
      <PaywallGate
        capability="rankTrend"
        entitlements={entitlements}
        title="Sa place dans le classement, jour après jour"
        preview={
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            Les ventes qui montent ne disent pas tout : ce qui compte est de
            savoir si tu montes plus vite que les autres.
          </p>
        }
      >
        {null}
      </PaywallGate>
    );
  }

  if (!archive) {
    return <p className="text-sm text-[color:var(--color-ink-muted)]">Chargement…</p>;
  }

  const points = rankTrend(archive, productId);
  const connus = points.filter((p) => p.rank !== null);

  if (connus.length < 2) {
    return (
      <p className="text-sm text-[color:var(--color-ink-muted)]">
        Il faut au moins deux journées de classement pour tracer une
        trajectoire. Elle apparaîtra d&apos;elle-même à mesure que les jours
        passent.
      </p>
    );
  }

  const premier = connus[0]!;
  const dernier = connus[connus.length - 1]!;
  const gain = premier.rank! - dernier.rank!;

  return (
    <div className="flex flex-col gap-3">
      <TrendChart points={points} />

      <p className="text-sm">
        {gain === 0 ? (
          <>
            Stable à la <strong>{dernier.rank}</strong>
            <sup>{ordinalSuffix(dernier.rank!)}</sup> place depuis {connus.length} jours
            de suivi.
          </>
        ) : (
          <>
            De la <strong>{premier.rank}</strong>
            <sup>{ordinalSuffix(premier.rank!)}</sup> à la <strong>{dernier.rank}</strong>
            <sup>{ordinalSuffix(dernier.rank!)}</sup> place —{" "}
            <span
              className="font-bold"
              style={{ color: gain > 0 ? "var(--color-success)" : "var(--color-coral)" }}
            >
              {gain > 0 ? `${gain} places gagnées` : `${Math.abs(gain)} places perdues`}
            </span>{" "}
            sur {connus.length} jours de suivi.
          </>
        )}
      </p>
    </div>
  );
}

function TrendChart({ points }: { points: RankPoint[] }) {
  const rangs = points.map((p) => p.rank).filter((r): r is number => r !== null);
  const meilleur = Math.min(...rangs);
  const pire = Math.max(...rangs);
  const amplitude = pire - meilleur || 1;
  const pasX = points.length > 1 ? (WIDTH - PAD * 2) / (points.length - 1) : 0;

  // L'axe est inversé : le rang 1 est en haut. Un tracé qui monte veut donc
  // dire « je gagne des places », ce que tout le monde lit spontanément —
  // l'inverse dessinerait une chute pour une progression.
  const y = (rank: number) => PAD + ((rank - meilleur) / amplitude) * (HEIGHT - PAD * 2);

  // Les journées sans classement coupent le tracé au lieu d'être reliées :
  // relier ferait passer une absence pour une position intermédiaire.
  const segments: string[] = [];
  let courant: string[] = [];
  points.forEach((point, i) => {
    if (point.rank === null) {
      if (courant.length > 1) segments.push(courant.join(" "));
      courant = [];
      return;
    }
    courant.push(`${courant.length === 0 ? "M" : "L"}${(PAD + i * pasX).toFixed(1)},${y(point.rank).toFixed(1)}`);
  });
  if (courant.length > 1) segments.push(courant.join(" "));

  return (
    <div className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img"
        aria-label={`Trajectoire du rang sur ${points.length} jours`}>
        {segments.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {points.map((point, i) =>
          point.rank === null ? null : (
            <circle
              key={point.date}
              cx={PAD + i * pasX}
              cy={y(point.rank)}
              r={i === points.length - 1 ? 4 : 2}
              fill="var(--color-accent)"
            />
          ),
        )}
      </svg>
      <div className="flex justify-between text-[11px] text-[color:var(--color-ink-muted)]">
        <span>{frenchDay(points[0]!.date)}</span>
        <span>
          {meilleur}
          <sup>{ordinalSuffix(meilleur)}</sup> au mieux · {pire}
          <sup>{ordinalSuffix(pire)}</sup> au pire
        </span>
        <span>{frenchDay(points[points.length - 1]!.date)}</span>
      </div>
    </div>
  );
}

function frenchDay(iso: string): string {
  const [, mois, jour] = iso.split("-");
  return `${jour}/${mois}`;
}
