import { createServer } from "node:http";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { chromium, type Browser } from "playwright";
import { getBigQueryClient } from "./bigquery/client.js";
import { createFirestoreCircuitBreakerStore } from "./circuit-breaker.js";
import { handleCollectTask, type CollectTaskPayload } from "./queue/task-handler.js";
import { thirdpartySource } from "./sources/thirdparty.js";
import { tiktokApiSource } from "./sources/tiktok-api.js";
import { createTiktokWebSource } from "./sources/tiktok-web.js";
import type { CollectorSource } from "./sources/types.js";

// Cloud Run uniquement — jamais Cloud Functions (timeouts trop courts, IP
// datacenter blacklistées). Ce serveur écoute PORT, expose un health check
// et l'endpoint /tasks/collect appelé par Cloud Tasks.
const port = Number(process.env.PORT ?? 8080);

if (getApps().length === 0) initializeApp();
const db = getFirestore();
const circuitStore = createFirestoreCircuitBreakerStore(db);

let browserPromise: Promise<Browser> | undefined;
function getBrowser(): Promise<Browser> {
  browserPromise ??= chromium.launch({ headless: true });
  return browserPromise;
}

async function buildSources(): Promise<Record<string, CollectorSource>> {
  return {
    thirdparty: thirdpartySource,
    "tiktok-api": tiktokApiSource,
    "tiktok-web": createTiktokWebSource(await getBrowser()),
  };
}

async function readJsonBody(req: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw.length > 0 ? JSON.parse(raw) : {};
}

function isAuthorized(req: import("node:http").IncomingMessage): boolean {
  const expected = process.env.COLLECTOR_SERVICE_TOKEN;
  if (!expected) return true; // pas de token configuré = auth désactivée (dev local)
  return req.headers.authorization === `Bearer ${expected}`;
}

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (req.url === "/tasks/collect" && req.method === "POST") {
    if (!isAuthorized(req)) {
      res.writeHead(401);
      res.end();
      return;
    }
    void (async () => {
      try {
        const body = (await readJsonBody(req)) as CollectTaskPayload;
        const sources = await buildSources();
        const result = await handleCollectTask(body, {
          sources,
          circuitStore,
          bq: getBigQueryClient(),
        });
        const statusCode = result.status === "written" ? 200 : result.status === "error" ? 502 : 200;
        res.writeHead(statusCode, { "content-type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "error", error: err instanceof Error ? err.message : String(err) }));
      }
    })();
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(port, () => {
  console.log(`collector listening on :${port}`);
});
