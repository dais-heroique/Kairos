// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import fr from "@/messages/fr.json";
import { EstimatedValue } from "./EstimatedValue";

afterEach(cleanup);

function renderWithIntl(ui: ReactNode) {
  return render(<NextIntlClientProvider locale="fr" messages={fr}>{ui}</NextIntlClientProvider>);
}

describe("EstimatedValue", () => {
  it("affiche la fourchette et la confiance d'une estimation normale", () => {
    renderWithIntl(
      <EstimatedValue
        range={{ low: 120, high: 260, confidence: 0.8, method: "historical_regression" }}
      />,
    );
    expect(screen.getByText("120–260")).toBeTruthy();
    expect(screen.getByText("(fiable)")).toBeTruthy();
  });

  // Le contresens à éviter : « 0–0 » se lit « ce produit ne rapporte rien »
  // alors que la vraie information est « on ne sait pas ». C'est exactement
  // ce qui s'affichait sur tout le classement quand le profil créateur
  // n'avait pas de vues moyennes renseignées.
  it("n'affiche jamais 0–0 quand l'estimation est impossible", () => {
    renderWithIntl(
      <EstimatedValue
        range={{ low: 0, high: 0, confidence: 0, method: "insufficient_data" }}
      />,
    );
    expect(screen.queryByText("0–0")).toBeNull();
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByText("(données insuffisantes)")).toBeTruthy();
  });

  it("applique le format fourni", () => {
    renderWithIntl(
      <EstimatedValue
        range={{ low: 12, high: 30, confidence: 0.5, method: "manual_entry" }}
        format={(v) => `${v}€`}
      />,
    );
    expect(screen.getByText("12€–30€")).toBeTruthy();
    expect(screen.getByText("(à confirmer)")).toBeTruthy();
  });
});
