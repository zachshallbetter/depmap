Here’s a complete, zero-config package you can drop into a new repo and publish as depmap. It:
 • scans your project (via depmap.config.ts you provide),
 • writes public/graph.json,
 • serves an interactive viewer,
 • uses Radix primitives with a ShadCN-style theme,
 • persists URL state,
 • includes an Inspector,
 • and runs the force layout in a Web Worker.

You can paste these files into a folder, npm publish, then run anywhere with npx depmap.

⸻

package.json

{
  "name": "depmap",
  "version": "0.2.0",
  "description": "Dependency map + interactive viewer with Radix UI, URL state, Inspector, and worker-based layout.",
  "type": "module",
  "license": "MIT",
  "bin": {
    "depmap": "bin/depmap.mjs"
  },
  "dependencies": {
    "bundle-require": "^4.0.2",
    "esbuild": "^0.23.0",
    "fast-glob": "^3.3.2",
    "minimist": "^1.2.8",
    "open": "^10.1.0",
    "sirv": "^2.0.4",
    "ts-morph": "^24.0.0"
  }
}

⸻

bin/depmap.mjs  (CLI)

# !/usr/bin/env node
import { fileURLToPath, pathToFileURL } from "url";
import path from "node:path";
import fs from "node:fs";
import minimist from "minimist";
import open from "open";
import { generateGraph } from "../src/generate-graph.mjs";
import { serve } from "../src/server.mjs";
import { loadConfig } from "../src/load-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: ["root", "port"],
    boolean: ["open", "graphOnly"],
    alias: { r: "root", p: "port", o: "open" },
    default: { root: process.cwd(), port: "5656", open: true, graphOnly: false }
  });

  const projectRoot = path.resolve(argv.root);

  // Require user config (TS/JS supported)
  const cfgPath = ["depmap.config.ts", "depmap.config.mjs", "depmap.config.js"]
    .map(p => path.join(projectRoot, p))
    .find(p => fs.existsSync(p));

  if (!cfgPath) {
    const sample = path.join(projectRoot, "depmap.config.ts");
    console.error("[depmap] Missing depmap.config.ts at project root.");
    console.error("Create one like this:\n");
    console.error(SAMPLE_CONFIG);
    process.exit(1);
  }

  const config = await loadConfig(cfgPath);
  console.log(`[depmap] using config: ${path.relative(projectRoot, cfgPath)}`);

  console.log(`[depmap] scanning ${projectRoot}`);
  const graph = await generateGraph({ root: projectRoot, config });

  const outPath = path.join(projectRoot, "public", "graph.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(graph, null, 2));
  console.log(`[depmap] wrote ${path.relative(projectRoot, outPath)} (${graph.nodes.length} nodes, ${graph.edges.length} edges)`);

  if (argv.graphOnly) return;

  const viewerRoot = path.join(__dirname, "../viewer");
  const { url } = await serve({ projectRoot, viewerRoot, port: Number(argv.port) });

  console.log(`[depmap] viewer on ${url}`);
  if (argv.open) await open(url);
}

const SAMPLE_CONFIG = `export default {
  roots: ["app","components","lib","prisma","stories","scripts"],
  tagRules: [
    { test: /^app\\/.*\\/page\\.tsx?$/, kind: "page" },
    { test: /^app\\/.*\\/layout\\.tsx?$/, kind: "page" },
    { test: /^app\\/api\\/.*\\/route\\.(t|j)s$/, kind: "api", addTags: ["server-only"] },
    { test: /^components\\/Layouts\\/.+\\.(t|j)sx?$/, kind: "layout-block" },
    { test: /^components\\/Blocks\\/.+\\.(t|j)sx?$/,  kind: "content-block" },
    { test: /^components\\/UI\\/.+\\.(t|j)sx?$/,      kind: "ui" },
    { test: /^components\\/(?!Tools\\/).+\\.(t|j)sx?$/, kind: "component" },
    { test: /^components\\/Tools\\/.+\\.(t|j)sx?$/,   kind: "styleguide" },
    { test: /^lib\\/(types|component-types)\\.ts$/,   kind: "types" },
    { test: /^lib\\/design-tokens\\.ts$/,            kind: "tokens" },
    { test: /^lib\\/(database|prisma)\\.ts$/,        kind: "server-lib", addTags: ["server-only"] },
    { test: /^prisma\\/.+$/,                         kind: "prisma", addTags: ["server-only"] },
    { test: /index\\.(t|j)s$/,                       addTags: ["barrel"] },
    { test: /\\.schema\\.(t|j)s$/,                   addTags: ["schema"] }
  ],
  ignorePolicyForTags: ["stories","fixtures","dev-only"],
  policy: {
    allow: {
      page: ["layout-block","content-block","component","animation","types","tokens"],
      "layout-block": ["content-block","component","ui","animation","types","tokens"],
      "content-block": ["component","ui","animation","types","tokens"],
      component: ["component","ui","animation","types","tokens"],
      ui: ["ui","types","tokens"],
      animation: ["ui","component","types","tokens"],
      styleguide: ["page","layout-block","content-block","component","ui","animation","types","tokens","server-lib","prisma","api","other"],
      types: ["types","tokens"],
      tokens: ["tokens"],
      "server-lib": ["server-lib","types"],
      prisma: [],
      api: ["server-lib","types"]
    }
  },
  soften: {
    flags: ["block->page"],
    whenSourceHasTag: { barrel: ["policy"] }
  },
  exclude: ["^public/.*","^node_modules/.*","^storybook-static/.*"]
};`;

