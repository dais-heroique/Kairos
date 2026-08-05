"use client";

import { useEffect, useState } from "react";
import { DEFAULT_COMPLIANCE_RULES_FR } from "@kairos/shared";
import { seedDefaultComplianceRules } from "@/lib/firestore/compliance-rules";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { ComplianceRule } from "@kairos/shared";
import { getClientFirestore } from "@/client/firebase-client";

// Édition des règles Compliance Guard sans redéploiement (§ Lot 8) —
// hérite du garde admin de admin/(dashboard)/layout.tsx. Écriture
// autorisée par firestore.rules (config/complianceRules, admin only).
export default function CompliancePage() {
  const [rules, setRules] = useState<ComplianceRule[] | null>(null);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState<number | null>(null);

  useEffect(() => {
    const ref = doc(getClientFirestore(), "config", "complianceRules");
    getDoc(ref).then((snap) => {
      const data = (snap.data()?.rules as ComplianceRule[] | undefined) ?? [];
      setRules(data);
      setRaw(JSON.stringify(data, null, 2));
    });
  }, []);

  // Le document n'avait jamais été créé : le garde-fou évaluait chaque
  // script contre zéro règle, sans rien signaler et sans que rien ne
  // l'indique. Un bouton pour poser le jeu français par défaut.
  async function handleSeedDefaults() {
    setError(null);
    setSaving(true);
    try {
      const count = await seedDefaultComplianceRules();
      setRules(DEFAULT_COMPLIANCE_RULES_FR);
      setRaw(JSON.stringify(DEFAULT_COMPLIANCE_RULES_FR, null, 2));
      setSeeded(count);
    } catch {
      setError("Écriture refusée — vérifie que tu es bien admin.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setError(null);
    let parsed: ComplianceRule[];
    try {
      parsed = JSON.parse(raw);
    } catch {
      setError("JSON invalide.");
      return;
    }
    setSaving(true);
    try {
      const ref = doc(getClientFirestore(), "config", "complianceRules");
      await setDoc(ref, { rules: parsed, updatedAt: new Date().toISOString() });
      setRules(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-5 py-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
        Compliance Guard
      </h1>
      <p className="text-sm text-[color:var(--color-ink-muted)]">
        {rules?.length ?? 0} règle(s) active(s).
        {rules?.length === 0 && (
          <strong style={{ color: "var(--color-coral)" }}>
            {" "}Aucune règle : le garde-fou ne signale donc rien.
          </strong>
        )}
        {" "}Édition JSON directe — un
        éditeur formulaire viendra plus tard.
      </p>

      <button
        type="button"
        onClick={handleSeedDefaults}
        disabled={saving}
        className="kai-btn-outline disabled:opacity-50"
      >
        Charger les {DEFAULT_COMPLIANCE_RULES_FR.length} règles françaises par défaut
      </button>
      {seeded !== null && (
        <p className="text-sm" style={{ color: "var(--color-success)" }}>
          {seeded} règles écrites — le garde-fou est actif.
        </p>
      )}

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={16}
        className="kai-input font-[family-name:var(--font-mono)] text-xs"
        spellCheck={false}
      />

      {error && (
        <p className="text-sm" style={{ color: "var(--color-coral)" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="kai-card font-semibold disabled:opacity-40"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}
