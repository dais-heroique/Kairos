import { RequireAuth } from "@/components/RequireAuth";
import { SimulateurContent } from "./SimulateurContent";

// Voir classements/produits/page.tsx : SimulateurContent charge les
// produits côté client (pas au build) — plan Spark = pages statiques.
export default function SimulateurPage() {
  return (
    <RequireAuth>
      <SimulateurContent />
    </RequireAuth>
  );
}