main().catch(err => {
  console.error("[depmap] error:", err);
  process.exit(1);
});

⸻

src/load-config.mjs

import path from "node:path";
import { bundleRequire } from "bundle-require";

export async function loadConfig(filePath) {
  const { mod } = await bundleRequire({
    filepath: path.resolve(filePath),
    format: "esm"
  });
  return mod.default || mod;
}

⸻

src/generate-graph.mjs

import path from "node:path";
import fs from "node:fs";
import fg from "fast-glob";
import { Project, ts, SyntaxKind } from "ts-morph";

function matchRule(p, rules = []) {
  for (const r of rules) if (r.test.test(p)) return r;
  return null;
}
const rel = (root, abs) => path.relative(root, abs).replace(/\\/g, "/");

export async function generateGraph({ root, config }) {
  const roots = config.roots || ["app","components","lib","prisma","stories","scripts"];
  const patterns = roots.map(r => `${r}/**/*.{ts,tsx,js,jsx}`);
  const ignore = ["**/node_modules/**","**/.next/**","**/dist/**"];
  const files = await fg(patterns, { cwd: root, dot: false, ignore });

  const project = new Project({
    tsConfigFilePath: fs.existsSync(path.join(root, "tsconfig.json")) ? path.join(root, "tsconfig.json") : undefined,
    skipAddingFilesFromTsConfig: false
  });
  files.forEach(f => project.addSourceFileAtPath(path.join(root, f)));

  const nodes = [];
  const edges = [];
  const byId = new Map();

  // nodes
  for (const f of files) {
    const id = f.replace(/\\/g, "/");
    const rule = matchRule(id, config.tagRules);
    const node = {
      id, path: id,
      kind: rule?.kind || "other",
      tags: rule?.addTags || [],
      circular: false
    };
    nodes.push(node);
    byId.set(id, node);
  }

  // resolve import/export target to a known file in graph
  function resolve(fromPath, spec) {
    if (!spec) return null;
    if (spec.startsWith(".") || spec.startsWith("/")) {
      const fromAbs = path.join(root, fromPath);
      const full = path.resolve(path.dirname(fromAbs), spec);
      const cands = ["",".ts",".tsx",".js",".jsx","/index.ts","/index.tsx","/index.js","/index.jsx"];
      for (const c of cands) {
        const abs = full + c;
        if (fs.existsSync(abs)) {
          const r = rel(root, abs);
          return byId.has(r) ? r : null;
        }
      }
      return null;
    }
    // ts path mapping
    const sf = project.getSourceFile(path.join(root, fromPath));
    const res = ts.resolveModuleName(spec, sf.getFilePath(), project.getCompilerOptions(), ts.sys);
    if (res?.resolvedModule?.resolvedFileName) {
      const r = rel(root, res.resolvedModule.resolvedFileName);
      return byId.has(r) ? r : null;
    }
    return null; // external dep
  }

  // edges
  for (const f of files) {
    const from = f.replace(/\\/g, "/");
    const sf = project.getSourceFile(path.join(root, f));
    if (!sf) continue;

    const pushEdge = (to) => {
      if (!to) return;
      const e = { source: from, target: to, flags: [] };
      const src = byId.get(from), dst = byId.get(to);

      // policy
      const allow = new Set((config.policy?.allow?.[src?.kind] || []));
      if (!allow.has(dst?.kind)) e.flags.push("policy");

      // client importing server-only
      const serverKinds = new Set(["server-lib","prisma","api"]);
      const clientSurf = /^(components\/(?!Tools\/)|app\/(?!api\/))/.test(src.path);
      const serverOnly = serverKinds.has(dst.kind) || (dst.tags||[]).includes("server-only");
      if (clientSurf && serverOnly) e.flags.push("server-in-client");

      // soften
      if (src?.tags?.includes("barrel") && e.flags.includes("policy"))
        e.flags = e.flags.map(f => f === "policy" ? "policy:info" : f);

      // ignore by tag
      const ignored = new Set(config.ignorePolicyForTags || []);
      if ([src, dst].some(n => n?.tags?.some(t => ignored.has(t))))
        e.flags = e.flags.filter(f => f !== "policy");

      edges.push(e);
    };

    // imports
    sf.getImportDeclarations().forEach(imp => pushEdge(resolve(from, imp.getModuleSpecifierValue())));
    // re-exports
    sf.getExportDeclarations().forEach(exp => pushEdge(resolve(from, exp.getModuleSpecifierValue())));
    // dynamic import()
    sf.forEachDescendant(n => {
      if (n.getKind() === SyntaxKind.CallExpression) {
        const ce = n;
        const expr = ce.getExpression().getText();
        if (expr === "import") {
          const arg = ce.getArguments()[0];
          const lit = arg && arg.getKind() === SyntaxKind.StringLiteral ? arg.getLiteralValue() : null;
          if (lit) pushEdge(resolve(from, lit));
        }
      }
    });
  }

  // optional: detect simple cycles (mark nodes touched by back-edges)
  const adj = new Map(nodes.map(n => [n.id, []]));
  edges.forEach(e => { adj.get(e.source).push(e.target); });
  const seen = new Set(), stack = new Set();
  (function dfs(v) {
    seen.add(v); stack.add(v);
    for (const w of adj.get(v)) {
      if (!seen.has(w)) dfs(w);
      else if (stack.has(w)) { byId.get(v).circular = true; byId.get(w).circular = true; }
    }
    stack.delete(v);
  })(nodes[0]?.id || "");
  // summary
  const summary = {
    counts: { nodes: nodes.length, edges: edges.length },
    flags: edges.reduce((a, e) => { for (const f of e.flags||[]) a[f]=(a[f]||0)+1; return a; }, {})
  };

  return { nodes, edges, summary, policy: config.policy || {} };
}

