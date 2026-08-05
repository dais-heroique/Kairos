import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  // Next.js résout "@/..." via tsconfig ; vitest ne lit pas ces chemins,
  // et un composant qui importe "@/components/X" échouait donc en test
  // alors qu'il compile parfaitement. L'alias les met d'accord.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  esbuild: {
    // Next.js apps use the automatic JSX runtime (no `import React` needed
    // per file) — esbuild needs to be told the same, or component tests
    // fail with "React is not defined".
    jsx: "automatic",
  },
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "**/._*", "e2e/**"],
    // ESLint's RuleTester misbehaves (silently finds 0 errors) if `eslint`
    // gets pre-bundled/duplicated by Vite's transform pipeline — forcing
    // it to load as a single real CJS instance fixes it.
    server: { deps: { inline: ["eslint"] } },
  },
});
