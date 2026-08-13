import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Node ne lit aucun .env tout seul et le projet n'embarque pas dotenv —
// sans ce chargeur, APIFY_API_TOKEN doit être passé à la main sur chaque
// commande. Volontairement minimal : pas d'interpolation, pas de multi-ligne.
function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

/** Charge apps/jobs/.env.local sans écraser ce qui est déjà dans l'environnement. */
export function loadEnvLocal(): void {
  const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const envPath = join(appRoot, ".env.local");
  if (!existsSync(envPath)) return;

  for (const [key, value] of Object.entries(parseEnvFile(envPath))) {
    // Une variable passée en ligne de commande doit toujours gagner.
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

// Emplacements où Firebase dépose la clé de compte de service, dans l'ordre
// où on a le plus de chances de la trouver.
const KEY_SEARCH_DIRS = [
  join(homedir(), "Downloads"),
  homedir(),
  resolve(dirname(fileURLToPath(import.meta.url)), "../../.."),
];

/**
 * Retrouve la clé de compte de service.
 *
 * Si `GOOGLE_APPLICATION_CREDENTIALS` pointe vers un fichier qui n'existe
 * plus (renommé, déplacé — un deuxième téléchargement du même fichier se
 * voit souvent suffixé « (1) » par le navigateur), on **retombe sur la
 * recherche automatique** au lieu d'abandonner : constaté en pratique, un
 * chemin explicite mais périmé laissait l'Admin SDK échouer bien plus
 * loin, avec un `ENOENT` qui ne dit ni où chercher ni que la clé a
 * probablement juste changé de nom.
 */
export function findServiceAccountKey(): string | undefined {
  const explicit = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (explicit) {
    // Développer ~ , que le shell n'expanse pas quand le chemin est cité.
    const expanded = explicit.startsWith("~")
      ? join(homedir(), explicit.slice(1))
      : explicit;
    if (existsSync(expanded)) return expanded;
  }

  for (const dir of KEY_SEARCH_DIRS) {
    if (!existsSync(dir)) continue;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    const match = entries
      .filter((f) => f.endsWith(".json"))
      .filter((f) => /firebase-adminsdk|serviceaccount|service-account/i.test(f))
      .sort();
    if (match[0]) return join(dir, match[0]);
  }
  return undefined;
}
