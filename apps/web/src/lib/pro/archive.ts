"use client";

import { doc, getDoc } from "firebase/firestore";
import { EMPTY_ARCHIVE, type RankingArchive } from "@kairos/core";
import { getPublicFirestore } from "@/server/firebase-client";

// Lecture de l'archive des classements — **une seule opération Firestore**.
//
// C'est ce qui a dicté sa forme : un document unique portant une fenêtre
// glissante de 30 jours, plutôt qu'un document par jour. Une page qui
// affiche la trajectoire d'un produit ferait sinon trente lectures, très
// au-dessus du budget de 5 opérations par page qui tient la contrainte 0 €.
//
// La règle Firestore exige un abonnement actif : un compte gratuit reçoit
// une erreur de permission, ce qui est le comportement voulu — le paywall
// est appliqué côté serveur, pas seulement masqué à l'écran.

export async function getRankingArchive(
  market = "FR",
  period = "7d",
): Promise<RankingArchive> {
  try {
    const snap = await getDoc(doc(getPublicFirestore(), "rankingArchive", `${market}_${period}`));
    if (!snap.exists()) return EMPTY_ARCHIVE;
    return snap.data() as RankingArchive;
  } catch {
    // Refus de permission (compte gratuit) ou archive absente : on renvoie
    // une archive vide et l'appelant affiche l'état correspondant. Faire
    // remonter l'erreur ferait planter une page entière pour une section.
    return EMPTY_ARCHIVE;
  }
}