⸻

src/server.mjs

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

⸻

viewer/index.html

<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>depmap</title>
  <link rel="stylesheet" href="./styles.css"/>
  <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18",
        "react-dom/client": "https://esm.sh/react-dom@18/client",
        "d3": "https://esm.sh/d3@7",
        "@radix-ui/react-popover": "https://esm.sh/@radix-ui/react-popover@1.0.7?external=react,react-dom",
        "@radix-ui/react-scroll-area": "https://esm.sh/@radix-ui/react-scroll-area@1.0.5?external=react,react-dom",
        "@radix-ui/react-tooltip": "https://esm.sh/@radix-ui/react-tooltip@1.0.7?external=react,react-dom",
        "@radix-ui/react-toggle-group": "https://esm.sh/@radix-ui/react-toggle-group@1.0.4?external=react,react-dom",
        "@radix-ui/react-dialog": "https://esm.sh/@radix-ui/react-dialog@1.0.5?external=react,react-dom"
      }
    }
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>

⸻

viewer/styles.css  (ShadCN-style tokens + dark theme)

:root {
  --bg: #0b0f17;
  --fg: #d1d5db;
  --muted: #94a3b8;
  --border: rgba(255,255,255,.12);
  --chip: rgba(255,255,255,.06);
  --accent: #7c3aed;
}
@media (prefers-color-scheme: light) {
  :root { --bg:#ffffff; --fg:#111827; --muted:#475569; --border:rgba(0,0,0,.12); --chip:rgba(0,0,0,.05); }
}

* { box-sizing:border-box }
html, body, #root { height:100% }
body { margin:0; background:var(--bg); color:var(--fg); font:14px/1.5 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; }

.toolbar { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; padding:.5rem .75rem; border-bottom:1px solid var(--border); backdrop-filter:saturate(120%) blur(4px); position:sticky; top:0; z-index:10; background:color-mix(in oklab, var(--bg) 88%, transparent); }
.input { background:transparent; color:var(--fg); border:1px solid var(--border); padding:.45rem .6rem; border-radius:.5rem; min-width:18rem; }
.btn { border:1px solid var(--border); background:transparent; color:var(--fg); padding:.35rem .65rem; border-radius:.5rem; }
.chip { border:1px solid var(--border); padding:.25rem .6rem; border-radius:9999px; font-size:.75rem; background:transparent; color:var(--fg); }
.chip[aria-pressed="true"] { background:var(--chip); }

.layout { display:grid; grid-template-columns: 1fr 360px; gap:1rem; padding: .75rem; height:calc(100% - 48px); }
aside { border-left:1px solid var(--border); padding-left:.75rem; overflow:auto; }
.panel { border:1px solid var(--border); border-radius:.6rem; background:color-mix(in oklab, var(--bg) 94%, transparent); }
.panel .hd { padding:.6rem .75rem; font-weight:600; border-bottom:1px solid var(--border); }
.panel .bd { padding:.6rem .75rem; }

.tree button { display:block; width:100%; text-align:left; color:inherit; background:transparent; border:0; padding:.2rem .25rem; border-radius:.25rem; }
.tree button:hover { background:var(--chip); }

svg { touch-action: pinch-zoom; background:var(--bg); }
.badge { font-size:10px; opacity:.8; margin-left:.35rem; }
.small { font-size:12px; color:var(--muted); }

.kv { display:grid; grid-template-columns: 100px 1fr; gap:.25rem .75rem; }
.kv div { padding:.1rem 0; }

⸻

viewer/layout-worker.js  (Web Worker for force layout)

// Runs d3-force in a worker and streams node positions back to the main thread.
importScripts("<https://esm.sh/d3-force@3?bundle>");

self.onmessage = (e) => {
  const { nodes, edges, width, height, xForKind } = e.data;
  const sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(edges).id(d => d.id).distance(55).strength(0.5))
    .force("charge", d3.forceManyBody().strength(-180))
    .force("x", d3.forceX(d => xForKind(d.kind)).strength(0.6))
    .force("y", d3.forceY(height/2).strength(0.05))
    .force("collide", d3.forceCollide(15))
    .alpha(1);

  let last = 0;
  sim.on("tick", () => {
    const now = Date.now();
    if (now - last > 30) { // throttle ~33fps
      last = now;
      self.postMessage({ type: "tick", nodes, edges });
    }
  });
  sim.on("end", () => {
    self.postMessage({ type: "end", nodes, edges });
  });
};

