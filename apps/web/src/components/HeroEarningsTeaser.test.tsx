// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import fr from "@/messages/fr.json";
import { HeroEarningsTeaser } from "./HeroEarningsTeaser";

afterEach(cleanup);

function renderHero() {
  return render(
    <NextIntlClientProvider locale="fr" messages={fr}>
      <HeroEarningsTeaser />
    </NextIntlClientProvider>,
  );
}

// La fourchette est rendue par <EstimatedValue> ; « € » apparaît aussi
// dans le texte explicatif, d'où la sélection sur le motif « x €–y € »
// plutôt que sur le symbole seul.
function lowEuro(): number {
  const text = screen.getByText(/€\s*–/).textContent!;
  return Number(text.split("–")[0]!.replace(/[^\d]/g, ""));
}

describe("HeroEarningsTeaser", () => {
  it("affiche une fourchette et sa confiance, jamais un chiffre seul", () => {
    renderHero();
    expect(screen.getByText(/–/)).toBeTruthy();
    expect(screen.getByText(/\((fiable|à confirmer|peu fiable)\)/)).toBeTruthy();
  });

  // Le geste qui doit convertir : bouger le curseur et voir son propre
  // chiffre monter.
  it("augmente le gain quand on monte les vues", () => {
    const { container } = renderHero();
    const before = lowEuro();
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "7" } });
    expect(lowEuro()).toBeGreaterThan(before);
  });

  it("annonce le nombre de vues choisi", () => {
    const { container } = renderHero();
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "0" } });
    expect(screen.getByText(/1[\s ]?000/)).toBeTruthy();
  });
});
