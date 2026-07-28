import { createServer } from "node:http";

// Cloud Run uniquement — jamais Cloud Functions (timeouts trop courts, IP
// datacenter blacklistées). Ce serveur écoute PORT et expose un health check ;
// les endpoints de collecte réels (déclenchés par Cloud Tasks) arrivent en
// Phase 3.
const port = Number(process.env.PORT ?? 8080);

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(port, () => {
  console.log(`collector listening on :${port}`);
});
