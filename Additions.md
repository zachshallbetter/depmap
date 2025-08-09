Awesome—here are the concrete additions to make depmap feel full-featured: watch mode + SSE live reload, a plugin API (with a coverage plugin), a PR checker, a minimal VS Code extension, and viewer hooks for live updates and a coverage overlay.

⸻

1) package updates

// package.json (add deps / bump version)
{
  "name": "depmap",
  "version": "0.3.0",
  "type": "module",
  "license": "MIT",
  "bin": { "depmap": "bin/depmap.mjs" },
  "dependencies": {
    "bundle-require": "^4.0.2",
    "chokidar": "^3.6.0",
    "esbuild": "^0.23.0",
    "fast-glob": "^3.3.2",
    "minimist": "^1.2.8",
    "open": "^10.1.0",
    "sirv": "^2.0.4",
    "ts-morph": "^24.0.0"
  }
}


⸻

2) Server with SSE broadcast

// src/server.mjs
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import sirv from "sirv";

export async function serve({ projectRoot, viewerRoot, port }) {
  const serveViewer = sirv(viewerRoot, { dev: true, etag: true, brotli: true });

  /** @type {Set<http.ServerResponse>} */
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
    if (req.url === "/events") return sseHandler(req, res);
    serveViewer(req, res);
  });

  await new Promise(r => server.listen(port, r));
  return { url: `http://localhost:${port}`, broadcast, close: () => server.close() };
}


⸻

3) Plugin API and loader

// src/plugin-api.mjs
import fg from "fast-glob";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

/**
 * Run user plugins with a small capability surface.
 * Plugins may mutate graph in place.
 */
export async function runPlugins({ root, graph, plugins = [] }) {
  const ctx = {
    root,
    graph,
    log: (...a) => console.log("[depmap:plugin]", ...a),
    readText: async (rel) => {
      try { return await fs.readFile(new URL(`file://${root}/${rel}`), "utf8"); }
      catch { return null; }
    },
    glob: async (pat) => fg(pat, { cwd: root, dot: false }),
    git: {
      changedSince: async (rev = "origin/main") => {
        try {
          const { stdout } = await execFileP("git", ["diff", "--name-only", rev, "HEAD"], { cwd: root });
          return stdout.trim().split("\n").filter(Boolean);
        } catch { return []; }
      }
    }
  };

  for (const p of plugins) {
    try { await p.apply(ctx); }
    catch (e) { console.warn(`[depmap] plugin ${p?.name || "anonymous"} failed:`, e?.message || e); }
  }
}

Example plugin: coverage.

// src/plugins/coverage.mjs
export function pluginCoverage({ lcov = "coverage/lcov.info", threshold = 0 } = {}) {
  return {
    name: "coverage",
    async apply(ctx) {
      const text = await ctx.readText(lcov);
      if (!text) return ctx.log("coverage: no lcov at", lcov);

      const map = parseLcov(text);
      let applied = 0;
      for (const n of ctx.graph.nodes) {
        const key = normalize(n.path);
        const pct = map.get(key);
        if (pct != null) {
          n.meta ||= {};
          n.meta.coverage = pct;
          if (pct < threshold) n.meta.coverageLow = true;
          applied++;
        }
      }
      ctx.log(`coverage: annotated ${applied} nodes`);
    }
  };
}

// Very small LCOV parser → Map<repoRelPath, percent>
function parseLcov(data) {
  const out = new Map();
  let file = null, found = false, hit = 0, total = 0;
  for (const line of data.split(/\r?\n/)) {
    if (line.startsWith("SF:")) {
      if (file && found) out.set(normalize(file), total ? Math.round((hit/total)*100) : 100);
      file = line.slice(3).trim(); found = false; hit = 0; total = 0;
    } else if (line.startsWith("DA:")) {
      const [,hits] = line.split(",");
      total++; if (Number(hits) > 0) { hit++; found = true; }
    } else if (line === "end_of_record" && file) {
      out.set(normalize(file), total ? Math.round((hit/total)*100) : 100);
      file = null; found = false; hit = 0; total = 0;
    }
  }
  return out;
}

