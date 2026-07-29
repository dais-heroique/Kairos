"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const ref = doc(getClientFirestore(), "config", "complianceRules");
    getDoc(ref).then((snap) => {
      const data = (snap.data()?.rules as ComplianceRule[] | undefined) ?? [];
      setRules(data);
      setRaw(JSON.stringify(data, null, 2));
    });
  }, []);

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
        {rules?.length ?? 0} règle(s) active(s). Édition JSON directe — un
        éditeur formulaire viendra plus tard.
      </p>

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
