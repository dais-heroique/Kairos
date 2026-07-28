const LABELS: Record<string, string> = {
  boutiques: "Boutiques",
  createurs: "Créateurs",
  videos: "Vidéos",
  sons: "Sons",
  categories: "Catégories",
  nouveautes: "Nouveautés",
  vagues: "Vagues",
};

// generateStaticParams : les 7 slugs sont connus à l'avance, donc cette
// route reste 100% statique (aucune Cloud Function, donc aucun besoin du
// plan Blaze — voir §6.4). Sans ça, Next.js en fait une route dynamique
// server-rendered qui bloque le déploiement sur le plan Spark.
export function generateStaticParams() {
  return Object.keys(LABELS).map((category) => ({ category }));
}

// Sans ceci, Next.js prévoit un rendu "fallback" pour tout slug hors de la
// liste ci-dessus, ce qui exige une Cloud Function (donc le plan Blaze).
// dynamicParams=false : un slug inconnu devient un vrai 404 statique.
export const dynamicParams = false;

export default async function ClassementCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const label = LABELS[category] ?? category;

  return (
    <div className="kai-card flex flex-col items-center gap-2 py-10 text-center">
      <p className="font-[family-name:var(--font-display)] text-xl font-bold">
        {label}
      </p>
      <p className="text-sm text-[color:var(--color-ink-muted)]">
        Ce classement n&apos;a pas encore d&apos;agrégation dédiée (boutiques,
        créateurs, vidéos, sons...) — le pipeline quotidien écrit déjà un
        document vide en attendant.
      </p>
    </div>
  );
}
