import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Garde-fou d'archi (§2) : packages/core ne doit jamais importer Firebase.
// Entrée = tableau de snapshots, sortie = verdict — c'est ce qui rend le
// cerveau du produit testable sans émulateurs.
function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      return [full];
    }
    return [];
  });
}

describe("packages/core architecture guard", () => {
  it("contains no firebase imports", () => {
    const files = listSourceFiles(join(__dirname));
    const offenders = files.filter((f) =>
      /from\s+["']firebase|firebase-admin/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
