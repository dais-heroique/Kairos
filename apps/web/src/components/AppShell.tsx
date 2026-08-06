"use client";

import type { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";

// Coquille des pages connectées : barre de navigation + bandeau de titre +
// conteneur de contenu à la bonne largeur.
//
// La barre elle-même vient de BottomNav, la seule implémentation : les
// pages qui n'utilisent pas AppShell (tableau de bord, fiche produit,
// brief) importent BottomNav directement, et il faut qu'elles aient
// exactement la même. Deux barres divergentes — indigo large ici, corail
// étroit ailleurs — était le défaut visible au changement d'onglet.

/** Bandeau de titre standard, à passer à AppShell via `header`. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      className="border-b bg-[color:var(--color-surface-raised)]"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="kai-shell flex flex-wrap items-end justify-between gap-3 py-5">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight md:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {actions}
      </div>
    </div>
  );
}

export function AppShell({
  children,
  header,
}: {
  children: ReactNode;
  /** Bandeau propre à la page (titre, onglets, réglages), collé sous la nav. */
  header?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <BottomNav />

      {header}

      <main className="kai-shell flex-1 py-4 md:py-6">{children}</main>
    </div>
  );
}
