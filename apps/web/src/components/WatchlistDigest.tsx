"use client";

import { useEffect, useState } from "react";
import { movesSince, type RankMove } from "@kairos/core";
import { entitlementsOf, ordinalSuffix } from "@kairos/shared";
import { useAuth } from "@/lib/firebase/auth-context";
import { getRankingArchive } from "@/lib/pro/archive";
import { getWatchlistIds } from "@/lib/firestore/watchlist";
import { PaywallGate } from "@/components/PaywallGate";

// « Ce qui a bougé depuis ta dernière visite » — la capacité `alerts`,
// enfin réelle.
//
// Elle était annoncée depuis le début et n'existait pas : seul un booléen
// `alertsEnabled` était écrit dans Firestore, aucune notification n'a
// jamais été envoyée. Envoyer un vrai message demanderait un serveur et un
// service d'envoi, donc de l'argent.
//
// Ce qui coûte 0 € et rend le même service : calculer le mouvement à
// l'ouverture de l'app, à partir de l'archive des classements. Le créateur
// ouvre KAIROS, il voit d'abord ce qui a changé sur ses produits — c'est
// l'information que l'alerte aurait portée, au moment où il peut en faire
// quelque chose.
//
// Le libellé du catalogue dit exactement ça, il ne promet pas de
// notification push.

const JOURS_DE_REFERENCE = 7;

export function WatchlistDigest() {
  const { firebaseUser, userDoc } = useAuth();
  const [moves, setMoves] = useState<RankMove[] | null>(null);
  const entitlements = entitlementsOf(userDoc);
  const allowed = entitlements.can("alerts");

  useEffect(() => {
    if (!allowed || !firebaseUser) return;
    let cancelled = false;

    (async () => {
      const [archive, ids] = await Promise.all([
        getRankingArchive(),
        getWatchlistIds(firebaseUser.uid),
      ]);
      if (cancelled) return;

      const reference = new Date(Date.now() - JOURS_DE_REFERENCE * 86_400_000)
        .toISOString()
        .slice(0, 10);
      setMoves(movesSince(archive, reference, [...ids]));
    })();

    return () => {
      cancelled = true;
    };
  }, [allowed, firebaseUser]);

  if (!allowed) {
    return (
      <PaywallGate
        capability="alerts"
        entitlements={entitlements}
        title="Évolution des produits suivis"
        preview={
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            Les produits dont le classement ou le niveau de concurrence évolue.
          </p>
        }
      >
        {null}
      </PaywallGate>
    );
  }

  if (moves === null) return null;

  if (moves.length === 0) {
    return (
      <div className="kai-card">
        <p className="font-[family-name:var(--font-display)] font-bold">
          Rien de neuf sur tes produits suivis
        </p>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          Il faut au moins deux journées de classement pour comparer. Suis des
          produits depuis les classements (l&apos;étoile ☆) et reviens.
        </p>
      </div>
    );
  }

  return (
    <div className="kai-card flex flex-col gap-3">
      <div>
        <p className="font-[family-name:var(--font-display)] font-bold">
          Cette semaine sur tes produits suivis
        </p>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Sur les {JOURS_DE_REFERENCE} derniers jours de classement.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {moves.slice(0, 6).map((move) => (
          <li key={move.productId} className="flex items-start gap-3">
            <span className="text-lg" aria-hidden>
              {move.emoji ?? "📦"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{move.title}</p>
              <p className="text-xs text-[color:var(--color-ink-muted)]">
                {mouvementTexte(move)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Une phrase par produit. On ne dit que ce qu'on sait : un rang qu'on ne
 * peut pas comparer ne devient pas « stable », et une concurrence inconnue
 * ne devient pas zéro.
 */
function mouvementTexte(move: RankMove): string {
  const morceaux: string[] = [];
  const rang = (n: number) => `${n}${ordinalSuffix(n)}`;

  if (move.delta !== null && move.delta !== 0) {
    morceaux.push(
      move.delta > 0
        ? `${rang(move.from!)} → ${rang(move.to!)}, ${move.delta} place${move.delta > 1 ? "s" : ""} gagnée${move.delta > 1 ? "s" : ""}`
        : `${rang(move.from!)} → ${rang(move.to!)}, ${Math.abs(move.delta)} place${Math.abs(move.delta) > 1 ? "s" : ""} perdue${Math.abs(move.delta) > 1 ? "s" : ""}`,
    );
  } else if (move.delta === 0) {
    morceaux.push(`toujours ${rang(move.to!)}`);
  }

  // Le signal qui compte vraiment pour un créateur : l'évolution de la concurrence.
  if (move.saturationDelta !== null && move.saturationDelta >= 10) {
    morceaux.push(`la concurrence a pris ${move.saturationDelta} points`);
  } else if (move.saturationDelta !== null && move.saturationDelta <= -10) {
    morceaux.push(`la concurrence est retombée de ${Math.abs(move.saturationDelta)} points`);
  }

  return morceaux.join(" · ") || "pas de changement mesurable";
}
