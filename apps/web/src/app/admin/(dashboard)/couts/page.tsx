import { getAiSpendSummary, type AiSpendSummary } from "@/server/bigquery/ai-spend-reader";

function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

const EMPTY_SUMMARY: AiSpendSummary = {
  todayCents: 0,
  monthCents: 0,
  byFeatureCents: {},
  topConsumers: [],
};

// Hérite du garde admin de admin/(dashboard)/layout.tsx. Une seule
// requête BigQuery (voir ai-spend-reader.ts) — pas de coût supplémentaire
// par rafraîchissement de la page au-delà de ce scan mensuel.
//
// Page statique (contrainte plan Spark) : tant qu'aucun projet GCP réel
// n'est branché (GCP_PROJECT_ID/credentials — voir docs/STATE.md), la
// requête BigQuery échoue et on affiche un résumé vide plutôt que de
// faire planter le build. Une fois l'infra GCP en place, un redéploiement
// régénère cette page avec les vrais chiffres du jour du build.
export default async function CoutsPage() {
  const summary = await getAiSpendSummary().catch(() => null);
  const noData = summary === null;
  const data = summary ?? EMPTY_SUMMARY;

  return (
    <div className="flex flex-col gap-4 px-5 py-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
        Coûts IA
      </h1>

      {noData && (
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Infra GCP/BigQuery pas encore branchée — chiffres à zéro en attendant.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="kai-card flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-wide text-[color:var(--color-ink-muted)] uppercase">
            Aujourd&apos;hui
          </p>
          <p className="font-[family-name:var(--font-mono)] text-2xl font-bold">
            {formatEuros(data.todayCents)}
          </p>
        </div>
        <div className="kai-card flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-wide text-[color:var(--color-ink-muted)] uppercase">
            Ce mois-ci
          </p>
          <p className="font-[family-name:var(--font-mono)] text-2xl font-bold">
            {formatEuros(data.monthCents)}
          </p>
        </div>
      </div>

      <div className="kai-card flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-[color:var(--color-ink-muted)] uppercase">
          Par fonctionnalité
        </p>
        {Object.entries(data.byFeatureCents).length === 0 ? (
          <p className="text-sm text-[color:var(--color-ink-muted)]">Aucune dépense ce mois-ci.</p>
        ) : (
          Object.entries(data.byFeatureCents)
            .sort((a, b) => b[1] - a[1])
            .map(([feature, cents]) => (
              <div key={feature} className="flex justify-between text-sm">
                <span>{feature}</span>
                <span className="font-[family-name:var(--font-mono)]">{formatEuros(cents)}</span>
              </div>
            ))
        )}
      </div>

      <div className="kai-card flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-[color:var(--color-ink-muted)] uppercase">
          Top 10 consommateurs
        </p>
        {data.topConsumers.length === 0 ? (
          <p className="text-sm text-[color:var(--color-ink-muted)]">Aucune dépense ce mois-ci.</p>
        ) : (
          data.topConsumers.map((c) => (
            <div key={c.userId} className="flex justify-between text-sm">
              <span className="truncate">{c.userId}</span>
              <span className="font-[family-name:var(--font-mono)]">{formatEuros(c.costCents)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
