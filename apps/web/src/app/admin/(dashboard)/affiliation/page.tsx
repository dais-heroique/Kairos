"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  buildPartnerStats,
  orphanCodes,
  type PartnerStats,
  type ReferredUser,
  totalPartnerStats,
} from "@kairos/affiliate";
import {
  hasAtLeastRole,
  isValidPartnerCode,
  normalisePartnerCode,
  PARTNER_COMMISSION_PCT,
  PARTNER_CODE_MAX,
  type PartnerCodeDoc,
} from "@kairos/shared";
import { useAuth } from "@/lib/firebase/auth-context";
import {
  createPartnerCode,
  listPartnerCodes,
  listReferredUsers,
  PartnerCodeTakenError,
  setPartnerCodeActive,
} from "@/lib/firestore/partner-codes";

// Programme partenaire — la page depuis laquelle le propriétaire crée les
// codes et décide des virements.
//
// Elle ne verse rien et ne promet aucune automatisation : elle affiche ce
// qui est dû, le paiement se fait par virement bancaire à la main. C'est
// assumé — brancher Stripe Connect pour quelques partenaires coûterait
// plus cher en complexité qu'en temps gagné.

const eur = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export default function AffiliationPage() {
  const { userDoc } = useAuth();
  const isOwner = !!userDoc && hasAtLeastRole(userDoc.role, "owner");

  const [codes, setCodes] = useState<PartnerCodeDoc[] | null>(null);
  const [users, setUsers] = useState<ReferredUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listPartnerCodes(), listReferredUsers()])
      .then(([c, u]) => {
        setCodes(c);
        setUsers(u);
      })
      .catch(() => setError("Lecture impossible. Vérifie tes droits."));
  }, []);

  const stats = useMemo(
    () => (codes ? buildPartnerStats(codes, users) : []),
    [codes, users],
  );
  const total = useMemo(() => totalPartnerStats(stats), [stats]);
  const orphans = useMemo(
    () => (codes ? orphanCodes(codes, users) : []),
    [codes, users],
  );

  async function handleToggle(code: string, active: boolean) {
    await setPartnerCodeActive(code, active);
    setCodes((prev) =>
      (prev ?? []).map((c) => (c.code === code ? { ...c, active } : c)),
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          Partenaires
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          Les codes que tu confies aux influenceurs, et ce qu&apos;ils
          rapportent. Les virements se font à la main — rien n&apos;est versé
          automatiquement.
        </p>
      </header>

      {error && (
        <p className="kai-card text-sm font-semibold" style={{ color: "var(--color-coral)" }}>
          {error}
        </p>
      )}

      {/* ---------- Ce qu'il y a à virer ---------- */}
      <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Codes actifs" value={String(stats.filter((s) => s.active).length)} />
        <Stat label="Inscrits parrainés" value={String(total.signups)} />
        <Stat label="Dont abonnés payants" value={String(total.payingCustomers)} />
        <Stat
          label="À virer ce mois"
          value={eur(total.monthlyCommissionCents)}
          tone="coral"
        />
      </section>

      {isOwner ? (
        <CreateCodeForm
          onCreated={(created) => setCodes((prev) => [...(prev ?? []), created])}
        />
      ) : (
        // Un administrateur voit les chiffres mais ne peut pas créer de
        // code : chaque code engage un virement. Le dire, plutôt que de
        // masquer le formulaire sans explication.
        <p className="kai-card text-sm text-[color:var(--color-ink-muted)]">
          Seul le propriétaire du site peut créer ou désactiver un code
          partenaire. Tu peux consulter les chiffres.
        </p>
      )}

      {/* ---------- Le tableau ---------- */}
      <section className="flex flex-col gap-2">
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          Par partenaire
        </h2>

        {codes === null && (
          <p className="text-sm text-[color:var(--color-ink-muted)]">Chargement…</p>
        )}

        {codes !== null && stats.length === 0 && (
          <p className="kai-card text-sm text-[color:var(--color-ink-muted)]">
            Aucun code pour l&apos;instant. Crée-en un ci-dessus, puis donne à
            l&apos;influenceur le lien qui apparaîtra.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {stats.map((s) => (
            <PartnerRow
              key={s.code}
              stats={s}
              canToggle={isOwner}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </section>

      {/* ---------- Codes inconnus ---------- */}
      {orphans.length > 0 && (
        <section className="kai-card flex flex-col gap-2" style={{ borderColor: "var(--color-warning)" }}>
          <h2 className="font-[family-name:var(--font-display)] font-bold" style={{ color: "var(--color-warning)" }}>
            Codes utilisés mais jamais créés
          </h2>
          <p className="text-xs text-[color:var(--color-ink-muted)]">
            Des gens se sont inscrits avec ces codes, qui n&apos;existent pas
            dans le registre — un influenceur qui a diffusé son code avant
            que tu le crées, ou une faute de frappe. Ces inscrits ne sont
            rattachés à personne&nbsp;: crée le code à l&apos;identique pour
            les récupérer.
          </p>
          <ul className="flex flex-col gap-1">
            {orphans.map((o) => (
              <li key={o.code} className="flex justify-between text-sm">
                <span className="font-[family-name:var(--font-mono)] font-bold">{o.code}</span>
                <span className="text-[color:var(--color-ink-muted)]">
                  {o.signups} inscrit{o.signups > 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "coral";
}) {
  return (
    <div className="kai-card flex flex-col gap-0.5 py-3">
      <span className="text-xs text-[color:var(--color-ink-muted)]">{label}</span>
      <span
        className="font-[family-name:var(--font-display)] text-xl font-extrabold"
        style={tone === "coral" ? { color: "var(--color-coral)" } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function PartnerRow({
  stats,
  canToggle,
  onToggle,
}: {
  stats: PartnerStats;
  canToggle: boolean;
  onToggle: (code: string, active: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  // Construit côté navigateur : `window.location.origin` évite d'avoir à
  // maintenir une constante de domaine qui finirait par pointer ailleurs.
  const link =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/?ref=${encodeURIComponent(stats.code)}`;

  return (
    <div className="kai-card flex flex-col gap-2" style={{ opacity: stats.active ? 1 : 0.6 }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] font-bold">
            {stats.partnerName}
          </p>
          <p className="font-[family-name:var(--font-mono)] text-sm">
            {stats.code}
            <span className="ml-2 text-xs text-[color:var(--color-ink-muted)]">
              {stats.commissionPct} %
            </span>
            {!stats.active && (
              <span className="ml-2 text-xs font-semibold" style={{ color: "var(--color-warning)" }}>
                désactivé
              </span>
            )}
          </p>
        </div>
        {canToggle && (
          <button
            type="button"
            onClick={() => onToggle(stats.code, !stats.active)}
            className="shrink-0 text-xs underline text-[color:var(--color-ink-muted)]"
          >
            {stats.active ? "Désactiver" : "Réactiver"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
        <Cell label="Inscrits" value={String(stats.signups)} />
        <Cell label="Payants" value={String(stats.payingCustomers)} />
        <Cell label="À virer / mois" value={eur(stats.monthlyCommissionCents)} strong />
      </div>

      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="truncate text-left text-xs underline text-[color:var(--color-ink-muted)]"
      >
        {copied ? "Lien copié ✓" : link}
      </button>
    </div>
  );
}

function Cell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-[color:var(--color-ink-muted)]">{label}</p>
      <p
        className="font-[family-name:var(--font-display)] font-bold"
        style={strong ? { color: "var(--color-coral)" } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function CreateCodeForm({ onCreated }: { onCreated: (code: PartnerCodeDoc) => void }) {
  const [code, setCode] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [contact, setContact] = useState("");
  const [commissionPct, setCommissionPct] = useState(String(PARTNER_COMMISSION_PCT));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const normalised = normalisePartnerCode(code);
  const codeOk = normalised.length === 0 || isValidPartnerCode(normalised);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const created = await createPartnerCode({
        code: normalised,
        partnerName: partnerName.trim(),
        contact: contact.trim() || null,
        commissionPct: Number(commissionPct),
        active: true,
        notes: null,
      });
      onCreated(created);
      setCode("");
      setPartnerName("");
      setContact("");
      setMessage(`Code ${created.code} créé.`);
    } catch (err) {
      setMessage(
        err instanceof PartnerCodeTakenError
          ? `Le code ${err.code} existe déjà — choisis-en un autre.`
          : "Création impossible. Vérifie que tu es bien connecté en propriétaire.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="kai-card flex flex-col gap-3">
      <h2 className="font-[family-name:var(--font-display)] font-bold">
        Créer un code
      </h2>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Le code
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={PARTNER_CODE_MAX}
          required
          placeholder="LEA20"
          className="kai-input font-[family-name:var(--font-mono)] uppercase"
        />
        {/* Le code se dit à l'oral dans une vidéo : c'est ce qui justifie
            qu'on le choisisse au lieu d'en générer un. */}
        <span className="text-xs text-[color:var(--color-ink-muted)]">
          Majuscules, chiffres et tirets. Il sera dicté à l&apos;oral dans les
          vidéos — fais-le court et sans ambiguïté.
        </span>
        {!codeOk && (
          <span className="text-xs font-semibold" style={{ color: "var(--color-coral)" }}>
            Entre {3} et {PARTNER_CODE_MAX} caractères, sans espace ni accent.
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Nom du partenaire
        <input
          value={partnerName}
          onChange={(e) => setPartnerName(e.target.value)}
          required
          placeholder="Léa Martin"
          className="kai-input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Contact <span className="font-normal text-[color:var(--color-ink-muted)]">(facultatif)</span>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="email, @instagram, IBAN…"
          className="kai-input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Commission
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            value={commissionPct}
            onChange={(e) => setCommissionPct(e.target.value)}
            className="kai-input w-24 font-[family-name:var(--font-mono)]"
          />
          <span className="text-sm text-[color:var(--color-ink-muted)]">
            % de ce que paie le client, chaque mois
          </span>
        </div>
      </label>

      <button
        type="submit"
        disabled={saving || !codeOk || normalised.length === 0}
        className="kai-btn-primary disabled:opacity-50"
      >
        {saving ? "Création…" : "Créer le code"}
      </button>

      {message && <p className="text-sm font-medium">{message}</p>}
    </form>
  );
}
