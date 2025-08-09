# Enhancements

## 1) Diffs (vs a base graph from origin/main or a file)

## 2) Git churn & recency plugin (annotates nodes with churn, commit count, last author/date)

## 3) Node/File/Path selection with a Paths view (shortest path; highlight on graph)

## 4) Three alternative views that are easier than a spiderweb:

## 5) Sankey (flows by kind → kind)

## 6) Matrix (adjacency heatmap; clickable to filter)

## 7) Treemap (folder hierarchy sized by degree or churn)

⸻

1) New plugin: Git churn & recency

src/plugins/churn.mjs

import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

export function pluginChurn({ since = "12 months ago" } = {}) {
  return {
    name: "git-churn",
    async apply(ctx) {
      // 1) File-level churn (add+del), commits, last author/date
      // We query two logs to keep parsing simple and fast.
      const cwd = ctx.root;

      // Churn totals
      // git log --since='12 months ago' --numstat --format='%H %ad' --date=iso
      let churnText = "";
      try {
        const { stdout } = await execFileP("git",
          ["log", `--since=${since}`, "--numstat", "--format=%H %ad", "--date=iso"],
          { cwd, maxBuffer: 8 * 1024 * 1024 });
        churnText = stdout;
      } catch { ctx.log("git-churn: no git history or command failed"); return; }

      const fileStats = new Map(); // path -> { adds, dels, commits }
      let lastCommitHeader = null;
      for (const line of churnText.split(/\r?\n/)) {
        if (!line) continue;
        if (/^[0-9a-f]{7,} /.test(line)) { lastCommitHeader = true; continue; }
        const m = line.match(/^(\d+|-)\s+(\d+|-)\s+(.+)$/);
        if (!m) continue;
        const adds = m[1] === "-" ? 0 : +m[1];
        const dels = m[2] === "-" ? 0 : +m[2];
        const file = m[3].replace(/\\/g, "/");
        const cur = fileStats.get(file) || { adds: 0, dels: 0, commits: 0 };
        cur.adds += adds; cur.dels += dels;
        cur.commits += lastCommitHeader ? 1 : 0;
        lastCommitHeader = false;
        fileStats.set(file, cur);
      }

      // Last author/date
      // git log -1 --pretty=format:%an%x09%ad --date=iso -- path
      const once = async (file) => {
        try {
          const { stdout } = await execFileP("git",
            ["log", "-1", "--pretty=format:%an\t%ad", "--date=iso", "--", file],
            { cwd });
          const [author, date] = stdout.split("\t");
          return { author, date };
        } catch { return { author: null, date: null }; }
      };

      // Annotate nodes
      let annotated = 0;
      for (const n of ctx.graph.nodes) {
        const s = fileStats.get(n.path);
        if (!s) continue;
        const meta = n.meta ||= {};
        meta.churnAdds = s.adds;
        meta.churnDels = s.dels;
        meta.churn = s.adds + s.dels;
        meta.commits = s.commits;
        const { author, date } = await once(n.path);
        if (author) meta.lastAuthor = author;
        if (date)   meta.lastTouched = date;
        annotated++;
      }
      ctx.log(`git-churn: annotated ${annotated} nodes`);
    }
  };
}

Usage (in your project’s depmap.config.ts):

import { pluginChurn } from "depmap/plugins/churn.mjs";

export default {
  /*...existing config...*/
  plugins: [
    pluginChurn({ since: "12 months ago" })
  ]
} as const;

⸻

2) Graph diff support (base vs current)

src/diff-graph.mjs

