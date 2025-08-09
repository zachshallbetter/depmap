import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import sirv from "sirv";

export async function serve({ projectRoot, viewerRoot, port }) {
  const serveViewer = sirv(viewerRoot, { dev: true, etag: true, brotli: true });

  const server = http.createServer((req, res) => {
    if (req.url === "/graph") {
      const p = path.join(projectRoot, "public", "graph.json");
      if (!fs.existsSync(p)) { res.writeHead(404); res.end("graph.json not found"); return; }
      res.setHeader("Content-Type", "application/json");
      fs.createReadStream(p).pipe(res);
      return;
    }
    serveViewer(req, res);
  });

  await new Promise(r => server.listen(port, r));
  return { url: `http://localhost:${port}`, close: () => server.close() };
}