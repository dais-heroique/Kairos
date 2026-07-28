import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import type { PlanSlug } from "@kairos/shared";
import type { QuotaReader, SpendEntry, SpendRecorder } from "./types";

// Plafond de dépense IA quotidien global par défaut, surchargeable via le
// document Firestore config/costGuards (dailyCapCents) — jamais en dur
// ailleurs.
const DEFAULT_GLOBAL_DAILY_CAP_CENTS = 5000; // 50€/jour

function monthlyUsageDocRef(db: Firestore, userId: string, feature: string) {
  const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
  return db.collection("users").doc(userId).collection("aiUsage").doc(`${feature}_${monthKey}`);
}

// Un doc par jour (config/aiDailySpend_{date}) plutôt qu'un doc partagé —
// évite d'avoir à réinitialiser un compteur au changement de jour via une
// transaction : le nouveau doc démarre naturellement à 0.
function dailySpendDocRef(db: Firestore, date: string) {
  return db.collection("config").doc(`aiDailySpend_${date}`);
}

export function createFirestoreQuotaReader(db: Firestore): QuotaReader {
  return {
    async getPlan(userId) {
      const snap = await db.collection("users").doc(userId).get();
      return (snap.data()?.plan?.slug as PlanSlug | undefined) ?? "radar";
    },
    async getMonthlyUsage(userId, feature) {
      const snap = await monthlyUsageDocRef(db, userId, feature).get();
      return (snap.data()?.count as number | undefined) ?? 0;
    },
    async getGlobalDailySpendCents(date) {
      const snap = await dailySpendDocRef(db, date).get();
      return (snap.data()?.spendCents as number | undefined) ?? 0;
    },
    async getGlobalDailyCapCents() {
      const snap = await db.collection("config").doc("costGuards").get();
      return (snap.data()?.dailyCapCents as number | undefined) ?? DEFAULT_GLOBAL_DAILY_CAP_CENTS;
    },
  };
}

// Incrémente les deux compteurs Firestore utilisés par QuotaReader —
// séparé de l'écriture BigQuery (source de vérité pour l'audit/le
// dashboard, voir bigquery-spend-writer.ts) car ce sont deux
// préoccupations différentes : lecture rapide pour la décision
// quota/plafond vs. trace complète pour /admin/couts.
export function createFirestoreUsageRecorder(db: Firestore): SpendRecorder {
  return {
    async recordSpend(entry: SpendEntry) {
      await Promise.all([
        monthlyUsageDocRef(db, entry.userId, entry.feature).set(
          { count: FieldValue.increment(1) },
          { merge: true },
        ),
        dailySpendDocRef(db, entry.date).set(
          { spendCents: FieldValue.increment(entry.costCents) },
          { merge: true },
        ),
      ]);
    },
  };
}
