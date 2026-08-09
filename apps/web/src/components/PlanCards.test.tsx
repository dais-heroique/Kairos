// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CAPABILITIES_BY_PLAN, CAPABILITY_INFO, PLANS } from "@kairos/shared";

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

describe("PlanCards", () => {
  // Le défaut d'origine : chaque colonne listait tout ce que le plan donne.
  // Sur 21 lignes affichées, 17 étaient des doublons — les trois colonnes
  // se ressemblaient au point qu'on ne pouvait plus voir ce que Creator
  // ajoutait. C'est précisément la différence qu'on cherche à vendre.
  it("n'annonce jamais deux fois la même fonctionnalité en tête de carte", () => {
    const { container } = render(<PlanCards />);

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

  it("affiche le total de chaque plan — sinon le plus cher paraît le plus pauvre", () => {
    render(<PlanCards />);

    for (const plan of PLANS) {
      const total = CAPABILITIES_BY_PLAN[plan.slug].length;
      expect(screen.getAllByText(`${total} fonctionnalités au total`).length).toBeGreaterThan(0);
    }
  });

  it("marque « pas encore là » partout où une capacité non livrée est annoncée", () => {
    render(<PlanCards />);

    const soon = Object.values(CAPABILITY_INFO).filter((c) => c.status === "soon");
    expect(soon.length).toBeGreaterThan(0);
    expect(screen.getAllByText("pas encore là").length).toBeGreaterThanOrEqual(soon.length);
  });

  it("propose au plan gratuit la seule action qui existe aujourd'hui", () => {
    render(<PlanCards />);
    expect(screen.getByText("Créer mon compte — 30 secondes")).toBeDefined();
    // Aucun encaissement n'est branché : aucun bouton ne doit prétendre
    // faire payer.
    expect(screen.queryByText(/Payer|Souscrire|S'abonner/)).toBeNull();
  });
});
