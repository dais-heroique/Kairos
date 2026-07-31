"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { RequireAuth } from "@/components/RequireAuth";

const CATEGORIES = [
  { slug: "produits", label: "Produits" },
  { slug: "boutiques", label: "Boutiques" },
  { slug: "createurs", label: "Créateurs" },
  { slug: "videos", label: "Vidéos" },
  { slug: "sons", label: "Sons" },
  { slug: "categories", label: "Catégories" },
  { slug: "nouveautes", label: "Nouveautés" },
  { slug: "vagues", label: "Vagues" },
  { slug: "opportunites", label: "Opportunités" },
] as const;

export default function ClassementsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <RequireAuth>
      <div className="flex min-h-dvh flex-col">
        <BottomNav />

        <header className="px-5 pt-6 pb-2">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
            Classements
          </h1>
        </header>

        <div
          className="flex gap-2 overflow-x-auto border-b px-5 pb-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          {CATEGORIES.map((cat) => {
            const href = `/classements/${cat.slug}`;
            const active = pathname === href;
            return (
              <Link
                key={cat.slug}
                href={href}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold"
                style={
                  active
                    ? {
                        backgroundColor: "var(--color-coral)",
                        color: "var(--color-coral-ink)",
                      }
                    : {
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-ink-muted)",
                      }
                }
              >
                {cat.label}
              </Link>
            );
          })}
        </div>

        <div className="flex-1 px-5 py-4">{children}</div>
      </div>
    </RequireAuth>
  );
}