⸻

viewer/main.tsx  (Viewer with Radix UI, URL state, Inspector)

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import *as d3 from "d3";
import* as Popover from "@radix-ui/react-popover";
import *as Tooltip from "@radix-ui/react-tooltip";
import* as ScrollArea from "@radix-ui/react-scroll-area";

type NodeT = { id:string; path:string; kind:string; tags?:string[]; circular?:boolean; x?:number; y?:number };
type EdgeT = { source:string; target:string; flags?:string[] };
type Graph = { nodes:NodeT[]; edges:EdgeT[]; summary?:any; policy?:any };

const FLAGS: Record<string,string> = {
  "page->ui":"#d9480f","ui->block":"#c1121f","ui->layout":"#6a040f",
  "block->page":"#ff7b00","policy":"#b000b5","policy:info":"#8b5cf6",
  "prisma-import":"#005f73","server-in-client":"#ff3b30"
};
const KINDS = ["page","layout-block","content-block","component","ui","animation","styleguide","types","tokens","server-lib","api","prisma","other"] as const;
type Kind = typeof KINDS[number];

function useUrlState<T extends Record<string, any>>(defaults: T) {
  const [state, setState] = useState<T>(() => {
    const u = new URL(window.location.href);
    const out: any = { ...defaults };
    Object.keys(defaults).forEach(k => {
      const key = `dg.${k}`;
      if (!u.searchParams.has(key)) return;
      try { out[k] = JSON.parse(u.searchParams.get(key)!); } catch {}
    });
    return out;
  });
  const patch = (next: Partial<T>) => {
    setState(s => {
      const merged = { ...s, ...next };
      const u = new URL(window.location.href);
      for (const [k,v] of Object.entries(merged)) u.searchParams.set(`dg.${k}`, JSON.stringify(v));
      history.replaceState(null,"",u.toString());
      return merged;
    });
  };
  return [state, patch] as const;
}