export function diffGraphs(base, cur) {
  const baseNodes = new Map(base.nodes.map(n => [n.id, n]));
  const curNodes  = new Map(cur.nodes.map(n => [n.id, n]));

  const baseEdges = new Set(base.edges.map(e => `${e.source}→${e.target}|${(e.flags||[]).sort().join(",")}`));
  const curEdges  = new Set(cur.edges.map(e => `${e.source}→${e.target}|${(e.flags||[]).sort().join(",")}`));

  // Nodes
  const addedNodes = cur.nodes.filter(n => !baseNodes.has(n.id));
  const removedNodes = base.nodes.filter(n => !curNodes.has(n.id));
  const changedNodes = cur.nodes.filter(n => {
    const b = baseNodes.get(n.id);
    return b && (b.kind !== n.kind || JSON.stringify(b.tags||[]) !== JSON.stringify(n.tags||[]));
  }).map(n => ({ id: n.id, before: baseNodes.get(n.id), after: n }));

  // Edges
  const addedEdgeKeys = [...curEdges].filter(k => !baseEdges.has(k));
  const removedEdgeKeys = [...baseEdges].filter(k => !curEdges.has(k));

  // Make edge objects (without re-parsing flags beyond the key)
  const parse = (k) => {
    const [st, fl] = k.split("|");
    const [s, t] = st.split("→");
    return { source: s, target: t, flags: fl ? fl.split(",").filter(Boolean) : [] };
  };

  const addedEdges = addedEdgeKeys.map(parse);
  const removedEdges = removedEdgeKeys.map(parse);

  // Same endpoints but different flags (changed)
  const baseEdgeByEndpoints = new Map(base.edges.map(e => [`${e.source}→${e.target}`, (e.flags||[]).slice().sort().join(",")]));
  const curEdgeByEndpoints  = new Map(cur.edges.map(e  => [`${e.source}→${e.target}`, (e.flags||[]).slice().sort().join(",")]));
  const changedEdges = [];
  for (const [key, curFlagsStr] of curEdgeByEndpoints.entries()) {
    if (!baseEdgeByEndpoints.has(key)) continue;
    const baseFlagsStr = baseEdgeByEndpoints.get(key);
    if (baseFlagsStr !== curFlagsStr) {
      const [source, target] = key.split("→");
      changedEdges.push({
        source, target,
        before: baseFlagsStr ? baseFlagsStr.split(",") : [],
        after: curFlagsStr ? curFlagsStr.split(",") : []
      });
    }
  }

  return {
    nodes: { added: addedNodes, removed: removedNodes, changed: changedNodes },
    edges: { added: addedEdges, removed: removedEdges, changed: changedEdges },
    summary: {
      addedNodes: addedNodes.length,
      removedNodes: removedNodes.length,
      changedNodes: changedNodes.length,
      addedEdges: addedEdges.length,
      removedEdges: removedEdges.length,
      changedEdges: changedEdges.length
    }
  };
}

⸻

3) Server: serve base graph and diff

src/server.mjs (replace with this)

import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import sirv from "sirv";
import { diffGraphs } from "./diff-graph.mjs";

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

  function sendJson(res, obj, code=200) {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(obj));
  }

  const server = http.createServer((req, res) => {
    if (req.url === "/graph") {
      const p = path.join(projectRoot, "public", "graph.json");
      if (!fs.existsSync(p)) return sendJson(res, { error:"graph.json not found" }, 404);
      return fs.createReadStream(p).pipe(res);
    }
    if (req.url === "/graph-base") {
      const p = path.join(projectRoot, ".depmap", "base-graph.json");
      if (!fs.existsSync(p)) return sendJson(res, { nodes:[], edges:[] });
      return fs.createReadStream(p).pipe(res);
    }
    if (req.url === "/diff") {
      const curP = path.join(projectRoot, "public", "graph.json");
      const baseP = path.join(projectRoot, ".depmap", "base-graph.json");
      if (!fs.existsSync(curP)) return sendJson(res, { error:"missing current graph" }, 404);
      const cur = JSON.parse(fs.readFileSync(curP, "utf8"));
      const base = fs.existsSync(baseP) ? JSON.parse(fs.readFileSync(baseP, "utf8")) : { nodes:[], edges:[] };
      return sendJson(res, diffGraphs(base, cur));
    }
    if (req.url === "/events") return sseHandler(req, res);
    serveViewer(req, res);
  });

  await new Promise(r => server.listen(port, r));
  return { url: `http://localhost:${port}`, broadcast, close: () => server.close() };
}

⸻

4) CLI: set a base for diffs and keep it fresh in --watch

bin/depmap.mjs (add flags + base loader; show only changed parts)

// ...top remains same...
import { execFileSync } from "node:child_process";

async function build({ projectRoot, config }) {
  // unchanged; writes public/graph.json
  // returns graph
}

// NEW: load base graph by git rev or file
function writeBaseGraph({ projectRoot, baseRev, baseFile }) {
  const outDir = path.join(projectRoot, ".depmap");
  const outFile = path.join(outDir, "base-graph.json");
  fs.mkdirSync(outDir, { recursive: true });

  let baseJson = null;
  if (baseFile && fs.existsSync(baseFile)) {
    baseJson = fs.readFileSync(baseFile, "utf8");
  } else if (baseRev) {
    try {
      baseJson = execFileSync("git", ["show", `${baseRev}:public/graph.json`], { cwd: projectRoot, encoding: "utf8", maxBuffer: 8 *1024* 1024 });
    } catch {
      console.warn(`[depmap] could not read graph from ${baseRev}. Did you ever run depmap on that branch?`);
    }
  }
  if (baseJson) {
    fs.writeFileSync(outFile, baseJson);
    console.log(`[depmap] wrote .depmap/base-graph.json from ${baseFile ? baseFile : baseRev}`);
  }
}