// Normalize absolute → repo-relative (forward slashes)
function normalize(p) {
  return p.replace(/^.*?\/(?=(app|src|components|lib|prisma|stories|scripts)\/)/, "").replace(/\\/g, "/");
}


⸻

4) Generator runs plugins

// src/generate-graph.mjs  (only the diff-y bits changed)
import path from "node:path";
import fs from "node:fs";
import fg from "fast-glob";
import { Project, ts, SyntaxKind } from "ts-morph";
import { runPlugins } from "./plugin-api.mjs";

export async function generateGraph({ root, config }) {
  // ... existing scan/build (unchanged) ...
  // build nodes, edges, summary as before
  const graph = { nodes, edges, summary, policy: config.policy || {} };

  // Run optional plugins from user's config
  if (Array.isArray(config.plugins) && config.plugins.length) {
    await runPlugins({ root, graph, plugins: config.plugins });
  }

  return graph;
}


⸻

5) CLI: --watch and SSE integration

// bin/depmap.mjs
#!/usr/bin/env node
import { fileURLToPath } from "url";
import path from "node:path";
import fs from "node:fs";
import minimist from "minimist";
import open from "open";
import chokidar from "chokidar";
import { generateGraph } from "../src/generate-graph.mjs";
import { serve } from "../src/server.mjs";
import { loadConfig } from "../src/load-config.mjs";
import { inferRules } from "../src/infer-rules.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function build({ projectRoot, config }) {
  const graph = await generateGraph({ root: projectRoot, config });
  const outPath = path.join(projectRoot, "public", "graph.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(graph, null, 2));
  console.log(`[depmap] wrote ${path.relative(projectRoot, outPath)} (${graph.nodes.length} nodes, ${graph.edges.length} edges)`);
  return graph;
}

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: ["root", "port"],
    boolean: ["open", "graphOnly", "write", "force", "watch"],
    alias: { r: "root", p: "port", o: "open" },
    default: { root: process.cwd(), port: "5656", open: true, graphOnly: false, write: false, force: false, watch: false }
  });

  const cmd = argv._[0]; // may be "infer"
  const projectRoot = path.resolve(argv.root);

  if (cmd === "infer") {
    await runInfer({ projectRoot, write: argv.write, force: argv.force });
    return;
  }

  const cfgPath = ["depmap.config.ts", "depmap.config.mjs", "depmap.config.js"]
    .map((p) => path.join(projectRoot, p))
    .find((p) => fs.existsSync(p));

  if (!cfgPath) {
    console.error("[depmap] Missing depmap.config.ts at project root.");
    console.error("Run `depmap infer` to generate a suggested config.");
    process.exit(1);
  }

  const config = await loadConfig(cfgPath);
  console.log(`[depmap] using config: ${path.relative(projectRoot, cfgPath)}`);

  console.log(`[depmap] scanning ${projectRoot}`);
  await build({ projectRoot, config });

  if (argv.graphOnly && !argv.watch) return;

  const viewerRoot = path.join(__dirname, "../viewer");
  const srv = await serve({ projectRoot, viewerRoot, port: Number(argv.port) });
  console.log(`[depmap] viewer on ${srv.url}`);
  if (argv.open) await open(srv.url);

  if (argv.watch) {
    const roots = config.roots?.length ? config.roots : ["."];
    const globs = roots.map(r => `${r}/**/*.{ts,tsx,js,jsx}`);
    const watcher = chokidar.watch(globs, {
      cwd: projectRoot,
      ignored: ["**/node_modules/**","**/.next/**","**/dist/**","**/build/**","**/public/graph.json"],
    });
    const rebuild = debounce(async () => {
      try {
        await build({ projectRoot, config });
        srv.broadcast("graph", { at: Date.now() });
      } catch (e) {
        console.error("[depmap] rebuild failed:", e?.message || e);
      }
    }, 250);

    watcher.on("add", rebuild).on("change", rebuild).on("unlink", rebuild);
    console.log("[depmap] watch mode enabled");
  }
}

