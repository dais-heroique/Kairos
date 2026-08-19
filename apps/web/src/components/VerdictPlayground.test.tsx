// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { VerdictPlayground } from "./VerdictPlayground";

afterEach(cleanup);

describe("VerdictPlayground", () => {
  it("démarre sur un préréglage jouable", () => {
    render(<VerdictPlayground />);
    expect(screen.getAllByText("Entrer maintenant").length).toBeGreaterThan(0);
  });

  // L'intérêt de la page tient entièrement là : taper une situation
  // change le verdict à l'écran, sans rechargement ni lecture.
  it("change de verdict quand on tape une autre situation", () => {
    render(<VerdictPlayground />);
    fireEvent.click(screen.getByRole("button", { name: /Surveiller/ }));
    const livePanel = document.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(within(livePanel).queryByText("Entrer maintenant")).toBeNull();
    expect(within(livePanel).getByText("Éviter")).toBeTruthy();
  });

  it("recalcule en poussant le curseur de concurrence", () => {
    const { container } = render(<VerdictPlayground />);
    expect(screen.getAllByText("Entrer maintenant").length).toBeGreaterThan(0);
    const shopsSlider = container.querySelectorAll('input[type="range"]')[2] as HTMLInputElement;
    fireEvent.change(shopsSlider, { target: { value: "40" } });
    expect(within(document.querySelector('[aria-live="polite"]') as HTMLElement).queryByText("Entrer maintenant")).toBeNull();
  });

  it("affiche le raisonnement, pas seulement la note", () => {
    render(<VerdictPlayground />);
    // Formulé en français courant, sans « saturation » ni « phase » —
    // ces mots ne disent rien à quelqu'un qui débute.
    expect(screen.getByText(/Concurrence : \d+ sur 100/)).toBeTruthy();
    expect(screen.getByText(/les ventes ont (augmenté|baissé) de/)).toBeTruthy();
  });

  // La fenêtre de tir est une estimation : elle ne peut pas s'afficher
  // sans sa confiance (règle produit n°1).
  it("montre la fenêtre restante avec son niveau de confiance", () => {
    render(<VerdictPlayground />);
    expect(screen.getByText(/Il te reste environ/)).toBeTruthy();
    expect(screen.getByText(/\((fiable|à confirmer|peu fiable)\)/)).toBeTruthy();
  });
});
