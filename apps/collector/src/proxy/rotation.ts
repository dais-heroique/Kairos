// Hygiène standard de scraping à l'échelle : rotation de proxies + délai
// aléatoire (jitter) pour éviter les faux positifs de rate-limit sur un
// pool de proxies partagé — pas une technique d'évasion, une pratique de
// fiabilité classique quand on interroge le même domaine des milliers de
// fois par jour depuis des IP mutualisées.

export interface ProxyConfig {
  urls: string[];
  username?: string;
  password?: string;
}

export function loadProxyConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ProxyConfig {
  const raw = env.PROXY_LIST_URL ?? "";
  const urls = raw
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  const config: ProxyConfig = { urls };
  if (env.PROXY_USERNAME) config.username = env.PROXY_USERNAME;
  if (env.PROXY_PASSWORD) config.password = env.PROXY_PASSWORD;
  return config;
}

export function createProxyRotator(config: ProxyConfig): () => string | undefined {
  let index = 0;
  return () => {
    if (config.urls.length === 0) return undefined;
    const proxy = config.urls[index % config.urls.length];
    index++;
    return proxy;
  };
}

// Rotation réaliste — quelques UA desktop/mobile courants, pas de
// fingerprint exotique qui se démarquerait du trafic normal.
export const REALISTIC_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
] as const;

export function randomUserAgent(random: () => number = Math.random): string {
  const index = Math.floor(random() * REALISTIC_USER_AGENTS.length);
  return REALISTIC_USER_AGENTS[Math.min(index, REALISTIC_USER_AGENTS.length - 1)]!;
}

export function computeJitterMs(
  minMs = 500,
  maxMs = 2500,
  random: () => number = Math.random,
): number {
  return Math.round(minMs + random() * (maxMs - minMs));
}

export async function jitterDelay(minMs = 500, maxMs = 2500): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, computeJitterMs(minMs, maxMs)));
}
