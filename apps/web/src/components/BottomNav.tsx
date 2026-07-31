"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/classements", label: "Classements" },
  { href: "/simulateur", label: "Simulateur" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/compte", label: "Compte" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-10 flex border-b bg-[color:var(--color-surface-raised)]"
      style={{ borderColor: "var(--color-border)" }}
    >
      {ITEMS.map((item) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 py-3 text-center text-xs font-semibold"
            style={{ color: active ? "var(--color-coral)" : "var(--color-ink-muted)" }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
