"use client";

import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  complianceRulesDocSchema,
  DEFAULT_COMPLIANCE_RULES_FR,
  defaultComplianceRulesDoc,
  type ComplianceRule,
} from "@kairos/shared";
import { firestore } from "@/lib/firebase/client";

// `config/complianceRules` n'avait jamais été créé : le Compliance Guard
// évaluait donc chaque script contre un tableau vide, sans jamais rien
// signaler et sans que rien ne l'indique. Un garde-fou silencieusement
// inerte est pire qu'un garde-fou absent, parce qu'on croit être couvert.

const DOC_PATH = ["config", "complianceRules"] as const;

/**
 * Règles en vigueur. Si le document n'existe pas encore, retombe sur les
 * règles françaises par défaut plutôt que sur un tableau vide : mieux vaut
 * un jeu générique appliqué qu'aucun contrôle du tout.
 */
export async function getComplianceRules(): Promise<ComplianceRule[]> {
  try {
    const snap = await getDoc(doc(firestore, ...DOC_PATH));
    if (!snap.exists()) return DEFAULT_COMPLIANCE_RULES_FR;
    const parsed = complianceRulesDocSchema.safeParse(snap.data());
    // Document présent mais mal formé (édition manuelle ratée depuis
    // /admin/compliance) : on préfère les règles par défaut à rien.
    return parsed.success ? parsed.data.rules : DEFAULT_COMPLIANCE_RULES_FR;
  } catch {
    return DEFAULT_COMPLIANCE_RULES_FR;
  }
}

/** Écrit le jeu par défaut — réservé à un admin (voir firestore.rules). */
export async function seedDefaultComplianceRules(): Promise<number> {
  const payload = defaultComplianceRulesDoc();
  await setDoc(doc(firestore, ...DOC_PATH), payload);
  return payload.rules.length;
}