async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: ["root", "port", "baseRev", "baseFile"],
    boolean: ["open", "graphOnly", "write", "force", "watch"],
    alias: { r: "root", p: "port", o: "open" },
    default: { root: process.cwd(), port: "5656", open: true, graphOnly: false, write: false, force: false, watch: false, baseRev: "" }
  });

  const cmd = argv._[0];
  const projectRoot = path.resolve(argv.root);

  if (cmd === "infer") { /*unchanged*/ }

  const cfgPath = /*unchanged*/;
  const config = await loadConfig(cfgPath);

  await build({ projectRoot, config });

  // NEW: initialize base graph for diffs (optional)
  if (argv.baseRev || argv.baseFile) {
    writeBaseGraph({ projectRoot, baseRev: argv.baseRev, baseFile: argv.baseFile });
  }

  if (argv.graphOnly && !argv.watch) return;

  const viewerRoot = path.join(__dirname, "../viewer");
  const srv = await serve({ projectRoot, viewerRoot, port: Number(argv.port) });
  if (argv.open) await open(srv.url);

  if (argv.watch) {
    // unchanged watcher registration + broadcast when graph updates
    const rebuild = debounce(async () => {
      try {
        await build({ projectRoot, config });
        srv.broadcast("graph", { at: Date.now() });
        // If base graph exists, broadcast diff as well
        srv.broadcast("diff", { at: Date.now() });
      } catch (e) { console.error("[depmap] rebuild failed:", e?.message || e); }
    }, 250);
    // chokidar listeners as before...
  }
}

Run with a base:

npx depmap --watch --baseRev origin/main

# or from a saved file

npx depmap --watch --baseFile .depmap/snapshots/main.json

⸻

5) Viewer: diff mode, churn overlay, path finder, multiple views

viewer/index.html (add d3-sankey)

<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18",
    "react-dom/client": "https://esm.sh/react-dom@18/client",
    "d3": "https://esm.sh/d3@7",
    "d3-sankey": "https://esm.sh/d3-sankey@0.12.3"
  }
}
</script>

viewer/main.tsx (replace top-level shell; uses sub-views)

import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import GraphView from "./views/GraphView.tsx";
import SankeyView from "./views/SankeyView.tsx";
import MatrixView from "./views/MatrixView.tsx";
import TreemapView from "./views/TreemapView.tsx";
import PathsView from "./views/PathsView.tsx";

type NodeT = { id:string; path:string; kind:string; tags?:string[]; circular?:boolean; meta?:Record<string,any> };
type EdgeT = { source:string; target:string; flags?:string[] };
type Graph = { nodes:NodeT[]; edges:EdgeT[]; summary?:any; policy?:any };
type Diff = {
  nodes:{added:NodeT[];removed:NodeT[];changed:{id:string;before:any;after:any}[]};
  edges:{added:EdgeT[];removed:EdgeT[];changed:{source:string;target:string;before:string[];after:string[]}[]};
  summary: any;
};

function useUrlState<T extends Record<string, any>>(defaults: T) {
  const [state, setState] = useState<T>(() => {
    const u = new URL(window.location.href); const out:any = { ...defaults };
    for (const k of Object.keys(defaults)) {
      const qk = `dg.${k}`; if (!u.searchParams.has(qk)) continue;
      try { out[k] = JSON.parse(u.searchParams.get(qk)!); } catch {}
    }
    return out;
  });
  const patch = (next: Partial<T>) => setState(s => {
    const merged = { ...s, ...next }; const u=new URL(window.location.href);
    for (const [k,v] of Object.entries(merged)) u.searchParams.set(`dg.${k}`, JSON.stringify(v));
    history.replaceState(null,"",u.toString()); return merged;
  });
  return [state, patch] as const;
}

