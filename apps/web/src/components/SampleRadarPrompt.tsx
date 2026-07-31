"use client";

import { useState } from "react";

export interface SampleRadarPromptProps {
  productId: string;
  productTitle?: string;
  onRespond: (productId: string, accepted: boolean) => Promise<void>;
}

// La boucle déclarative du Sample Radar (§ Lot 8) : depuis la watchlist,
// un produit au statut sample_requested affiche cette invite en 1 tap.
// C'est le moat — plus d'utilisateurs répondent, meilleures sont les
// données d'acceptation vendeur agrégées côté Shop.sampleApprovalRate.
export function SampleRadarPrompt({ productId, productTitle, onRespond }: SampleRadarPromptProps) {
  const [pending, setPending] = useState(false);
  const [answered, setAnswered] = useState(false);

  async function respond(accepted: boolean) {
    setPending(true);
    try {
      await onRespond(productId, accepted);
      setAnswered(true);
    } finally {
      setPending(false);
    }
  }

  if (answered) {
    return (
      <div className="kai-card text-sm text-[color:var(--color-ink-muted)]" data-testid="sample-radar-thanks">
        Merci, c&apos;est noté.
      </div>
    );
  }

  return (
    <div className="kai-card flex flex-col gap-2" data-testid="sample-radar-prompt">
      <p className="text-sm font-semibold">
        {productTitle ?? "Ce produit"} — ton échantillon a été accepté ?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => respond(true)}
          className="kai-input flex-1 disabled:opacity-40"
          data-testid="sample-radar-yes"
        >
          Oui, reçu ✓
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => respond(false)}
          className="kai-input flex-1 disabled:opacity-40"
          data-testid="sample-radar-no"
        >
          Pas encore / refusé
        </button>
      </div>
    </div>
  );
}
