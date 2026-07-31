import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import noRawEstimateNumber from "./eslint-rules/no-raw-estimate-number.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Interdit l'affichage brut d'un champ *Low/*High en dehors de
// <EstimatedValue> (règle produit n°1 : jamais un nombre nu) — voir
// eslint-rules/no-raw-estimate-number.js.
const kairosPlugin = {
  rules: {
    "no-raw-estimate-number": noRawEstimateNumber,
  },
};

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Volume ExFAT : macOS sème des sidecars AppleDouble (._fichier) à côté
    // de chaque fichier écrit — à exclure sous peine de faux positifs.
    // next-env.d.ts : régénéré par Next.js à chaque build avec une
    // triple-slash-reference — c'est Next qui l'écrit ainsi, pas nous.
    ignores: ["**/._*", "next-env.d.ts"],
  },
  {
    plugins: { kairos: kairosPlugin },
    rules: {
      "kairos/no-raw-estimate-number": "error",
    },
  },
];

export default eslintConfig;