function App(){
  const [data,setData]=useState<Graph>({nodes:[],edges:[]});
  const [base,setBase]=useState<Graph>({nodes:[],edges:[]});
  const [diff,setDiff]=useState<Diff|null>(null);
  const [state, setState] = useUrlState({
    view: "graph" as "graph"|"sankey"|"matrix"|"treemap"|"paths",
    selectedId: null as string|null,
    q: "", dirPrefix: "", hops: 1,
    onlyFlagged: false,
    lowCoverageOnly: false,
    churnOverlay: false,
    enabledFlags: {} as Record<string,boolean>,
    kindFilter: {} as Record<string,boolean>
  });

  // initial fetch
  useEffect(()=>{ fetch("/graph").then(r=>r.json()).then(setData); fetch("/graph-base").then(r=>r.json()).then(setBase); fetch("/diff").then(r=>r.json()).then(setDiff); }, []);
  // live updates via SSE
  useEffect(()=>{
    const es = new EventSource("/events");
    const reload = () => { fetch("/graph").then(r=>r.json()).then(setData); fetch("/diff").then(r=>r.json()).then(setDiff); };
    es.addEventListener("graph", reload);
    es.addEventListener("diff", reload);
    return () => es.close();
  }, []);

  const view = state.view;
  const common = { data, base, diff, state, setState };

  return (
    <div className="layout">
      <div>
        <header className="toolbar">
          <select className="input" value={view} onChange={e=>setState({ view: e.target.value })}>
            <option value="graph">Graph</option>
            <option value="paths">Paths</option>
            <option value="sankey">Sankey (kind→kind)</option>
            <option value="matrix">Matrix</option>
            <option value="treemap">Treemap</option>
          </select>
          <input className="input" type="search" placeholder="Search…" value={state.q} onChange={e=>setState({ q:e.target.value })} />
          <button className="btn" onClick={()=>setState({ selectedId:null,q:"",dirPrefix:"",hops:1,onlyFlagged:false,lowCoverageOnly:false })}>Reset</button>
          <span style={{marginLeft:"auto"}} className="small">{diff ? `Δ nodes: +${diff.summary.addedNodes}/-${diff.summary.removedNodes}, Δ edges: +${diff.summary.addedEdges}/-${diff.summary.removedEdges}` : ""}</span>
        </header>
        {view === "graph"   && <GraphView {...common} />}
        {view === "paths"   && <PathsView {...common} />}
        {view === "sankey"  && <SankeyView {...common} />}
        {view === "matrix"  && <MatrixView {...common} />}
        {view === "treemap" && <TreemapView {...common} />}
      </div>
      <aside>
        {/*Keep your existing Tree + Inspector here if desired*/}
        <div className="panel"><div className="hd">Diff</div><div className="bd small">
          {diff ? (
            <ul style={{margin:0, paddingLeft:16}}>
              <li>Added nodes: {diff.summary.addedNodes}</li>
              <li>Removed nodes: {diff.summary.removedNodes}</li>
              <li>Changed nodes: {diff.summary.changedNodes}</li>
              <li>Added edges: {diff.summary.addedEdges}</li>
              <li>Removed edges: {diff.summary.removedEdges}</li>
              <li>Changed edges: {diff.summary.changedEdges}</li>
            </ul>
          ) : "No base graph."}
        </div></div>
      </aside>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

⸻

6) Graph view with diff overlay and churn/coverage hints

viewer/views/GraphView.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

type NodeT = { id:string; path:string; kind:string; tags?:string[]; circular?:boolean; meta?:Record<string,any>; x?:number; y?:number };
type EdgeT = { source:string; target:string; flags?:string[] };
type Graph = { nodes:NodeT[]; edges:EdgeT[] };
type Diff = { edges:{added:EdgeT[]; removed:EdgeT[]}; nodes:{added:NodeT[]; removed:NodeT[]} };

const KINDS = ["page","layout-block","content-block","component","ui","animation","styleguide","types","tokens","server-lib","api","prisma","other"] as const;
const FLAGS: Record<string,string> = {
  "policy":"#b000b5","policy:info":"#8b5cf6","server-in-client":"#ff3b30"
};

function shortLabel(p:string){
  const file = p.split("/").pop()||"";
  const parent = p.split("/").slice[-2,-1](0) || "root";
  const base = (["app","components"].includes(parent)?"root":parent);
  if (/^page\.(t|j)sx?$/.test(file)) return `${base} (p)`;
  if (/^route\.(t|j)sx?$/.test(file)) return`${base} (r)`;
  if (/^index\.(t|j)sx?$/.test(file)) return `${base} (i)`;
  return file.replace(/\.(t|j)sx?$/,"");
}

export default function GraphView({ data, diff, state, setState }:{
  data:Graph; diff:Diff|null; state:any; setState:(p:any)=>void;
}) {
  const svgRef = useRef<SVGSVGElement|null>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);

  const nodes = useMemo(()=>data.nodes.map(n=>({...n})),[data.nodes]);
  const edges = useMemo(()=>data.edges.map(e=>({...e})),[data.edges]);
  const byId = useMemo(()=>Object.fromEntries(nodes.map(n=>[n.id,n])) as Record<string,NodeT>,[nodes]);

  // Filters
  const active = useMemo(()=>{
    const ids = new Set(nodes
      .filter(n =>
        (!state.dirPrefix || n.path.startsWith(state.dirPrefix)) &&
        (!state.q || n.path.toLowerCase().includes(state.q.toLowerCase()))
      ).map(n=>n.id));
    let es = edges.filter(e=>ids.has(e.source)&&ids.has(e.target));
    if (state.lowCoverageOnly) {
      for (const id of Array.from(ids)) {
        const n = byId[id];
        if (!n?.meta || typeof n.meta.coverage !== "number" || n.meta.coverage >= 60) ids.delete(id);
      }
      es = es.filter(e => ids.has(e.source)&&ids.has(e.target));
    }
    return { ids, edges: es };
  }, [nodes, edges, state.q, state.dirPrefix, state.lowCoverageOnly]);

  useEffect(()=>{
    if(!svgRef.current) return;
    const width = svgRef.current.clientWidth || 1000;
    const height = 720;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const colors = {
      stroke: "#4b5563",
      text: "#cbd5e1",
      kindScale: d3.scaleOrdinal<string,string>().domain(KINDS as any).range(d3.schemeTableau10 as any)
    };

    // position columns by kind
    const colWidth = width / Math.max(1, KINDS.length - 2);
    const xForKind = (k:string) => 60 + Math.max(0, KINDS.indexOf(k as any)) * (colWidth * 0.9);

    // workerless: small graphs are fine; you can swap to your worker if preferred
    const simNodes = nodes.filter(n=>active.ids.has(n.id));
    const simEdges = active.edges;

    const sim = d3.forceSimulation(simNodes)
      .force("link", d3.forceLink(simEdges).id(d=>d.id).distance(55).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-180))
      .force("x", d3.forceX(d=>xForKind((d as any).kind)).strength(0.6))
      .force("y", d3.forceY(height/2).strength(0.05))
      .force("collide", d3.forceCollide(15));

    const g = svg.append("g").attr("transform", transform.toString());

    // rails
    g.append("g").selectAll("line").data(KINDS).enter().append("line")
      .attr("x1",k=>xForKind(k)).attr("x2",k=>xForKind(k))
      .attr("y1",8).attr("y2",height-8).attr("stroke", colors.stroke).attr("stroke-opacity", .12).attr("stroke-dasharray","2,4");

    const bg = g.append("g").attr("stroke", colors.stroke).attr("stroke-opacity", .3)
      .selectAll("line").data(simEdges).enter().append("line").attr("stroke-width",1);

    // Diff overlay: added in green; removed in red dashed (only if both endpoints currently exist)
    if (diff) {
      const added = diff.edges.added.filter(e => byId[e.source] && byId[e.target]);
      const removed = diff.edges.removed.filter(e => byId[e.source] && byId[e.target]);
      g.append("g").selectAll("line").data(added).enter().append("line")
        .attr("stroke","#22c55e").attr("stroke-width",2.2).attr("stroke-opacity",.95)
        .attr("class","edge-added")
        .attr("x1",d=>byId[d.source].x||0).attr("y1",d=>byId[d.source].y||0)
        .attr("x2",d=>byId[d.target].x||0).attr("y2",d=>byId[d.target].y||0);
      g.append("g").selectAll("line").data(removed).enter().append("line")
        .attr("stroke","#ef4444").attr("stroke-dasharray","4,4").attr("stroke-width",2)
        .attr("class","edge-removed")
        .attr("x1",d=>byId[d.source].x||0).attr("y1",d=>byId[d.source].y||0)
        .attr("x2",d=>byId[d.target].x||0).attr("y2",d=>byId[d.target].y||0);
    }

    const nodeSel = g.append("g").selectAll("circle").data(simNodes).enter().append("circle")
      .attr("r", d => state.selectedId===d.id ? 9 : 7)
      .attr("fill", d => colors.kindScale((d as any).kind))
      .attr("stroke", d => {
        if ((d as any).circular) return "#ef4444";
        if (state.churnOverlay && (d as any).meta?.churn) return "#f59e0b";
        if ((d as any).meta?.coverage != null && (d as any).meta.coverage < 60) return "#f59e0b";
        return state.selectedId===d.id ? "#fff" : "#111827";
      })
      .attr("stroke-width", d => (d as any).circular ? 2.5 : (state.selectedId===d.id ? 2 : 1))
      .style("cursor","pointer")
      .on("click", (_, d:any) => setState({ selectedId: d.id }))
      .append("title").text(d => (d as any).path);

    const labels = g.append("g").selectAll("text").data(simNodes).enter().append("text")
      .text(d => shortLabel((d as any).path)).attr("font-size",10).attr("dx",8).attr("dy",3)
      .attr("fill", colors.text).attr("opacity", transform.k >= 0.8 ? 1 : 0);

    sim.on("tick", () => {
      bg.attr("x1", (d:any)=>byId[d.source].x).attr("y1", (d:any)=>byId[d.source].y)
        .attr("x2", (d:any)=>byId[d.target].x).attr("y2", (d:any)=>byId[d.target].y);
      nodeSel.attr("cx",(d:any)=>d.x).attr("cy",(d:any)=>d.y);
      labels.attr("x",(d:any)=>d.x).attr("y",(d:any)=>d.y);
      // keep diff overlay positioned if present
      if (diff) {
        svg.selectAll(".edge-added").attr("x1",(d:any)=>byId[d.source].x).attr("y1",(d:any)=>byId[d.source].y)
          .attr("x2",(d:any)=>byId[d.target].x).attr("y2",(d:any)=>byId[d.target].y);
        svg.selectAll(".edge-removed").attr("x1",(d:any)=>byId[d.source].x).attr("y1",(d:any)=>byId[d.source].y)
          .attr("x2",(d:any)=>byId[d.target].x).attr("y2",(d:any)=>byId[d.target].y);
      }
    });

    const zoom = d3.zoom<SVGSVGElement,unknown>().scaleExtent([0.25,4]).on("zoom",(ev)=>{
      g.attr("transform", ev.transform.toString()); 
      (labels as any).attr("opacity", ev.transform.k >= 0.8 ? 1 : 0);
    });
    svg.call(zoom as any).call(zoom.transform as any, transform);

    return () => { sim.stop(); };
  }, [nodes, edges, diff, state, transform]);

  return (
    <>
      <div className="toolbar" style={{borderBottom:"none"}}>
        <button className="chip" aria-pressed={!!state.churnOverlay} onClick={()=>setState({ churnOverlay: !state.churnOverlay })}>churn overlay</button>
        <button className="chip" aria-pressed={!!state.lowCoverageOnly} onClick={()=>setState({ lowCoverageOnly: !state.lowCoverageOnly })}>coverage&lt;60%</button>
        <span className="small" style={{marginLeft:12}}>
          {state.selectedId ? nodes.find(n=>n.id===state.selectedId)?.meta ?
            `last: ${nodes.find(n=>n.id===state.selectedId)?.meta?.lastTouched || "—"} · churn: ${nodes.find(n=>n.id===state.selectedId)?.meta?.churn ?? "—"} · commits: ${nodes.find(n=>n.id===state.selectedId)?.meta?.commits ?? "—"}` :
            "" : ""}
        </span>
      </div>
      <svg ref={svgRef} width="100%" height="720" />
    </>
  );
}