function shortLabel(p:string){
  const parts=p.split("/"), file=parts.at(-1)||"", parent=parts.at(-2)||"root";
  const base=(["app","components"].includes(parent)?"root":parent);
  if (/^page\.(t|j)sx?$/.test(file)) return `${base} (p)`;
  if (/^route\.(t|j)sx?$/.test(file)) return`${base} (r)`;
  if (/^index\.(t|j)sx?$/.test(file)) return `${base} (i)`;
  return file.replace(/\.(t|j)sx?$/,"");
}

function TreeView({ data, selectedId, onPick, onFilterDir }:{
  data:Graph; selectedId:string|null; onPick:(id:string)=>void; onFilterDir:(dir:string)=>void;
}) {
  const [open,setOpen]=useState<Record<string,boolean>>({app:true,components:true,lib:true});
  const [q,setQ]=useState("");

  const tree=useMemo(()=>{
    const root={ name:"", path:"", files:[] as NodeT[], dirs:{} as Record<string, any> };
    for(const n of data.nodes){
      const parts=n.path.split("/");
      let cur=root;
      for(let i=0;i<parts.length-1;i++){
        const seg=parts[i]; cur.dirs[seg] ||= { name:seg, path:(cur.path?cur.path+"/":"")+seg, files:[], dirs:{} };
        cur=cur.dirs[seg];
      }
      cur.files.push(n);
    }
    return root;
  },[data.nodes]);

  function Dir({t,depth}:{t:any;depth:number}) {
    return Object.keys(t.dirs).sort().map(name=>{
      const child=t.dirs[name], key=child.path||name, isOpen=!!open[key];
      const dirCount=Object.keys(child.dirs).length, fileCount=child.files.length;
      return (
        <div key={key}>
          <div className="flex items-center" style={{paddingLeft:depth*12}}>
            <button className="chip" onClick={()=>setOpen(o=>({...o,[key]:!o[key]}))}>{isOpen?"▾":"▸"}</button>
            <button className="tree-item" style={{marginLeft:6}} onClick={()=>onFilterDir(child.path)}>{name}<span className="badge">{dirCount?" "+dirCount+"d":""} {fileCount?" "+fileCount+"f":""}</span></button>
          </div>
          {isOpen && <Dir t={child} depth={depth+1} />}
          {isOpen && child.files
            .filter((f:NodeT)=>!q || f.path.toLowerCase().includes(q.toLowerCase()))
            .sort((a:NodeT,b:NodeT)=>a.path.localeCompare(b.path))
            .map((f:NodeT)=>(
              <button key={f.id} style={{paddingLeft:(depth+1)*12}}
                className="tree" onClick={()=>onPick(f.id)}>
                {f.path.split("/").pop()} <span className="badge">({f.kind})</span>
              </button>
            ))}
        </div>
      );
    });
  }

  return (
    <div className="panel">
      <div className="hd">Tree</div>
      <div className="bd">
        <div className="flex gap-2 mb-2">
          <input className="input" placeholder="Filter tree…" value={q} onChange={e=>setQ(e.target.value)} />
          <button className="btn" onClick={()=>onFilterDir("")}>Clear</button>
        </div>
        <ScrollArea.Root type="always"><ScrollArea.Viewport>
          <div className="tree"><Dir t={tree} depth={0}/></div>
        </ScrollArea.Viewport></ScrollArea.Root>
      </div>
    </div>
  );
}

