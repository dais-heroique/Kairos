import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "**/._*", "e2e/**"],
    // ESLint's RuleTester misbehaves (silently finds 0 errors) if `eslint`
    // gets pre-bundled/duplicated by Vite's transform pipeline — forcing
    // it to load as a single real CJS instance fixes it.
    server: { deps: { inline: ["eslint"] } },
  },
});