async function runInfer({ projectRoot, write, force }) {
  console.log(`[depmap] inferring rules from ${projectRoot}`);
  const { text, stats, roots, features } = await inferRules({ root: projectRoot });
  const targetSuggested = path.join(projectRoot, "depmap.config.suggested.ts");
  const targetConfig = path.join(projectRoot, "depmap.config.ts");

  const banner =
`// Files: ${stats.files}, Nodes: ${stats.nodes}, Edges: ${stats.edges}
// Roots: ${roots.join(", ")}
// Detected: ${Object.entries(features).filter(([,v])=>v).map(([k])=>k).join(", ") || "none"}

`;

  if (write) {
    if (fs.existsSync(targetConfig) && !force) {
      console.error(`[depmap] ${path.basename(targetConfig)} already exists. Use --force to overwrite, or omit --write to create ${path.basename(targetSuggested)} instead.`);
      process.exit(1);
    }
    fs.writeFileSync(targetConfig, banner + text);
    console.log(`[depmap] wrote ${path.relative(projectRoot, targetConfig)}`);
  } else {
    fs.writeFileSync(targetSuggested, banner + text);
    console.log(`[depmap] wrote ${path.relative(projectRoot, targetSuggested)}`);
  }

  console.log("\nReview the suggested config, adjust as needed, then run:\n  npx depmap");
}

main().catch((err) => {
  console.error("[depmap] error:", err);
  process.exit(1);
});


⸻

6) Viewer: SSE live reload + coverage overlay

// viewer/main.tsx  (only key changes shown)
// 1) Node type can carry meta
type NodeT = { id:string; path:string; kind:string; tags?:string[]; circular?:boolean; x?:number; y?:number; meta?: Record<string, any> };

// 2) Subscribe to SSE
useEffect(() => {
  const es = new EventSource("/events");
  const handler = () => fetch("/graph").then(r=>r.json()).then(setData);
  es.addEventListener("graph", handler);
  return () => es.close();
}, []);

// 3) Add low-coverage pill & filter
const [state, setStatePatch] = useUrlState({
  selectedId:null as string|null, q:"", dirPrefix:"", hops:1,
  onlyFlagged:false,
  enabledFlags:Object.fromEntries(Object.keys(FLAGS).map(k=>[k,true])) as Record<string,boolean>,
  kindFilter:Object.fromEntries(KINDS.map(k=>[k,true])) as Record<string,boolean>,
  lowCoverageOnly:false
});

// In active subset (normal mode), after building `ids`:
if (state.lowCoverageOnly) {
  for (const id of Array.from(ids)) {
    const n = nodes.find(x => x.id === id);
    if (!n?.meta || typeof n.meta.coverage !== "number" || n.meta.coverage >= 60) ids.delete(id);
  }
}

// 4) Toolbar chip
pill("coverage<60%", !!state.lowCoverageOnly, () => setState({ lowCoverageOnly: !state.lowCoverageOnly })),

// 5) Visual hint (stroke if low)
.attr("stroke", d => d.circular ? "#ef4444" : (d.meta?.coverage != null && d.meta.coverage < 60 ? "#f59e0b" : (state.selectedId===d.id ? "#fff" : "#111827")))

(Keep the rest of the viewer as you already have it with URL state, Inspector, Worker layout.)

⸻

7) PR checker (diffs new violations)

// scripts/depmap-check.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const CUR = "public/graph.json";
if (!fs.existsSync(CUR)) {
  console.error("[depmap-check] missing public/graph.json (run depmap --graphOnly first)");
  process.exit(1);
}

const cur = JSON.parse(fs.readFileSync(CUR, "utf8"));
let base = { edges: [], summary: { flags: {} } };
try {
  const raw = execFileSync("git", ["show", "origin/main:public/graph.json"], { encoding: "utf8" });
  base = JSON.parse(raw);
} catch { /* no base graph */ }

