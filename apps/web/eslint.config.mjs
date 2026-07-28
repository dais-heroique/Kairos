import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// TODO(Phase 4) : ajouter la règle custom qui interdit l'affichage brut d'un
// champ *Low/*High/estimate en dehors de <EstimatedValue> — utile une fois
// que les classements affichent réellement des estimations.
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Volume ExFAT : macOS sème des sidecars AppleDouble (._fichier) à côté
    // de chaque fichier écrit — à exclure sous peine de faux positifs.
    ignores: ["**/._*"],
  },
];

export default eslintConfig;