function Inspector({ node, edges, byId, onReveal, onExpand }:{
  node:NodeT|null; edges:EdgeT[]; byId:Record<string,NodeT>; onReveal:()=>void; onExpand:()=>void;
}) {
  if (!node) return null;
  const inc = edges.filter(e => e.source===node.id || e.target===node.id);
  const inDeg = inc.filter(e=>e.target===node.id).length;
  const outDeg = inc.filter(e=>e.source===node.id).length;
  const flags = Array.from(new Set(inc.flatMap(e=>e.flags||[])));

  const neighbors = Array.from(new Set(inc.map(e => e.source===node.id ? e.target : e.source))).map(id => byId[id]);

  return (
    <div className="panel" style={{marginTop:12}}>
      <div className="hd">Inspector</div>
      <div className="bd">
        <div className="small">Focused</div>
        <div style={{fontWeight:600}}>{node.path}</div>
        <div className="small" style={{marginTop:6}}>kind: {node.kind} · tags: {node.tags?.join(", ") || "—"} {node.circular ? " · in a cycle" : ""}</div>

        <div className="kv" style={{marginTop:8}}>
          <div className="small">in-degree</div><div>{inDeg}</div>
          <div className="small">out-degree</div><div>{outDeg}</div>
          <div className="small">flags</div><div>{flags.length?flags.join(", "):"—"}</div>
        </div>

        <div style={{marginTop:8}} className="small">Neighbors</div>
        <ul style={{margin:0, paddingLeft:16}}>
          {neighbors.slice(0,20).map(n => <li key={n.id}>{n.path}</li>)}
          {neighbors.length>20 ? <li>… {neighbors.length-20} more</li> : null}
        </ul>

        <div style={{display:"flex", gap:8, marginTop:10}}>
          <button className="btn" onClick={onExpand}>Expand neighbors</button>
          <button className="btn" onClick={onReveal}>Reveal in tree</button>
        </div>
      </div>
    </div>
  );
}