function flagCounts(g) {
  const out = {};
  for (const e of g.edges || []) for (const f of e.flags || []) out[f] = (out[f] || 0) + 1;
  return out;
}
const a = flagCounts(base), b = flagCounts(cur);
const flags = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();

let regressions = [];
for (const f of flags) {
  const dv = (b[f] || 0) - (a[f] || 0);
  if (dv > 0 && /^(policy|server-in-client)/.test(f)) regressions.push({ flag: f, delta: dv, before: a[f]||0, after: b[f]||0 });
}

if (regressions.length) {
  console.error("[depmap-check] new violations detected:");
  for (const r of regressions) {
    console.error(`  ${r.flag}: +${r.delta} (was ${r.before} → now ${r.after})`);
  }
  process.exit(1);
} else {
  console.log("[depmap-check] OK (no new violations)");
}


⸻

8) VS Code extension (starter)

extension/package.json

{
  "name": "depmap-view",
  "displayName": "Depmap Viewer",
  "publisher": "your-org",
  "version": "0.0.1",
  "engines": { "vscode": "^1.84.0" },
  "activationEvents": ["onCommand:depmap.open", "onView:depmap.panel"],
  "contributes": {
    "commands": [
      { "command": "depmap.open", "title": "Depmap: Open Viewer" }
    ],
    "views": {
      "explorer": [{ "id": "depmap.panel", "name": "Depmap" }]
    }
  },
  "main": "./dist/extension.js",
  "categories": ["Other"]
}

extension/src/extension.ts

import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const createPanel = () => {
    const panel = vscode.window.createWebviewPanel("depmap", "Depmap", vscode.ViewColumn.Beside, { enableScripts: true });
    panel.webview.html = `
      <!doctype html><html><body style="margin:0;padding:0;overflow:hidden">
      <iframe src="http://localhost:5656" style="border:0;width:100vw;height:100vh"></iframe>
      </body></html>`;
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("depmap.open", createPanel)
  );

  // View container (explorer panel)
  vscode.window.registerWebviewViewProvider("depmap.panel", {
    resolveWebviewView(webviewView) {
      webviewView.webview.options = { enableScripts: true };
      webviewView.webview.html = `
        <!doctype html><html><body style="margin:0;padding:0;overflow:hidden">
        <iframe src="http://localhost:5656" style="border:0;width:100%;height:100%"></iframe>
        </body></html>`;
    }
  });
}

export function deactivate() {}

(Build with esbuild or tsc; this starter simply embeds the running viewer. For a packaged viewer, point the iframe at a file URL or bundle the viewer.)

⸻

9) Using the coverage plugin

In your project’s depmap.config.ts:

// depmap.config.ts
import { pluginCoverage } from "depmap/plugins/coverage.mjs";

export default {
  roots: ["app","components","lib","prisma","stories","scripts"],
  tagRules: [ /* … your rules … */ ],
  policy:   { allow: { /* … */ } },
  ignorePolicyForTags: ["stories","fixtures","dev-only"],
  soften: { whenSourceHasTag: { barrel: ["policy"] } },
  exclude: ["^public/.*","^node_modules/.*","^storybook-static/.*"],
  plugins: [
    pluginCoverage({ lcov: "coverage/lcov.info" }) // adds node.meta.coverage (0–100)
  ]
} as const;


⸻

10) Workflow recap
	•	npx depmap --watch → regenerates on change and live-reloads the viewer (SSE).
	•	Plugins mutate graph.json (e.g., coverage annotations).
	•	Viewer listens to /events and refetches /graph on changes; includes a coverage<60% pill.
	•	CI uses scripts/depmap-check.mjs to block new policy/server-in-client regressions.
	•	VS Code extension shows the same viewer inside the IDE.

If you want me to add a Git churn overlay, “affected tests” command, or a Slack webhook notifier next, say the word and I’ll wire those in too.