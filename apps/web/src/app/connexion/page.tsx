"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import {
  sendEmailSignInLink,
  signInWithApple,
  signInWithGoogle,
} from "@/lib/firebase/auth";
import { useAuth } from "@/lib/firebase/auth-context";

export default function ConnexionPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const { firebaseUser, userDoc, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [providerError, setProviderError] = useState<string | null>(null);

  useEffect(() => {
    setIsSignup(new URLSearchParams(window.location.search).get("mode") === "signup");
  }, []);

  useEffect(() => {
    if (loading || !firebaseUser || !userDoc) return;
    router.replace(
      userDoc.profile.onboardingCompletedAt ? "/tableau-de-bord" : "/onboarding/niches",
    );
  }, [loading, firebaseUser, userDoc, router]);

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    try {
      await sendEmailSignInLink(email);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  async function handleGoogle() {
    setProviderError(null);
    try {
      await signInWithGoogle();
    } catch {
      setProviderError(t("errorGeneric"));
    }
  }

  async function handleApple() {
    setProviderError(null);
    try {
      await signInWithApple();
    } catch {
      setProviderError(t("errorGeneric"));
    }
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="px-5 pt-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight"
        >
          KAIROS
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center gap-6 px-5 py-8 sm:max-w-md">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold">
          {isSignup ? t("signupTitle") : t("title")}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          {isSignup ? t("signupSubtitle") : t("subtitle")}
        </p>
      </div>

      {status === "sent" ? (
        <div
          className="kai-card relative border-l-4"
          style={{ borderColor: "var(--color-success)" }}
        >
          <p className="font-semibold" style={{ color: "var(--color-success)" }}>
            {t("linkSentTitle")}
          </p>
          <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
            {t("linkSentBody", { email })}
          </p>
        </div>
      ) : (
        <form onSubmit={handleEmailSubmit} className="relative flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t("emailLabel")}
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("emailPlaceholder")}
              className="kai-input"
            />
          </label>
          <button
            type="submit"
            disabled={status === "sending"}
            className="kai-btn-primary"
          >
            {status === "sending"
              ? t("sendingLink")
              : isSignup
                ? t("signupSendLinkButton")
                : t("sendLinkButton")}
          </button>
          {status === "error" && (
            <p className="text-sm font-medium" style={{ color: "var(--color-coral)" }}>
              {t("errorGeneric")}
            </p>
          )}
        </form>
      )}

      <div className="relative flex items-center gap-3 text-xs font-medium text-[color:var(--color-ink-muted)]">
        <span className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
        {t("orDivider")}
        <span className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
      </div>

      <div className="relative flex flex-col gap-2">
        <button type="button" onClick={handleGoogle} className="kai-btn-outline">
          {t("googleButton")}
        </button>
        <button type="button" onClick={handleApple} className="kai-btn-outline">
          {t("appleButton")}
        </button>
        {providerError && (
          <p className="text-sm font-medium" style={{ color: "var(--color-coral)" }}>
            {providerError}
          </p>
        )}
      </div>
      </div>
    </main>
  );
}