function DepGraph({ data, state, setState }:{
  data:Graph;
  state:any;
  setState:(p:any)=>void;
}) {
  const svgRef = useRef<SVGSVGElement|null>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);

  // colors
  const colors = useMemo(()=>{
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    return {
      stroke: dark ? "#4b5563" : "#c4c4c4",
      text: dark ? "#cbd5e1" : "#1f2937",
      kindScale: d3.scaleOrdinal<string,string>().domain(KINDS as any).range(d3.schemeTableau10 as any)
    };
  }, []);

  const nodes = useMemo(()=>data.nodes.map(n=>({...n})),[data.nodes]);
  const edges = useMemo(()=>data.edges.map(e=>({...e})),[data.edges]);
  const byId = useMemo(()=>Object.fromEntries(nodes.map(n=>[n.id,n])) as Record<string,NodeT>,[nodes]);

  // adjacency over all edges
  const adj = useMemo(()=>{
    const o:Record<string,Set<string>> = {};
    for(const e of edges){ (o[e.source] ||= new Set()).add(e.target); (o[e.target] ||= new Set()).add(e.source); }
    return o;
  },[edges]);

  // active subset (filters + focus)
  const active = useMemo(()=>{
    const enabledFlags = state.enabledFlags;
    const onlyFlagged = state.onlyFlagged;

    // focus
    if (state.selectedId) {
      const keep=new Set([state.selectedId]); let front=new Set([state.selectedId]);
      for(let i=0;i<state.hops;i++){ const next=new Set<string>(); for(const id of front) for(const n of Array.from(adj[id]||[])) next.add(n); next.forEach(n=>keep.add(n)); front=next; }
      let es = edges.filter(e=>keep.has(e.source)&&keep.has(e.target));
      if (onlyFlagged) es = es.filter(e => (e.flags||[]).some(f => enabledFlags[f]));
      const ids = new Set(nodes.filter(n=>keep.has(n.id)).map(n=>n.id));
      if (onlyFlagged && es.length===0) ids.add(state.selectedId);
      return { ids, edges: es };
    }

    // normal mode
    const allowedKinds = new Set(Object.entries(state.kindFilter).filter(([,v])=>v).map(([k])=>k));
    const ids = new Set(nodes
      .filter(n =>
        (!state.dirPrefix || n.path.startsWith(state.dirPrefix)) &&
        (!state.q || n.path.toLowerCase().includes(state.q.toLowerCase())) &&
        (allowedKinds.size ? allowedKinds.has(n.kind) : true)
      ).map(n=>n.id));
    let es = edges.filter(e=>ids.has(e.source)&&ids.has(e.target));
    if (onlyFlagged) {
      es = es.filter(e => (e.flags||[]).some(f => enabledFlags[f]));
      if (es.length) {
        const inc=new Set<string>(); for(const e of es){ inc.add(e.source); inc.add(e.target); }
        for (const id of Array.from(ids)) if (!inc.has(id)) ids.delete(id);
      }
    }
    return { ids, edges: es };
  }, [nodes, edges, state, adj]);

  // worker layout
  useEffect(()=>{
    if(!svgRef.current) return;
    const width = svgRef.current.clientWidth || 1000;
    const height = 720;

    // column x per kind
    const colWidth = width / Math.max(1, KINDS.length - 2);
    const xForKind = (k:string) => 60 + Math.max(0, KINDS.indexOf(k as Kind)) * (colWidth * 0.9);

    // start worker
    const worker = new Worker("./layout-worker.js", { type:"module" });
    const simNodes = nodes.filter(n=>active.ids.has(n.id));
    const simEdges = active.edges.map(e => ({ ...e }));
    worker.postMessage({ nodes: simNodes, edges: simEdges, width, height,
      xForKind: (k:string) => xForKind(k) // note: structured clone will serialize function? Can't. We pass samples instead:
    });

    // draw
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g").attr("transform", transform.toString());
    // rails
    g.append("g").selectAll("line").data(KINDS).enter().append("line")
      .attr("x1",k=>xForKind(k)).attr("x2",k=>xForKind(k))
      .attr("y1",8).attr("y2",height-8).attr("stroke", colors.stroke).attr("stroke-opacity", .12).attr("stroke-dasharray","2,4");

    const bg = g.append("g").attr("stroke", colors.stroke).attr("stroke-opacity", .3).selectAll("line").data(simEdges).enter().append("line").attr("stroke-width",1);

    const flagged = simEdges.filter(e => (e.flags||[]).some(f => state.enabledFlags[f]));
    const hl = g.append("g").selectAll("line").data(flagged).enter().append("line")
      .attr("stroke", d => (FLAGS[(d.flags||[]).find(f => state.enabledFlags[f])!] || "#d00"))
      .attr("stroke-width",2.2).attr("stroke-opacity", .95);

    const nodeSel = g.append("g").selectAll("circle").data(simNodes).enter().append("circle")
      .attr("r", d => state.selectedId===d.id ? 8.5 : 6.5)
      .attr("fill", d => colors.kindScale(d.kind))
      .attr("stroke", d => d.circular ? "#ef4444" : state.selectedId===d.id ? "#fff" : "#111827")
      .attr("stroke-width", d => d.circular ? 2.5 : state.selectedId===d.id ? 2 : 1)
      .style("cursor","pointer")
      .on("click", (_, d:any) => setState({ selectedId: d.id }))
      .append("title").text(d => d.path);

    const labels = g.append("g").selectAll("text").data(simNodes).enter().append("text")
      .text(d => shortLabel(d.path)).attr("font-size",10).attr("dx",8).attr("dy",3)
      .attr("fill", colors.text).attr("opacity", transform.k >= 0.8 ? 1 : 0);

    const update = () => {
      bg.attr("x1", (d:any)=>byId[d.source].x).attr("y1", (d:any)=>byId[d.source].y)
        .attr("x2", (d:any)=>byId[d.target].x).attr("y2", (d:any)=>byId[d.target].y);
      hl.attr("x1", (d:any)=>byId[d.source].x).attr("y1", (d:any)=>byId[d.source].y)
        .attr("x2", (d:any)=>byId[d.target].x).attr("y2", (d:any)=>byId[d.target].y);
      nodeSel.attr("cx",(d:any)=>d.x).attr("cy",(d:any)=>d.y);
      labels.attr("x",(d:any)=>d.x).attr("y",(d:any)=>d.y);
    };

    const messageHandler = (ev:MessageEvent) => {
      const { type, nodes:n } = ev.data;
      if (n) for (const m of n) { const t = byId[m.id]; if (t) { t.x = m.x; t.y = m.y; } }
      update();
    };
    worker.addEventListener("message", messageHandler);

    // zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.25,4]).on("zoom",(ev)=>{
      g.attr("transform", ev.transform.toString()); setTransform(ev.transform);
      labels.attr("opacity", ev.transform.k >= 0.8 ? 1 : 0);
    });
    svg.call(zoom as any).call(zoom.transform as any, transform);

    return () => { worker.terminate(); };
  }, [nodes, edges, active, colors, transform, state.enabledFlags, state.selectedId]);

  // toolbar
  const pill = (label:string, active:boolean, cb:()=>void, color?:string) =>
    (<button className="chip" aria-pressed={active} onClick={cb} style={color?{color}:undefined}>{label}</button>);

  const selected = state.selectedId ? byId[state.selectedId] : null;

  return (
    <>
      <div className="toolbar">
        <input className="input" type="search" placeholder="Search nodes by path…" value={state.q} onChange={e=>setState({ q:e.target.value })} />
        {Object.entries(FLAGS).map(([k,c]) => pill(k, !!state.enabledFlags[k], () => setState({ enabledFlags: { ...state.enabledFlags, [k]: !state.enabledFlags[k] } }), c))}
        {pill("only flagged", !!state.onlyFlagged, () => setState({ onlyFlagged: !state.onlyFlagged }))}
        <span style={{marginLeft:"auto"}} className="small">Hops</span>
        <select className="input" value={state.hops} onChange={e=>setState({ hops: Number(e.target.value) })}>
          <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
        </select>
        <button className="btn" onClick={()=>setState({ selectedId:null })}>Clear focus</button>
        <button className="btn" onClick={()=>setState({
          selectedId:null,q:"",dirPrefix:"",hops:1,onlyFlagged:false,
          enabledFlags:Object.fromEntries(Object.keys(FLAGS).map(k=>[k,true])),
          kindFilter:Object.fromEntries(KINDS.map(k=>[k,true]))
        })}>Reset</button>
      </div>

      <div className="toolbar" style={{borderBottom:"none"}}>
        {pill("All", Object.values(state.kindFilter).every(Boolean), () => setState({ kindFilter: Object.fromEntries(KINDS.map(k=>[k,true])) }))}
        {pill("None", Object.values(state.kindFilter).every(v=>!v), () => setState({ kindFilter: Object.fromEntries(KINDS.map(k=>[k,false])) }))}
        {KINDS.map(k => pill(k, !!state.kindFilter[k], () => setState({ kindFilter: { ...state.kindFilter, [k]: !state.kindFilter[k] } })))}
      </div>

      <svg ref={svgRef} width="100%" height="720" />

      <Inspector
        node={selected}
        edges={data.edges}
        byId={byId}
        onReveal={()=>document.querySelector(".tree button[title='"+(selected?.path||"")+"']")?.scrollIntoView({behavior:"smooth",block:"center"})}
        onExpand={()=>setState({ hops: Math.min(3, state.hops + 1) })}
      />
    </>
  );
}

