"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCoin,
  IconGauge,
  IconPackage,
  IconPipeline,
  IconRanking,
  Logo,
} from "@/components/icons";

// Barre de navigation unique de l'app connectée.
//
// Elle porte mal son nom (elle est en `sticky top-0`), mais 7 pages
// l'importent — la renommer demanderait de toutes les toucher pour un
// gain nul. AppShell s'appuie dessus plutôt que d'en redéfinir une
// seconde : avoir deux barres différentes selon la page était précisément
// le défaut à corriger (les classements en indigo large, le reste en
// corail étroit).
//
// L'indigo marque l'état sélectionné ; le corail reste réservé à l'action
// et à l'urgence (verdicts, boutons primaires), sinon un onglet actif se
// lit comme une alerte.
const ITEMS = [
  { href: "/tableau-de-bord", label: "Accueil", Icon: IconPipeline },
  { href: "/classements", label: "Classements", Icon: IconRanking },
  { href: "/simulateur", label: "Simulateur", Icon: IconCoin },
  { href: "/watchlist", label: "Watchlist", Icon: IconPackage },
  { href: "/compte", label: "Compte", Icon: IconGauge },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div
      className="sticky top-0 z-20 border-b bg-[color:var(--color-surface-raised)]"
      style={{ borderColor: "var(--color-border)" }}
    >
      <nav className="kai-shell flex items-center gap-1 md:gap-4">
        <Link
          href="/tableau-de-bord"
          className="hidden shrink-0 items-center gap-2 py-3 md:flex"
        >
          <Logo className="h-6 w-6" style={{ color: "var(--color-coral)" }} />
          <span className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">
            KAIROS
          </span>
        </Link>

        <div className="flex flex-1 md:flex-none md:gap-1">
          {ITEMS.map(({ href, label, Icon }) => {
            const active = pathname?.startsWith(href) ?? false;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-1 flex-col items-center gap-1 rounded-lg py-2.5 text-[0.7rem] font-semibold transition-colors md:flex-none md:flex-row md:gap-2 md:px-3 md:py-3.5 md:text-sm"
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
  );
}
