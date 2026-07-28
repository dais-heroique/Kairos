"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import {
  completeEmailSignIn,
  getStoredEmailForSignIn,
  isEmailSignInLink,
} from "@/lib/firebase/auth";
import { useAuth } from "@/lib/firebase/auth-context";

type Status = "completing" | "needsEmail" | "invalidLink" | "error";

export default function VerificationPage() {
  const t = useTranslations("Verification");
  const router = useRouter();
  const { firebaseUser, userDoc, loading } = useAuth();
  const [status, setStatus] = useState<Status>("completing");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const url = window.location.href;
    if (!isEmailSignInLink(url)) {
      setStatus("invalidLink");
      return;
    }
    const storedEmail = getStoredEmailForSignIn();
    if (!storedEmail) {
      setStatus("needsEmail");
      return;
    }
    completeEmailSignIn(storedEmail, url).catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    if (loading || !firebaseUser || !userDoc) return;
    router.replace(
      userDoc.profile.onboardingCompletedAt ? "/classements" : "/onboarding/niches",
    );
  }, [loading, firebaseUser, userDoc, router]);

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await completeEmailSignIn(email, window.location.href);
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col justify-center gap-4 px-5 py-8 sm:max-w-md">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
        {t("title")}
      </h1>

      {status === "completing" && (
        <p className="text-[color:var(--color-ink-muted)]">
          {t("completingMessage")}
        </p>
      )}

      {(status === "invalidLink" || status === "error") && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium" style={{ color: "var(--color-coral)" }}>
            {t("errorInvalidLink")}
          </p>
          <Link
            href="/connexion"
            className="font-medium underline"
            style={{ color: "var(--color-coral)" }}
          >
            {t("backToLogin")}
          </Link>
        </div>
      )}

      {status === "needsEmail" && (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            {t("askEmailBody")}
          </p>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="kai-input"
          />
          <button type="submit" className="kai-btn-primary">
            {t("confirmButton")}
          </button>
        </form>
      )}
    </main>
  );
}