⸻

7) Paths view (shortest path, source/target pickers)

viewer/views/PathsView.tsx

import React, { useMemo, useState } from "react";

type NodeT = { id:string; path:string; kind:string };
type EdgeT = { source:string; target:string };
type Graph = { nodes:NodeT[]; edges:EdgeT[] };

export default function PathsView({ data, state, setState }:{
  data:Graph; state:any; setState:(p:any)=>void;
}) {
  const [src, setSrc] = useState<string>("");
  const [dst, setDst] = useState<string>("");
  const [path, setPath] = useState<string[]|null>(null);

  const byId = useMemo(()=>Object.fromEntries(data.nodes.map(n=>[n.id,n])) as Record<string,NodeT>,[data.nodes]);
  const adj = useMemo(()=>{
    const g:Record<string,string[]> = {};
    for (const e of data.edges) (g[e.source] ||= []).push(e.target);
    return g;
  }, [data.edges]);

  function shortest(a:string, b:string) {
    if (!a || !b || a === b) return null;
    const q=[a], prev=new Map<string,string|null>([[a,null]]);
    for (let i=0;i<q.length;i++){
      const v=q[i]; if (v===b) break;
      for (const w of (adj[v]||[])){
        if (!prev.has(w)) { prev.set(w,v); q.push(w); }
      }
    }
    if (!prev.has(b)) return null;
    const out=[]; let cur=b; while (cur){ out.push(cur); cur = prev.get(cur)!; }
    out.reverse(); return out;
  }

  function options(q:string){
    const qq=q.toLowerCase();
    return data.nodes
      .filter(n=>n.path.toLowerCase().includes(qq))
      .slice(0,20);
  }

  return (
    <div className="panel">
      <div className="hd">Paths</div>
      <div className="bd">
        <div className="small">Find shortest path (directed)</div>
        <div className="flex gap-2" style={{marginTop:8}}>
          <input className="input" placeholder="Source path…" value={src} onChange={e=>setSrc(e.target.value)} list="srcList" />
          <input className="input" placeholder="Target path…" value={dst} onChange={e=>setDst(e.target.value)} list="dstList" />
          <button className="btn" onClick={()=>setPath(shortest(src, dst))}>Find</button>
          <button className="btn" onClick={()=>setPath(null)}>Clear</button>
        </div>
        <datalist id="srcList">
          {options(src).map(n => <option key={n.id} value={n.id}/>)}
        </datalist>
        <datalist id="dstList">
          {options(dst).map(n => <option key={n.id} value={n.id}/>)}
        </datalist>

        {path ? (
          <div style={{marginTop:10}}>
            <div className="small">Path length: {path.length-1}</div>
            <ol style={{margin:0, paddingLeft:18}}>
              {path.map(id => <li key={id}><code>{id}</code></li>)}
            </ol>
          </div>
        ) : <div className="small" style={{marginTop:10}}>No path.</div>}
      </div>
    </div>
  );
}

