import { RequireAuth } from "@/components/RequireAuth";
import { getRankingPageData } from "@/server/firestore/rankings";
import { SimulateurContent } from "./SimulateurContent";

export default async function SimulateurPage() {
  const { items } = await getRankingPageData("products", "FR", "7d");

  return (
    <RequireAuth>
      <SimulateurContent products={items} />
    </RequireAuth>
  );
}
