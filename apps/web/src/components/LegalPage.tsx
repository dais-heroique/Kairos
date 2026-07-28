import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col gap-4 px-5 py-8 sm:max-w-2xl">
      <Link
        href="/"
        className="text-sm font-medium underline"
        style={{ color: "var(--color-coral)" }}
      >
        ← Retour
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
        {title}
      </h1>
      <p className="text-xs text-[color:var(--color-ink-muted)]">
        Dernière mise à jour : {updatedAt}
      </p>
      <div className="flex flex-col gap-4 text-sm leading-relaxed [&_h2]:mt-4 [&_h2]:font-[family-name:var(--font-display)] [&_h2]:text-base [&_h2]:font-bold [&_strong]:font-semibold">
        {children}
      </div>
    </main>
  );
}
