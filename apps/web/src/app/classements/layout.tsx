"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";

// Seuls les classements réellement alimentés sont proposés dans la
// navigation. Créateurs, Vidéos, Sons et Vagues sont masqués : aucune source
// gratuite ne peut les remplir (voir docs/STATE.md — l'API Creative Center
// est authentifiée, et le seul scraper de contenu qui fonctionne est
// payant). Quatre onglets vides sur neuf donnaient un produit inachevé.
//
// Rien n'est supprimé pour autant : les routes répondent toujours (un
// favori ne tombe pas en 404, la page explique quelle source manque) et le
// pipeline continue d'écrire leurs documents vides. Rendre un onglet à la
// navigation = rajouter sa ligne ici.
const CATEGORIES = [
  { slug: "produits", label: "Produits" },
  { slug: "opportunites", label: "Opportunités" },
  { slug: "boutiques", label: "Boutiques" },
  { slug: "nouveautes", label: "Nouveautés" },
  { slug: "categories", label: "Catégories" },
] as const;

export default function ClassementsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <RequireAuth>
      <AppShell
        header={
          <div
            className="border-b bg-[color:var(--color-surface-raised)]"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="kai-shell pt-5">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight md:text-3xl">
                Classements
              </h1>

              {/* Onglets plutôt que pastilles pleines : à neuf entrées, une
                  rangée de pastilles corail saturait la page et entrait en
                  concurrence avec les badges de verdict. Le soulignement
                  indigo suffit à marquer l'actif. */}
              <div className="-mb-px flex gap-1 overflow-x-auto pt-3">
                {CATEGORIES.map((cat) => {
                  const href = `/classements/${cat.slug}`;
                  const active = pathname === href;
                  return (
                    <Link
                      key={cat.slug}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className="shrink-0 border-b-2 px-3 pb-2.5 text-sm font-semibold transition-colors"
                      style={{
                        borderColor: active ? "var(--color-accent)" : "transparent",
                        color: active
                          ? "var(--color-accent)"
                          : "var(--color-ink-muted)",
                      }}
                    >
                      {cat.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        }
      >
        {children}
      </AppShell>
    </RequireAuth>
  );
}