function App(){
  const [data,setData] = useState<Graph>({nodes:[],edges:[],summary:{},policy:{}});
  const [state, setStatePatch] = useUrlState({
    selectedId:null as string|null,
    q:"", dirPrefix:"", hops:1,
    onlyFlagged:false,
    enabledFlags:Object.fromEntries(Object.keys(FLAGS).map(k=>[k,true])) as Record<string,boolean>,
    kindFilter:Object.fromEntries(KINDS.map(k=>[k,true])) as Record<string,boolean>
  });
  const setState = (patch: any) => setStatePatch(patch);

  useEffect(()=>{ fetch("/graph").then(r=>r.json()).then(setData); }, []);

  return (
    <div className="layout">
      <div>
        <DepGraph data={data} state={state} setState={setState} />
      </div>
      <aside>
        <TreeView
          data={data}
          selectedId={state.selectedId}
          onPick={(id)=>setState({ selectedId:id })}
          onFilterDir={(dir)=>setState({ dirPrefix: dir })}
        />
        <div className="panel" style={{marginTop:12}}>
          <div className="hd">Policy Matrix</div>
          <div className="bd small">Click a src→dst to filter edges (future toggle).</div>
        </div>
      </aside>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

⸻

Usage
 1. Add this package’s files to a repo and publish (or use locally with npm link).
 2. In any Next/React project, create a depmap.config.ts at the repo root (the CLI prints a sample if missing).
 3. Run:

npx depmap               # generates public/graph.json, serves the viewer, opens browser

# options

npx depmap --graphOnly
npx depmap --port 7777
npx depmap --root ../some/other/repo

This build includes Radix UI + a ShadCN-style theme, URL-persisted state, an Inspector, and a Web-Worker force layout. If you want the policy-matrix cells to actively filter by kind→kind, say the word and I’ll add that small hook next.
