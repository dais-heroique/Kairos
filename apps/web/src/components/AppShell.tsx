"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconCoin, IconGauge, IconPackage, IconRanking, Logo } from "@/components/icons";

// Coquille commune aux pages connectées. Remplace BottomNav, qui portait mal
// son nom (il était en `sticky top-0`) et n'offrait que quatre liens en
// text-xs sur toute la largeur de l'écran, sans repère de marque ni
// conteneur — le contenu s'étirait bord à bord au-delà de 1200px.
//
// Mobile : barre compacte icône + libellé. Desktop (≥768px) : le logo passe
// à gauche et la navigation se met en ligne, dans un conteneur centré.

const NAV_ITEMS = [
  { href: "/classements", label: "Classements", Icon: IconRanking },
  { href: "/simulateur", label: "Simulateur", Icon: IconCoin },
  { href: "/watchlist", label: "Watchlist", Icon: IconPackage },
  { href: "/compte", label: "Compte", Icon: IconGauge },
] as const;

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
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col">
      <div
        className="sticky top-0 z-20 border-b bg-[color:var(--color-surface-raised)]"
        style={{ borderColor: "var(--color-border)" }}
      >
        <nav className="kai-shell flex items-center gap-1 md:gap-6">
          <Link
            href="/classements"
            className="hidden shrink-0 items-center gap-2 py-3 md:flex"
          >
            <Logo className="h-6 w-6" style={{ color: "var(--color-coral)" }} />
            <span className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">
              KAIROS
            </span>
          </Link>

          <div className="flex flex-1 md:gap-1">
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const active = pathname?.startsWith(href) ?? false;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.7rem] font-semibold md:flex-none md:flex-row md:gap-2 md:px-3 md:py-3.5 md:text-sm"
                  style={{
                    color: active ? "var(--color-accent)" : "var(--color-ink-muted)",
                  }}
                >
                  <Icon className="h-5 w-5 md:h-4 md:w-4" />
                  {label}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                      style={{ backgroundColor: "var(--color-accent)" }}
                    />
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {header}

      <main className="kai-shell flex-1 py-4 md:py-6">{children}</main>
    </div>
  );
}