⸻

8) Sankey (kind → kind flows)

viewer/views/SankeyView.tsx

import React, { useEffect, useMemo, useRef } from "react";
import { sankey, sankeyLinkHorizontal, sankeyLeft } from "d3-sankey";

type NodeT = { id:string; path:string; kind:string };
type EdgeT = { source:string; target:string };
type Graph = { nodes:NodeT[]; edges:EdgeT[] };

const KINDS = ["page","layout-block","content-block","component","ui","animation","styleguide","types","tokens","server-lib","api","prisma","other"] as const;

export default function SankeyView({ data }:{ data:Graph }) {
  const svgRef = useRef<SVGSVGElement|null>(null);

  const flows = useMemo(()=>{
    const byKind = (id:string) => data.nodes.find(n=>n.id===id)?.kind || "other";
    const map = new Map<string, number>(); // "a→b" -> count
    for (const e of data.edges) {
      const key = `${byKind(e.source)}→${byKind(e.target)}`;
      map.set(key, (map.get(key)||0)+1);
    }
    const nodes = Array.from(new Set(KINDS));
    const idx = new Map(nodes.map((k,i)=>[k,i]));
    const links = Array.from(map.entries())
      .map(([k,v]) => {
        const [s,t] = k.split("→");
        return { source: idx.get(s)!, target: idx.get(t)!, value: v };
      });
    return { nodes: nodes.map(k => ({ name:k })), links };
  }, [data]);

  useEffect(()=>{
    if(!svgRef.current) return;
    const width = svgRef.current.clientWidth || 1000, height = 600;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const S = sankey()
      .nodeAlign(sankeyLeft)
      .nodeWidth(12)
      .nodePadding(16)
      .extent([[8,8],[width-8,height-8]]);

    const graph = S({
      nodes: flows.nodes.map(d => Object.assign({}, d)),
      links: flows.links.map(d => Object.assign({}, d))
    } as any);

    const color = d3.scaleOrdinal(d3.schemeTableau10).domain(KINDS as any);

    svg.append("g").selectAll("rect").data(graph.nodes).enter().append("rect")
      .attr("x", d => (d as any).x0).attr("y", d => (d as any).y0)
      .attr("height", d => (d as any).y1 - (d as any).y0)
      .attr("width", d => (d as any).x1 - (d as any).x0)
      .attr("fill", d => color((d as any).name))
      .append("title").text(d => `${(d as any).name}`);

    const link = svg.append("g").attr("fill","none").selectAll("path")
      .data(graph.links).enter().append("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", d => d3.rgb(200,200,200).formatHex())
      .attr("stroke-opacity", .5)
      .attr("stroke-width", d => Math.max(1, (d as any).width));

    link.append("title").text(d => `${(d as any).source.name} → ${(d as any).target.name}: ${(d as any).value}`);

    svg.append("g").style("font","12px sans-serif").selectAll("text")
      .data(graph.nodes).enter().append("text")
      .attr("x", d => (d as any).x0 - 6)
      .attr("y", d => ((d as any).y1 + (d as any).y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .text(d => (d as any).name)
      .filter(d => (d as any).x0 < width / 2)
      .attr("x", d => (d as any).x1 + 6)
      .attr("text-anchor", "start");
  }, [flows]);

  return <svg ref={svgRef} width="100%" height="600" />;
}

⸻

9) Matrix (adjacency heatmap by kind→kind)

viewer/views/MatrixView.tsx

import React, { useMemo } from "react";

type NodeT = { id:string; kind:string };
type EdgeT = { source:string; target:string };
type Graph = { nodes:NodeT[]; edges:EdgeT[] };
const KINDS = ["page","layout-block","content-block","component","ui","animation","styleguide","types","tokens","server-lib","api","prisma","other"] as const;

export default function MatrixView({ data }:{ data:Graph }) {
  const M = useMemo(()=>{
    const byKind = (id:string) => data.nodes.find(n=>n.id===id)?.kind || "other";
    const N = KINDS.length;
    const m = Array.from({length:N}, ()=>Array.from({length:N}, ()=>0));
    for (const e of data.edges) {
      const i = KINDS.indexOf(byKind(e.source) as any);
      const j = KINDS.indexOf(byKind(e.target) as any);
      if (i>=0 && j>=0) m[i][j]++;
    }
    return m;
  }, [data]);

  const max = Math.max(1, ...M.flat());

  return (
    <div className="panel">
      <div className="hd">Matrix (kind → kind)</div>
      <div className="bd">
        <div className="small" style={{marginBottom:8}}>Click a cell to filter the Graph view later (not wired here).</div>
        <div style={{display:"grid", gridTemplateColumns:`120px repeat(${KINDS.length}, 1fr)`, gap:2}}>
          <div></div>
          {KINDS.map(k => <div key={k} className="small" style={{textAlign:"center"}}>{k}</div>)}
          {KINDS.map((row, i) => (
            <React.Fragment key={row}>
              <div className="small" style={{whiteSpace:"nowrap"}}>{row}</div>
              {KINDS.map((col, j) => {
                const v = M[i][j];
                const alpha = v ? Math.max(0.1, v / max) : 0;
                return (
                  <button key={`${i}-${j}`} className="btn" style={{height:28, background:`rgba(124,58,237,${alpha})`}}
                    title={`${row} → ${col}: ${v}`} onClick={() => {/*you can set a policyKindFilter in URL state*/}}>
                    {v || ""}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

⸻

10) Treemap (folder hierarchy sized by degree or churn)

viewer/views/TreemapView.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";

type NodeT = { id:string; path:string; meta?:Record<string,any> };
type EdgeT = { source:string; target:string };
type Graph = { nodes:NodeT[]; edges:EdgeT[] };

export default function TreemapView({ data }:{ data:Graph }) {
  const svgRef = useRef<SVGSVGElement|null>(null);
  const [metric,setMetric]=useState<"degree"|"churn">("degree");

  const deg = useMemo(()=>{
    const d=new Map<string,number>();
    for (const e of data.edges){ d.set(e.source,(d.get(e.source)||0)+1); d.set(e.target,(d.get(e.target)||0)+1); }
    return d;
  },[data.edges]);

  const root = useMemo(()=>{
    const tree:any = { name:"root", children:[] };
    const dir = new Map<string, any>([["",tree]]);
    for (const n of data.nodes) {
      const parts = n.path.split("/");
      let p = "";
      for (let i=0;i<parts.length-1;i++){
        p = p ? `${p}/${parts[i]}` : parts[i];
        if (!dir.has(p)) {
          const node = { name:parts[i], path:p, children:[] };
          dir.set(p,node);
          dir.get(p.substring(0,p.lastIndexOf("/")) || "").children.push(node);
        }
      }
      const fileNode = { name: parts.at(-1), path: n.path, value: metric==="churn" ? (n.meta?.churn||0) : (deg.get(n.id)||1) };
      dir.get(p).children.push(fileNode);
    }
    return tree;
  }, [data.nodes, deg, metric]);

  useEffect(()=>{
    if(!svgRef.current) return;
    const width = svgRef.current.clientWidth || 1000, height = 600;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const rootH = d3.hierarchy(root as any).sum((d:any)=>d.value || 0).sort((a,b)=> (b.value||0) - (a.value||0));
    d3.treemap<any>().size([width, height]).padding(2)(rootH as any);

    const color = d3.scaleSequential(d3.interpolatePlasma).domain([0, d3.max(rootH.leaves(), (d:any)=>d.value)||1]);

    const g = svg.append("g");
    const cell = g.selectAll("g").data(rootH.leaves()).enter().append("g")
      .attr("transform", (d:any) => `translate(${d.x0},${d.y0})`);

    cell.append("rect")
      .attr("width",(d:any)=>d.x1-d.x0)
      .attr("height",(d:any)=>d.y1-d.y0)
      .attr("fill",(d:any)=>color(d.value||0))
      .append("title").text((d:any)=>`${d.data.path} • ${d.value}`);

    cell.append("text")
      .attr("x",4).attr("y",12).attr("fill","#111")
      .attr("opacity", (d:any)=> (d.x1-d.x0)>80 ? .9 : 0)
      .text((d:any)=>d.data.name);
  }, [root, metric]);

  return (
    <>
      <div className="toolbar" style={{borderBottom:"none"}}>
        <label className="small">Size by:</label>
        <select className="input" value={metric} onChange={e=>setMetric(e.target.value as any)}>
          <option value="degree">degree (in+out)</option>
          <option value="churn">git churn (adds+dels)</option>
        </select>
      </div>
      <svg ref={svgRef} width="100%" height="600" />
    </>
  );
}

⸻

How to run the enhanced tool
 1. Add the files above to your package.
 2. Enable churn plugin in depmap.config.ts.
 3. Start with a base for diffs and watch mode:

npx depmap --watch --baseRev origin/main

 • The viewer will now:
 • show Graph with diff overlays, churn/coverage hints, Inspector as before,
 • Paths to find and list the shortest path,
 • Sankey to see high-level kind-to-kind flows,
 • Matrix to spot policy pressure points,
 • Treemap to understand folder hotspots by degree or churn.

If you want, I can also wire a Timeline view (per-file commit activity over months) and a minimap for large graphs.
