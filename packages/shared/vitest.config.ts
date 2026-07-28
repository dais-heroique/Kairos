import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Volume ExFAT : macOS sème des sidecars AppleDouble (._fichier) à côté
    // de chaque fichier — à exclure sous peine de faux "fichiers de test".
    exclude: [...configDefaults.exclude, "**/._*"],
  },
});
