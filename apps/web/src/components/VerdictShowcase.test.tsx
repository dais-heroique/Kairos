// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { computeVerdict } from "@kairos/core";
import { buildScenarioSnapshots, SCENARIO_PRESETS } from "@/lib/demo/scenario";
import { VerdictShowcase } from "./VerdictShowcase";

afterEach(cleanup);

describe("VerdictShowcase", () => {
  // La section s'intitule « Quatre réponses claires ». Si un réglage du
  // moteur faisait tomber deux situations sur le même verdict, la page
  // continuerait à l'afficher en n'en montrant que trois — sans que rien
  // ne le signale. C'est le seul vrai invariant de cette section.
  it("les quatre situations donnent bien quatre verdicts différents", () => {
    const verdicts = SCENARIO_PRESETS.map(
      (preset) => computeVerdict(buildScenarioSnapshots(preset.params)).verdict,
    );

    expect(new Set(verdicts).size).toBe(4);
  });

  it("affiche un onglet par situation, chacun portant son verdict", () => {
    render(<VerdictShowcase />);
    const tabs = screen.getAllByRole("tab");

    expect(tabs).toHaveLength(SCENARIO_PRESETS.length);
    for (const preset of SCENARIO_PRESETS) {
      expect(screen.getAllByRole("tab", { name: new RegExp(preset.label) }).length).toBeGreaterThan(0);
    }
  });

  it("montre le raisonnement du moteur, pas seulement la pastille", () => {
    render(<VerdictShowcase />);
    const expected = computeVerdict(buildScenarioSnapshots(SCENARIO_PRESETS[0]!.params));

    // Le raisonnement affiché est celui que le moteur vient de produire —
    // pas un texte de vitrine écrit à côté.
    for (const line of expected.reasoning) {
      expect(screen.getByText(line)).toBeDefined();
    }
  });

  it("change de panneau quand on tape une autre situation", () => {
    render(<VerdictShowcase />);
    const first = SCENARIO_PRESETS[0]!;
    const second = SCENARIO_PRESETS[1]!;

    // Le raisonnement est ce qui distingue vraiment les deux panneaux : le
    // libellé de situation, lui, apparaît aussi sur son onglet, et « La
    // pépite » partage son sous-titre avec le libellé de phase.
    const firstReasoning = computeVerdict(buildScenarioSnapshots(first.params)).reasoning;
    const secondReasoning = computeVerdict(buildScenarioSnapshots(second.params)).reasoning;

    for (const line of firstReasoning) expect(screen.getByText(line)).toBeDefined();

    fireEvent.click(screen.getByRole("tab", { name: new RegExp(second.label) }));

    for (const line of secondReasoning) expect(screen.getByText(line)).toBeDefined();
    for (const line of firstReasoning) expect(screen.queryByText(line)).toBeNull();
  });
});
