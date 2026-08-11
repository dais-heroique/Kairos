import { describe, expect, it } from "vitest";
import { commissionLabel, commissionShort, shortTitle } from "./product";

describe("commissionLabel", () => {
  it("dit « inconnue » quand la donnée manque, jamais « 0 % »", () => {
    // Le cœur de la régression du 2026-08-11 : `?? 0` en amont, donc un
    // zéro qui signifie « pas collecté » et non « le vendeur ne reverse
    // rien ».
    expect(commissionLabel(0)).toBe("commission inconnue");
    expect(commissionLabel(null)).toBe("commission inconnue");
    expect(commissionLabel(undefined)).toBe("commission inconnue");
  });

  it("affiche le taux quand il existe", () => {
    expect(commissionLabel(22)).toBe("22 % de commission");
  });
});

describe("commissionShort", () => {
  it("tient dans une ligne serrée sans mentir", () => {
    expect(commissionShort(22)).toBe("22 %");
    expect(commissionShort(0)).toBe("—");
  });
});

describe("shortTitle", () => {
  it("laisse intact ce qui tient déjà", () => {
    expect(shortTitle("Gua sha quartz rose")).toBe("Gua sha quartz rose");
  });

  it("coupe sur un mot entier, pas au milieu", () => {
    const long =
      "JLab JBuds Lux ANC Wireless Bluetooth Headphones Over Ear with Cloud Foam Cushions";
    const result = shortTitle(long);
    expect(result.length).toBeLessThanOrEqual(49);
    expect(result.endsWith("…")).toBe(true);
    // Pas de mot amputé : le caractère avant les points de suspension
    // termine un mot présent dans l'original.
    expect(long.startsWith(result.slice(0, -1))).toBe(true);
    expect(result).not.toMatch(/\s…$/);
  });

  it("coupe net un mot unique interminable, plutôt que tout garder", () => {
    const result = shortTitle("A".repeat(80), 20);
    expect(result).toBe(`${"A".repeat(20)}…`);
  });

  it("ne laisse pas de ponctuation orpheline avant les points", () => {
    expect(shortTitle("Sérum niacinamide 10 %, format voyage, 30 ml", 26)).toBe(
      "Sérum niacinamide 10 %…",
    );
  });
});
