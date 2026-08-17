"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/icons";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";

// Barre des pages publiques — accueil, méthode, tarifs.
//
// Le problème qu'elle résout : `/methode` est la page la plus convaincante
// du site (le vrai moteur y tourne en direct dans le navigateur du
// visiteur), et **aucun lien de l'accueil n'y menait**. Elle était dans le
// `sitemap.xml`, donc Google la trouvait ; un humain, non. Sur les 11 liens
// de la page d'accueil, 3 pointaient vers `/connexion`, 1 vers `/tarifs` et
// 6 vers les mentions légales.
//
// Même conteneur (`kai-shell`) que la coquille de l'app : la barre garde la
// même largeur et le même alignement avant et après connexion.

const LINKS = [
  { href: "/methode", label: "method" },
  { href: "/tarifs", label: "pricing" },
] as const;

export function PublicNav() {
  const pathname = usePathname();
  const t = useTranslations("Nav");

  return (
    <nav className="sticky top-0 z-20 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
      <div className="kai-shell flex items-center justify-between gap-3 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Logo className="h-6 w-6" style={{ color: "var(--color-coral)" }} />
          <span className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">
            KAIROS
          </span>
        </Link>

        {/* Les deux liens de contenu restent visibles sur téléphone : c'est
            tout l'intérêt de la barre. Ils rétrécissent au lieu de passer
            dans un menu — à deux entrées, un menu déroulant coûterait un
            geste pour rien. */}
        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className="rounded-lg px-2 py-1.5 text-[13px] font-semibold whitespace-nowrap sm:px-3 sm:text-sm"
                style={{
                  color: active ? "var(--color-accent)" : "var(--color-ink-muted)",
                }}
              >
                {t(link.label)}
              </Link>
            );
          })}
          <Link
            href="/connexion"
            className="rounded-lg px-2.5 py-1.5 text-[13px] font-bold whitespace-nowrap sm:px-3.5 sm:text-sm"
            style={{
              backgroundColor: "var(--color-coral)",
              color: "var(--color-coral-ink)",
            }}
          >
            {t("start")}
          </Link>
        </div>
      </div>
    </nav>
  );
}
