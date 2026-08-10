import { describe, expect, it } from "vitest";
import {
  appendArchiveDay,
  dayAt,
  EMPTY_ARCHIVE,
  movesSince,
  rankTrend,
  type ArchiveDay,
  type RankingArchive,
} from "./archive";

function day(date: string, products: string[], saturation: Record<string, number> = {}): ArchiveDay {
  return { date, products, opportunities: [...products].reverse(), saturation };
}

function archiveOf(...days: ArchiveDay[]): RankingArchive {
  return days.reduce(
    (acc, d) => appendArchiveDay(acc, d, Object.fromEntries(d.products.map((id) => [id, { title: id.toUpperCase() }]))),
    EMPTY_ARCHIVE,
  );
}

describe("appendArchiveDay", () => {
  // Relancer le pipeline deux fois le même jour ne doit pas empiler deux
  // entrées : sinon « il y a 7 jours » ne veut plus rien dire dès le
  // deuxième passage.
  it("remplace la journée du jour au lieu de l'empiler", () => {
    const a = appendArchiveDay(EMPTY_ARCHIVE, day("2026-08-08", ["a", "b"]), {});
    const b = appendArchiveDay(a, day("2026-08-08", ["b", "a"]), {});

    expect(b.days).toHaveLength(1);
    expect(b.days[0]!.products).toEqual(["b", "a"]);
  });

  it("garde les jours triés du plus ancien au plus récent", () => {
    let archive = appendArchiveDay(EMPTY_ARCHIVE, day("2026-08-08", ["a"]), {});
    archive = appendArchiveDay(archive, day("2026-08-01", ["a"]), {});
    archive = appendArchiveDay(archive, day("2026-08-05", ["a"]), {});

    expect(archive.days.map((d) => d.date)).toEqual(["2026-08-01", "2026-08-05", "2026-08-08"]);
  });

  it("ne conserve que la fenêtre demandée, en jetant le plus ancien", () => {
    let archive = EMPTY_ARCHIVE;
    for (let i = 1; i <= 6; i++) {
      archive = appendArchiveDay(archive, day(`2026-08-0${i}`, ["a"]), {}, 3);
    }

    expect(archive.days.map((d) => d.date)).toEqual(["2026-08-04", "2026-08-05", "2026-08-06"]);
  });

  // Un produit sorti du classement garde son titre : sans ça, les journées
  // passées où il figurait deviendraient illisibles — or c'est exactement ce
  // qu'on vient chercher dans une archive.
  it("conserve le libellé d'un produit disparu du classement", () => {
    let archive = appendArchiveDay(EMPTY_ARCHIVE, day("2026-08-01", ["a"]), {
      a: { title: "Sérum" },
    });
    archive = appendArchiveDay(archive, day("2026-08-02", ["b"]), { b: { title: "Gourde" } });

    expect(archive.labels.a?.title).toBe("Sérum");
    expect(archive.labels.b?.title).toBe("Gourde");
  });
});

describe("rankTrend", () => {
  it("donne le rang jour par jour", () => {
    const archive = archiveOf(
      day("2026-08-01", ["x", "y", "cible"]),
      day("2026-08-02", ["cible", "x", "y"]),
    );

    expect(rankTrend(archive, "cible").map((p) => p.rank)).toEqual([3, 1]);
  });

  // « Absent » et « dernier » sont deux choses différentes. Les confondre
  // dessinerait une chute qui n'a pas eu lieu.
  it("distingue un produit absent d'un produit mal classé", () => {
    const archive = archiveOf(day("2026-08-01", ["x"]), day("2026-08-02", ["x", "cible"]));

    expect(rankTrend(archive, "cible").map((p) => p.rank)).toEqual([null, 2]);
  });

  it("suit aussi le classement opportunités", () => {
    const archive = archiveOf(day("2026-08-01", ["a", "b"]));
    // `opportunities` est l'inverse de `products` dans ce jeu de test.
    expect(rankTrend(archive, "a", "opportunities")[0]!.rank).toBe(2);
  });
});

describe("movesSince", () => {
  const archive = archiveOf(
    day("2026-08-01", ["p1", "p2", "p3", "p4"], { p1: 10, p2: 20, p4: 30 }),
    day("2026-08-08", ["p4", "p1", "p3", "p2"], { p1: 12, p2: 55, p4: 34 }),
  );

  it("compte une remontée en positions gagnées", () => {
    const moves = movesSince(archive, "2026-08-01", ["p4"]);
    // 4e → 1er : trois places gagnées.
    expect(moves[0]).toMatchObject({ productId: "p4", from: 4, to: 1, delta: 3 });
  });

  it("compte une descente en positions perdues", () => {
    const moves = movesSince(archive, "2026-08-01", ["p2"]);
    expect(moves[0]).toMatchObject({ from: 2, to: 4, delta: -2 });
  });

  // C'est le signal qui compte pour les alertes : la place se remplit.
  it("remonte la hausse de concurrence", () => {
    const moves = movesSince(archive, "2026-08-01", ["p2"]);
    expect(moves[0]!.saturationDelta).toBe(35);
  });

  it("classe les mouvements les plus francs d'abord", () => {
    const moves = movesSince(archive, "2026-08-01", ["p2", "p4", "p1"]);
    expect(Math.abs(moves[0]!.delta!)).toBeGreaterThanOrEqual(Math.abs(moves[1]!.delta!));
  });

  it("porte le libellé, pas seulement l'identifiant", () => {
    expect(movesSince(archive, "2026-08-01", ["p1"])[0]!.title).toBe("P1");
  });

  it("ne compare rien quand il n'y a qu'une seule journée", () => {
    const seul = archiveOf(day("2026-08-08", ["p1"]));
    expect(movesSince(seul, "2026-08-01", ["p1"])).toEqual([]);
  });

  it("écarte un produit qu'on ne sait pas comparer", () => {
    expect(movesSince(archive, "2026-08-01", ["inconnu"])).toEqual([]);
  });
});

describe("dayAt", () => {
  const archive = archiveOf(day("2026-08-01", ["a"]), day("2026-08-05", ["b"]));

  it("prend la journée demandée quand elle existe", () => {
    expect(dayAt(archive, "2026-08-05")?.date).toBe("2026-08-05");
  });

  it("recule à la journée précédente plutôt que d'inventer", () => {
    expect(dayAt(archive, "2026-08-04")?.date).toBe("2026-08-01");
  });

  it("ne renvoie rien avant le début de l'archive", () => {
    expect(dayAt(archive, "2026-07-30")).toBeNull();
  });
});
