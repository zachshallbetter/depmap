import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import sirv from "sirv";
import { diffGraphs } from "./diff-graph.mjs";

export async function serve({ projectRoot, viewerRoot, port }) {
  const serveViewer = sirv(viewerRoot, { dev: true, etag: true, brotli: true });

  const clients = new Set();
  function sseHandler(req, res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    res.write(`event: hello\ndata: {}\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
  }
  function broadcast(evt, payload) {
    const data = `event: ${evt}\ndata: ${JSON.stringify(payload || {})}\n\n`;
    for (const res of clients) {
      try { res.write(data); } catch { clients.delete(res); }
    }
  }

  const server = http.createServer((req, res) => {
    if (req.url === "/graph") {
      const p = path.join(projectRoot, "public", "graph.json");
      if (!fs.existsSync(p)) { res.writeHead(404); res.end("graph.json not found"); return; }
      res.setHeader("Content-Type", "application/json");
      fs.createReadStream(p).pipe(res);
      return;
    }
    if (req.url === "/graph-base") {
      const p = path.join(projectRoot, ".depmap", "base-graph.json");
      res.setHeader("Content-Type", "application/json");
      if (!fs.existsSync(p)) { res.end(JSON.stringify({ nodes:[], edges:[] })); return; }
      fs.createReadStream(p).pipe(res); return;
    }
    if (req.url === "/diff") {
      const curP = path.join(projectRoot, "public", "graph.json");
      const baseP = path.join(projectRoot, ".depmap", "base-graph.json");
      res.setHeader("Content-Type", "application/json");
      if (!fs.existsSync(curP)) { res.writeHead(404); res.end(JSON.stringify({ error:"missing current graph" })); return; }
      const cur = JSON.parse(fs.readFileSync(curP, "utf8"));
      const base = fs.existsSync(baseP) ? JSON.parse(fs.readFileSync(baseP, "utf8")) : { nodes:[], edges:[] };
      res.end(JSON.stringify(diffGraphs(base, cur))); return;
    }
    if (req.url === "/events") return sseHandler(req, res);
    serveViewer(req, res);
  });

  await new Promise(r => server.listen(port, r));
  return { url: `http://localhost:${port}`, broadcast, close: () => server.close() };
}