import { Suspense } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { SimulateurContent } from "./SimulateurContent";

// Voir classements/produits/page.tsx : SimulateurContent charge les
// produits côté client (pas au build) — plan Spark = pages statiques.
export default function SimulateurPage() {
  return (
    <RequireAuth>
      {/* useSearchParams impose une frontière Suspense en rendu statique. */}
      <Suspense fallback={null}>
        <SimulateurContent />
      </Suspense>
    </RequireAuth>
  );
}
