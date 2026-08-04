// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RankingMeta } from "./RankingMeta";

afterEach(cleanup);

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

describe("RankingMeta", () => {
  it("annonce explicitement un marché simulé", () => {
    render(<RankingMeta generatedAt={isoDaysAgo(0)} isDemo />);
    expect(screen.getByText("Marché simulé")).toBeTruthy();
    expect(screen.getByText(/n'existent pas/i)).toBeTruthy();
    // La nuance qui compte : les produits sont fictifs, pas les verdicts.
    expect(screen.getByText(/calculés pour de vrai/i)).toBeTruthy();
  });

  // La régression que ce drapeau existe pour empêcher : dix produits
  // inventés affichés comme une vraie analyse. L'avertissement doit primer
  // sur l'affichage de fraîcheur, jamais l'inverse.
  it("ne présente jamais une démo comme un classement daté ordinaire", () => {
    render(<RankingMeta generatedAt={isoDaysAgo(0)} isDemo />);
    expect(screen.queryByText(/^Calculé /)).toBeNull();
  });

  it("affiche la fraîcheur d'un classement réel récent", () => {
    render(<RankingMeta generatedAt={isoDaysAgo(1)} isDemo={false} />);
    expect(screen.getByText(/hier/)).toBeTruthy();
  });

  it("signale un classement périmé au lieu d'une date discrète", () => {
    render(<RankingMeta generatedAt={isoDaysAgo(9)} isDemo={false} />);
    expect(screen.getByText(/il y a 9 jours/)).toBeTruthy();
    expect(screen.getByText(/pas été mis à jour/i)).toBeTruthy();
  });

  it("n'affiche rien quand la date est inconnue", () => {
    const { container } = render(
      <RankingMeta generatedAt={null} isDemo={false} />,
    );
    expect(container.textContent).toBe("");
  });
});
