"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/firebase/auth-context";

function RedirectIfOnboarded({ children }: { children: ReactNode }) {
  const { userDoc } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (userDoc?.profile.onboardingCompletedAt) {
      router.replace("/classements");
    }
  }, [userDoc, router]);

  if (userDoc?.profile.onboardingCompletedAt) return null;

  return <>{children}</>;
}

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RequireAuth>
      <RedirectIfOnboarded>{children}</RedirectIfOnboarded>
    </RequireAuth>
  );
}
