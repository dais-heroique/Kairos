import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "**/._*"],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
