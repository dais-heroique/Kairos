import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

// ESLint's RuleTester is unreliable when run through Vite/vitest's ESM
// transform (reproducibly reports 0 errors for some invalid cases when a
// single run() call has more than one invalid case — a transform/caching
// interaction, not a bug in the rule below, confirmed by running the exact
// same assertions via plain node -e with a native CJS require). Using
// Linter.verify() directly sidesteps RuleTester's internal state handling
// entirely and is just as valid a way to test an ESLint rule.
const require = createRequire(import.meta.url);
const { Linter } = require("eslint") as typeof import("eslint");
const rule = require("./no-raw-estimate-number.js") as import("eslint").Rule.RuleModule;

function lint(code: string) {
  const linter = new Linter();
  return linter.verify(code, {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { kairos: { rules: { "no-raw-estimate-number": rule } } },
    rules: { "kairos/no-raw-estimate-number": "error" },
  });
}

describe("no-raw-estimate-number", () => {
  it.each([
    "const x = <EstimatedValue range={item.estimatedEarnings} />;",
    "const x = <span>{item.salesLowered}</span>;", // ne finit pas par Low/High
    "const x = <span>{item.title}</span>;",
    "const x = item.salesLow + item.salesHigh;", // hors JSX, pas concerné
  ])("does not flag: %s", (code) => {
    expect(lint(code)).toEqual([]);
  });

  it.each([
    ["const x = <span>{item.salesLow}</span>;", "salesLow"],
    ["const x = <span>{item.estimatedEarnings.high}</span>;", "high"],
    ["const x = <p>Prix bas : {product.priceLow}€</p>;", "priceLow"],
  ])("flags: %s", (code, prop) => {
    const messages = lint(code);
    expect(messages).toHaveLength(1);
    expect(messages[0]!.ruleId).toBe("kairos/no-raw-estimate-number");
    expect(messages[0]!.message).toContain(prop);
  });
});
