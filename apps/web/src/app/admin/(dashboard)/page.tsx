"use client";

import type { InviteCode, User } from "@kairos/shared";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { listAllUsers } from "@/lib/firestore/admin";
import {
  createInviteCode,
  listInviteCodes,
  setInviteCodeActive,
} from "@/lib/firestore/invite-codes";
import { seedDemoRankingData } from "@/lib/firestore/seed-demo-data";
import { runPipeline } from "@/lib/pipeline/run-pipeline";

export default function AdminDashboardPage() {
  const t = useTranslations("Admin");
  const { firebaseUser, userDoc } = useAuth();
  const isOwner = userDoc?.role === "owner";
  const [users, setUsers] = useState<User[] | null>(null);
  const [codes, setCodes] = useState<InviteCode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const [seedSummary, setSeedSummary] = useState<string | null>(null);

  const [codeInput, setCodeInput] = useState("");
  const FIXED_TRIAL_DAYS = 5;
  const [maxUses, setMaxUses] = useState("1");
  const [creating, setCreating] = useState(false);

  async function refresh() {
    try {
      const [u, c] = await Promise.all([listAllUsers(), listInviteCodes()]);
      setUsers(u);
      setCodes(c);
    } catch {
      setError(t("errorGeneric"));
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateCode(event: FormEvent) {
    event.preventDefault();
    if (!firebaseUser || !codeInput.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createInviteCode(firebaseUser.uid, {
        code: codeInput.trim(),
        maxUses: Number(maxUses) || 1,
      });
      setCodeInput("");
      await refresh();
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(code: InviteCode) {
    try {
      await setInviteCodeActive(code.code, !code.active);
      await refresh();
    } catch {
      setError(t("errorGeneric"));
    }
  }

  // Deux temps, et l'ordre compte : le seed n'écrit que des relevés bruts
  // (aucun verdict), c'est le pipeline qui les analyse ensuite avec les
  // moteurs de production. Sans ce second appel, les classements
  // resteraient vides — ce qui est le comportement correct : rien ne
  // s'affiche tant que rien n'a été calculé.
  async function handleSeedDemoData() {
    setSeeding(true);
    setSeedDone(false);
    setError(null);
    try {
      const seeded = await seedDemoRankingData();
      const result = await runPipeline();
      setSeedSummary(
        `${seeded.products} produits, ${seeded.snapshots} relevés simulés — ` +
          `${result.productsRanked} classés, ${result.productsNeedingMoreHistory} en attente d'historique. ` +
          `Agrégats : ${result.shopsRanked} boutiques, ${result.categoriesRanked} catégories, ` +
          `${result.newcomersRanked} nouveautés. ` +
          `Archive : ${result.archivedDays} jour${result.archivedDays > 1 ? "s" : ""}.`,
      );
      setSeedDone(true);
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setSeeding(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col gap-8 px-5 py-8 sm:max-w-2xl">
      <div>
        <Link
          href="/compte"
          className="text-sm font-medium underline"
          style={{ color: "var(--color-coral)" }}
        >
          {t("backToAccount")}
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold">
          {t("title")}
        </h1>
      </div>

      {error && (
        <p className="text-sm font-medium" style={{ color: "var(--color-coral)" }}>
          {error}
        </p>
      )}

      <section className="kai-card flex flex-col gap-2">
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          Produits & pipeline
        </h2>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Saisir les relevés quotidiens depuis ton espace affilié TikTok Shop,
          puis faire tourner les moteurs de verdict sur l&apos;historique.
        </p>
        <Link href="/admin/produits" className="kai-btn-primary mt-2 block">
          Gérer les produits
        </Link>
      </section>

      <section className="kai-card flex flex-col gap-2">
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          Partenaires
        </h2>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Les codes confiés aux influenceurs, ce qu&apos;ils rapportent, et ce
          qu&apos;il y a à leur virer. Seul le propriétaire peut créer un code.
        </p>
        <Link href="/admin/affiliation" className="kai-btn-outline mt-2 block text-center">
          Voir les partenaires
        </Link>
      </section>

      <section className="kai-card flex flex-col gap-2">
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          {t("seedTitle")}
        </h2>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          {t("seedBody")}
        </p>
        <button
          type="button"
          onClick={handleSeedDemoData}
          disabled={seeding}
          className="kai-btn-outline mt-2"
        >
          {seeding ? t("seedingButton") : t("seedButton")}
        </button>
        {seedDone && (
          <p className="text-sm font-medium" style={{ color: "var(--color-success)" }}>
            {seedSummary ?? t("seedSuccess")}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          {t("usersTitle")}{" "}
          {users && (
            <span className="text-sm font-normal text-[color:var(--color-ink-muted)]">
              {t("usersCount", { count: users.length })}
            </span>
          )}
        </h2>
        <div className="flex flex-col gap-2">
          {users?.map((u) => (
            <div key={u.uid} className="kai-card flex flex-col gap-1">
              <p className="text-sm font-semibold">{u.email}</p>
              <div className="flex items-center gap-2 text-xs text-[color:var(--color-ink-muted)]">
                <span
                  className="rounded-full px-2 py-0.5 font-bold uppercase"
                  style={{
                    backgroundColor: "var(--color-surface-raised)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {u.plan.slug}
                </span>
                <span>
                  {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                </span>
                {u.role === "admin" && (
                  <span style={{ color: "var(--color-coral)" }}>admin</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          {t("codesTitle")}
        </h2>

        {isOwner ? (
          <form onSubmit={handleCreateCode} className="kai-card flex flex-col gap-3">
          <p className="text-sm font-semibold">{t("createCodeTitle")}</p>
          <label className="flex flex-col gap-1 text-sm">
            {t("codeLabel")}
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder={t("codePlaceholder")}
              className="kai-input font-[family-name:var(--font-mono)] uppercase"
            />
          </label>
          <div className="flex gap-3">
            <p className="flex-1 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--color-border)" }}>
              Essai Pro fixe : <strong>{FIXED_TRIAL_DAYS} jours</strong>
            </p>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              {t("maxUsesLabel")}
              <input
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="kai-input"
              />
            </label>
          </div>
          <button type="submit" disabled={creating} className="kai-btn-primary">
            {creating ? t("creatingButton") : t("createButton")}
          </button>
          </form>
        ) : (
          <p className="kai-card text-sm text-[color:var(--color-ink-muted)]">
            Seul le propriétaire peut générer, désactiver ou réactiver un code d&apos;invitation.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {codes?.length === 0 && (
            <p className="text-sm text-[color:var(--color-ink-muted)]">
              {t("codesEmpty")}
            </p>
          )}
          {codes?.map((c) => (
            <div key={c.code} className="kai-card flex items-center justify-between gap-3">
              <div>
                <p className="font-[family-name:var(--font-mono)] font-semibold">
                  {c.code}
                </p>
                <p className="text-xs text-[color:var(--color-ink-muted)]">
                  {t("usedOf", { used: c.usedCount, max: c.maxUses })} ·{" "}
                  {c.trialDays}j ·{" "}
                  <span
                    style={{
                      color: c.active
                        ? "var(--color-success)"
                        : "var(--color-ink-muted)",
                    }}
                  >
                    {c.active ? t("statusActive") : t("statusInactive")}
                  </span>
                </p>
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleToggleActive(c)}
                  className="kai-btn-outline shrink-0 px-3 py-2 text-sm"
                >
                  {c.active ? t("deactivateButton") : t("activateButton")}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
