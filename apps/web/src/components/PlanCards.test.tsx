// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import fr from "@/messages/fr.json";
import { CAPABILITY_INFO } from "@kairos/shared";

// PlanCards importe SubscribeButton, qui remonte jusqu'au SDK Firebase et
// à sa validation d'environnement. Rien de tout ça n'est utile ici : ce
// qu'on teste, c'est la composition des offres.
vi.mock("@/lib/firebase/auth-context", () => ({
  useAuth: () => ({ firebaseUser: null, userDoc: null }),
}));
vi.mock("@/lib/stripe/checkout", () => ({
  isCheckoutConfigured: () => false,
  startCheckout: vi.fn(),
  CheckoutError: class extends Error {},
}));

const { PlanCards } = await import("./PlanCards");

afterEach(cleanup);

function renderWithIntl(ui: ReactNode) {
  return render(<NextIntlClientProvider locale="fr" messages={fr}>{ui}</NextIntlClientProvider>);
}

describe("PlanCards", () => {
  // Le défaut d'origine : chaque colonne listait tout ce que le plan donne.
  // Sur 21 lignes affichées, 17 étaient des doublons — les trois colonnes
  // se ressemblaient au point qu'on ne pouvait plus voir ce que Creator
  // ajoutait. C'est précisément la différence qu'on cherche à vendre.
  it("n'annonce jamais deux fois la même fonctionnalité en tête de carte", () => {
    const { container } = renderWithIntl(<PlanCards />);

    // Les listes de tête (le différentiel) sont les <ul>, hors du <details>
    // « tout ce qui vient de … » qui, lui, rappelle volontairement l'hérité.
    const headline = [...container.querySelectorAll("ul")].filter(
      (ul) => !ul.closest("details"),
    );
    const lines = headline.flatMap((ul) =>
      [...ul.querySelectorAll("li")].map((li) => li.textContent?.trim() ?? ""),
    );

    expect(lines.length).toBeGreaterThan(0);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("n’affiche pas de compteur global de fonctionnalités", () => {
    renderWithIntl(<PlanCards />);
    expect(screen.queryByText(/fonctionnalités au total|features in total/)).toBeNull();
    expect(screen.getAllByText(/Voir aussi les capacités de/).length).toBeGreaterThan(0);
  });

  // Ce test disait « il doit exister au moins une capacité à venir », ce qui
  // échouait le jour où on les livrait toutes. L'invariant utile est
  // l'inverse : toute capacité annoncée sans être livrée doit porter sa
  // mention, à l'endroit exact où elle est annoncée.
  it("marque « Bientôt disponible » sur chaque capacité non livrée, et sur aucune autre", () => {
    renderWithIntl(<PlanCards />);

    const soon = Object.values(CAPABILITY_INFO).filter((c) => c.status === "soon");
    expect(screen.queryAllByText("Bientôt disponible")).toHaveLength(
      // Une capacité à venir apparaît une fois en tête de la carte qui
      // l'ajoute ; l'hérité replié ne la répète pas.
      soon.length,
    );
  });

  it("propose au plan gratuit la seule action qui existe aujourd'hui", () => {
    renderWithIntl(<PlanCards />);
    expect(screen.getByText("Créer mon compte — 30 secondes")).toBeDefined();
    // Aucun encaissement n'est branché : aucun bouton ne doit prétendre
    // faire payer.
    expect(screen.queryByText(/Payer|Souscrire|S'abonner/)).toBeNull();
  });
});
