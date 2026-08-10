import { describe, expect, it } from "vitest";
import type { ProductRankItem } from "@/types/product-rank-item";
import { csvCell, rankingToCsv, toCsv } from "./export-csv";

function item(overrides: Partial<ProductRankItem> = {}): ProductRankItem {
  return {
    id: "p1",
    rank: 1,
    title: "Sérum niacinamide 10 %",
    shopName: "GlowLab Paris",
    priceCents: 1690,
    verdict: "entrer_maintenant",
    salesTrend: "up",
    commissionRatePct: 28,
    saturationScore: 20,
    windowDaysLow: 52,
    windowDaysHigh: 104,
    soldTotal: 4210,
    snapshotCount: 12,
    ...overrides,
  };
}

describe("csvCell", () => {
  // Les titres de produits contiennent des virgules et des guillemets. Sans
  // échappement, une seule virgule décale toute la ligne — et le tableau
  // devient faux en silence.
  it("protège les séparateurs et les guillemets", () => {
    expect(csvCell("Huile de ricin, 30 ml")).toBe('"Huile de ricin, 30 ml"');
    expect(csvCell('Coque 6,1"')).toBe('"Coque 6,1"""');
    expect(csvCell("ligne1\nligne2")).toBe('"ligne1\nligne2"');
  });

  it("laisse passer un texte simple", () => {
    expect(csvCell("Sérum")).toBe("Sérum");
    expect(csvCell(42)).toBe("42");
  });

  // Une donnée absente reste vide : dans un tableur, un 0 se moyenne et se
  // somme, et transformerait « on ne sait pas » en « ça ne rapporte rien ».
  it("laisse vide une donnée absente au lieu d'écrire zéro", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
});

describe("toCsv", () => {
  it("sépare par point-virgule — Excel en français lit la virgule comme décimale", () => {
    const csv = toCsv([
      ["a", "b"],
      [1, 2],
    ]);
    expect(csv).toContain("a;b");
    expect(csv).toContain("1;2");
  });

  it("commence par un BOM, sans quoi Excel affiche « SÃ©rum »", () => {
    expect(toCsv([["Sérum"]]).charCodeAt(0)).toBe(0xfeff);
  });
});

describe("rankingToCsv", () => {
  it("écrit un en-tête lisible et une ligne par produit", () => {
    const csv = rankingToCsv([item(), item({ id: "p2", rank: 2, title: "Gourde" })]);
    const lignes = csv.split("\r\n");

    expect(lignes[0]).toContain("Rang;Produit;Boutique");
    expect(lignes).toHaveLength(3);
    expect(lignes[2]).toContain("Gourde");
  });

  it("écrit le prix à la française", () => {
    expect(rankingToCsv([item({ priceCents: 1690 })])).toContain("16,90");
  });

  // 0 % n'est pas une commission mesurée, c'est une absence. La cellule
  // reste vide, comme l'écran affiche « commission inconnue ».
  it("laisse la commission vide quand elle n'est pas renseignée", () => {
    const ligne = rankingToCsv([item({ commissionRatePct: 0 })]).split("\r\n")[1]!;
    expect(ligne).not.toContain(";0;");
  });

  it("laisse vides les champs d'analyse absents", () => {
    const csv = rankingToCsv([
      {
        id: "p9",
        rank: 9,
        title: "Sans analyse",
        shopName: "Boutique",
        priceCents: 1000,
        verdict: "risque",
        salesTrend: "flat",
        commissionRatePct: 0,
      },
    ]);
    // Le prix est entre guillemets parce qu'il contient une virgule : le
    // séparateur est le point-virgule, mais protéger la virgule garde le
    // fichier lisible par un outil qui, lui, sépare sur la virgule.
    expect(csv.split("\r\n")[1]).toBe('9;Sans analyse;Boutique;"10,00";;Risque;;;;;');
  });

  it("traduit le verdict en français lisible", () => {
    expect(rankingToCsv([item({ verdict: "eviter" })])).toContain("Éviter");
  });
});
