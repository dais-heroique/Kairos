"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { deleteCurrentUserAccount, signOutUser } from "@/lib/firebase/auth";
import { useAuth } from "@/lib/firebase/auth-context";
import { deleteOwnUserData, exportOwnData } from "@/lib/firestore/user";
import { redeemInviteCode } from "@/lib/firestore/invite-codes";

function AccountContent() {
  const t = useTranslations("Account");
  const router = useRouter();
  const { firebaseUser, userDoc } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteStatus, setInviteStatus] = useState<
    "idle" | "applying" | "success" | "error"
  >("idle");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  async function handleRedeemInvite(event: FormEvent) {
    event.preventDefault();
    if (!firebaseUser || !inviteCodeInput.trim()) return;
    setInviteStatus("applying");
    setInviteMessage(null);
    try {
      const result = await redeemInviteCode(inviteCodeInput.trim(), firebaseUser.uid);
      if (result.ok) {
        setInviteStatus("success");
        setInviteMessage(t("inviteSuccess", { days: result.trialDays }));
      } else {
        setInviteStatus("error");
        const key =
          result.reason === "already_applied"
            ? "inviteAlreadyApplied"
            : result.reason === "inactive"
              ? "inviteInactive"
              : result.reason === "exhausted"
                ? "inviteExhausted"
                : "inviteInvalid";
        setInviteMessage(t(key));
      }
    } catch {
      setInviteStatus("error");
      setInviteMessage(t("errorGeneric"));
    }
  }

  async function handleExport() {
    if (!firebaseUser) return;
    setExporting(true);
    setError(null);
    try {
      const data = await exportOwnData(firebaseUser.uid);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "kairos-mes-donnees.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!firebaseUser) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteOwnUserData(firebaseUser.uid);
      await deleteCurrentUserAccount();
      router.replace("/connexion");
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(
        code === "auth/requires-recent-login"
          ? t("errorRequiresRecentLogin")
          : t("errorGeneric"),
      );
      setDeleting(false);
    }
  }

  async function handleSignOut() {
    await signOutUser();
    router.replace("/connexion");
  }

  return (
    <AppShell>
    {/* Colonne volontairement plus étroite que la coquille : au-delà d'une
        soixantaine de caractères, les libellés de réglages et les blocs de
        texte légal deviennent pénibles à lire. */}
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
          {t("title")}
        </h1>
        {firebaseUser?.email && (
          <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
            {t("signedInAs", { email: firebaseUser.email })}
          </p>
        )}
        {userDoc?.plan.slug && (
          <span
            className="mt-2 inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase"
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-ink-muted)",
              border: "1px solid var(--color-border)",
            }}
          >
            {userDoc.plan.slug}
          </span>
        )}
        {userDoc?.role === "admin" && (
          <a
            href="/admin"
            className="mt-3 block text-sm font-semibold underline"
            style={{ color: "var(--color-coral)" }}
          >
            {t("adminLink")}
          </a>
        )}
      </div>

      <button type="button" onClick={handleSignOut} className="kai-btn-outline">
        {t("signOutButton")}
      </button>

      {!userDoc?.appliedInviteCode && (
        <section className="kai-card flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] font-bold">
            {t("inviteTitle")}
          </h2>
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            {t("inviteBody")}
          </p>
          <form onSubmit={handleRedeemInvite} className="mt-2 flex flex-col gap-2">
            <input
              value={inviteCodeInput}
              onChange={(event) =>
                setInviteCodeInput(event.target.value.toUpperCase())
              }
              placeholder={t("invitePlaceholder")}
              className="kai-input w-full font-[family-name:var(--font-mono)] uppercase"
            />
            <button
              type="submit"
              disabled={inviteStatus === "applying"}
              className="kai-btn-outline"
            >
              {inviteStatus === "applying"
                ? t("inviteApplyingButton")
                : t("inviteButton")}
            </button>
          </form>
          {inviteMessage && (
            <p
              className="text-sm font-medium"
              style={{
                color:
                  inviteStatus === "success"
                    ? "var(--color-success)"
                    : "var(--color-coral)",
              }}
            >
              {inviteMessage}
            </p>
          )}
        </section>
      )}

      <section
        className="kai-card flex flex-col gap-2 border-l-4"
        style={{ borderColor: "var(--color-success)" }}
      >
        <h2 className="font-[family-name:var(--font-display)] font-bold">
          {t("exportTitle")}
        </h2>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          {t("exportBody")}
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="kai-btn-outline mt-2 disabled:opacity-50"
        >
          {exporting ? t("exportingButton") : t("exportButton")}
        </button>
      </section>

      <section
        className="kai-card flex flex-col gap-2 border-l-4"
        style={{ borderColor: "var(--color-coral)" }}
      >
        <h2
          className="font-[family-name:var(--font-display)] font-bold"
          style={{ color: "var(--color-coral)" }}
        >
          {t("deleteTitle")}
        </h2>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          {t("deleteBody")}
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-2 rounded-xl border-2 px-3 py-2 font-semibold"
            style={{ borderColor: "var(--color-coral)", color: "var(--color-coral)" }}
          >
            {t("deleteButton")}
          </button>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-sm font-medium">{t("deleteConfirmPrompt")}</p>
            <input
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={t("deleteConfirmPlaceholder")}
              className="kai-input"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="kai-btn-outline flex-1"
              >
                {t("cancelButton")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirmText !== "SUPPRIMER" || deleting}
                className="flex-1 rounded-xl px-3 py-2 font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--color-coral)" }}
              >
                {t("deleteConfirmButton")}
              </button>
            </div>
          </div>
        )}
      </section>

      {error && (
        <p className="text-sm font-medium" style={{ color: "var(--color-coral)" }}>
          {error}
        </p>
      )}
    </main>
    </AppShell>
  );
}

export default function ComptePage() {
  return (
    <RequireAuth>
      <AccountContent />
    </RequireAuth>
  );
}
