import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Même garde-fou que packages/core (§2) : l'argent réel (commission,
// clawback, seuils de paiement) doit rester une logique pure, testable
// sans émulateur — voir packages/core/src/no-firebase-imports.test.ts.
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

describe("packages/affiliate architecture guard", () => {
  it("contains no firebase imports", () => {
    const files = listSourceFiles(join(__dirname));
    const offenders = files.filter((f) =>
      /from\s+["']firebase|firebase-admin/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
