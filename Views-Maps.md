Great call. Here are drop-in additions for a Minimap, a Bubblemap (circle-packing) based on dependencies, and an Operational / Run-Order view (topological layering with cycle collapse). These plug into the viewer you already have.

⸻

viewer/components/Minimap.tsx

import React, { useMemo } from "react";

type NodeT = { id: string; x?: number; y?: number; kind?: string };

export default function Minimap({
  nodes,
  transform,   // d3.ZoomTransform-like {x,y,k}
  width,        // main svg width
  height,       // main svg height
  onJump        // (contentX, contentY) => void
}: {
  nodes: NodeT[];
  transform: { x: number; y: number; k: number };
  width: number;
  height: number;
  onJump: (cx: number, cy: number) => void;
}) {
  // content extents (fallbacks if sim not settled)
  const { minX, maxX, minY, maxY } = useMemo(() => {
    const xs = nodes.map(n => n.x ?? 0);
    const ys = nodes.map(n => n.y ?? 0);
    return {
      minX: Math.min(...xs, -width/2),
      maxX: Math.max(...xs, width/2),
      minY: Math.min(...ys, -height/2),
      maxY: Math.max(...ys, height/2)
    };
  }, [nodes, width, height]);

  const mmW = 220, mmH = 140, pad = 6;
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const sx = (x: number) => pad + ((x - minX) / spanX) * (mmW - pad*2);
  const sy = (y: number) => pad + ((y - minY) / spanY) * (mmH - pad*2);

  // visible window (content space)
  const view = {
    x: -transform.x / transform.k,
    y: -transform.y / transform.k,
    w: width / transform.k,
    h: height / transform.k
  };

  const rect = {
    x: sx(view.x),
    y: sy(view.y),
    w: (view.w / spanX) * (mmW - pad*2),
    h: (view.h / spanY) * (mmH - pad*2)
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const bbox = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const mx = e.clientX - bbox.left;
    const my = e.clientY - bbox.top;
    // map mini coords back to content coords
    const cx = minX + ((mx - pad) / (mmW - pad*2)) * spanX;
    const cy = minY + ((my - pad) / (mmH - pad*2)) * spanY;
    onJump(cx, cy);
  };

  return (
    <svg className="minimap" width={mmW} height={mmH} onClick={handleClick}>
      <rect x="0" y="0" width={mmW} height={mmH} rx="8" ry="8" className="minimap-bg"/>
      <g opacity={0.7}>
        {nodes.map(n => (
          <circle key={n.id} cx={sx(n.x ?? 0)} cy={sy(n.y ?? 0)} r={1.8} className="minimap-node" />
        ))}
      </g>
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} className="minimap-viewport"/>
    </svg>
  );
}


⸻

Update viewer/styles.css (append)

/* --- Minimap --- */
.minimap { position:absolute; right:12px; bottom:12px; border:1px solid var(--border); border-radius:.6rem; box-shadow:0 2px 10px rgba(0,0,0,.25); }
.minimap-bg { fill: color-mix(in oklab, var(--bg) 92%, transparent); }
.minimap-node { fill: #9ca3af; }
.minimap-viewport { fill: transparent; stroke: var(--accent); stroke-width: 1.5; }
.graph-wrap { position: relative; }

/* Small helpers for view headers */
.view-header { display:flex; gap:.5rem; align-items:center; padding:.5rem .75rem; border-bottom:1px solid var(--border); }


⸻

Replace viewer/views/GraphView.tsx (adds Minimap overlay & jump)

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import Minimap from "../components/Minimap";

type NodeT = { id:string; path:string; kind:string; tags?:string[]; circular?:boolean; meta?:Record<string,any>; x?:number; y?:number };
type EdgeT = { source:string; target:string; flags?:string[] };
type Graph = { nodes:NodeT[]; edges:EdgeT[] };
type Diff = { edges:{added:EdgeT[]; removed:EdgeT[]}; nodes:{added:NodeT[]; removed:NodeT[]} };

const KINDS = ["page","layout-block","content-block","component","ui","animation","styleguide","types","tokens","server-lib","api","prisma","other"] as const;

function shortLabel(p:string){
  const file = p.split("/").pop()||"";
  const parent = p.split("/").slice(-2,-1)[0] || "root";
  const base = (["app","components"].includes(parent)?"root":parent);
  if (/^page\.(t|j)sx?$/.test(file)) return `${base} (p)`;
  if (/^route\.(t|j)sx?$/.test(file)) return `${base} (r)`;
  if (/^index\.(t|j)sx?$/.test(file)) return `${base} (i)`;
  return file.replace(/\.(t|j)sx?$/,"");
}

export default function GraphView({ data, diff, state, setState }:{
  data:Graph; diff:Diff|null; state:any; setState:(p:any)=>void;
}) {
  const svgRef = useRef<SVGSVGElement|null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement,unknown>|null>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [size, setSize] = useState<{w:number;h:number}>({ w: 1000, h: 720 });

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
    const rect = svgRef.current.getBoundingClientRect();
    const width = Math.max(640, rect.width);
    const height = 720;
    setSize({ w: width, h: height });

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

    const lines = g.append("g").attr("stroke", colors.stroke).attr("stroke-opacity", .3)
      .selectAll("line").data(simEdges).enter().append("line").attr("stroke-width",1);

    if (diff) {
      const added = diff.edges.added.filter(e => byId[e.source] && byId[e.target]);
      const removed = diff.edges.removed.filter(e => byId[e.source] && byId[e.target]);
      g.append("g").selectAll("line").data(added).enter().append("line")
        .attr("stroke","#22c55e").attr("stroke-width",2.2).attr("stroke-opacity",.95)
        .attr("class","edge-added");
      g.append("g").selectAll("line").data(removed).enter().append("line")
        .attr("stroke","#ef4444").attr("stroke-dasharray","4,4").attr("stroke-width",2)
        .attr("class","edge-removed");
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
      .on("click", (_, d:any) => setState({ selectedId: d.id }));

    const labels = g.append("g").selectAll("text").data(simNodes).enter().append("text")
      .text(d => shortLabel((d as any).path)).attr("font-size",10).attr("dx",8).attr("dy",3)
      .attr("fill", colors.text).attr("opacity", transform.k >= 0.8 ? 1 : 0);

    const position = () => {
      lines.attr("x1", (d:any)=>byId[d.source].x).attr("y1", (d:any)=>byId[d.source].y)
        .attr("x2", (d:any)=>byId[d.target].x).attr("y2", (d:any)=>byId[d.target].y);
      nodeSel.attr("cx",(d:any)=>d.x).attr("cy",(d:any)=>d.y);
      labels.attr("x",(d:any)=>d.x).attr("y",(d:any)=>d.y);
      if (diff) {
        svg.selectAll(".edge-added")
          .attr("x1",(d:any)=>byId[d.source].x).attr("y1",(d:any)=>byId[d.source].y)
          .attr("x2",(d:any)=>byId[d.target].x).attr("y2",(d:any)=>byId[d.target].y);
        svg.selectAll(".edge-removed")
          .attr("x1",(d:any)=>byId[d.source].x).attr("y1",(d:any)=>byId[d.source].y)
          .attr("x2",(d:any)=>byId[d.target].x).attr("y2",(d:any)=>byId[d.target].y);
      }
    };

    sim.on("tick", position);

    const zoom = d3.zoom<SVGSVGElement,unknown>().scaleExtent([0.25,4]).on("zoom",(ev)=>{
      g.attr("transform", ev.transform.toString());
      setTransform(ev.transform);
      (labels as any).attr("opacity", ev.transform.k >= 0.8 ? 1 : 0);
    });
    zoomRef.current = zoom;
    svg.call(zoom as any).call(zoom.transform as any, transform);

    // Resize handler to keep width updated
    const ro = new ResizeObserver(() => {
      const r = svgRef.current!.getBoundingClientRect();
      setSize(s => ({ ...s, w: Math.max(640, r.width) }));
    });
    ro.observe(svgRef.current);

    return () => { sim.stop(); ro.disconnect(); };
  }, [nodes, edges, diff, state, transform]);

  // Minimap jump: center viewport around content coords, preserve current zoom k
  const handleJump = (cx:number, cy:number) => {
    if (!svgRef.current || !zoomRef.current) return;
    const k = transform.k || 1;
    const tx = size.w/2 - k*cx;
    const ty = size.h/2 - k*cy;
    const t = d3.zoomIdentity.translate(tx, ty).scale(k);
    d3.select(svgRef.current).call(zoomRef.current.transform as any, t);
  };

  return (
    <>
      <div className="toolbar" style={{borderBottom:"none"}}>
        <button className="chip" aria-pressed={!!state.churnOverlay} onClick={()=>setState({ churnOverlay: !state.churnOverlay })}>churn overlay</button>
        <button className="chip" aria-pressed={!!state.lowCoverageOnly} onClick={()=>setState({ lowCoverageOnly: !state.lowCoverageOnly })}>coverage&lt;60%</button>
      </div>
      <div className="graph-wrap">
        <svg ref={svgRef} width="100%" height="720" />
        <Minimap
          nodes={nodes.filter(n => n.x != null && n.y != null)}
          transform={transform}
          width={size.w}
          height={size.h}
          onJump={handleJump}
        />
      </div>
    </>
  );
}


⸻

viewer/views/BubbleMapView.tsx (circle-packing by dependency metric)

import React, { useEffect, useMemo, useRef, useState } from "react";

type NodeT = { id:string; path:string; kind:string; meta?:Record<string,any> };
type EdgeT = { source:string; target:string };
type Graph = { nodes:NodeT[]; edges:EdgeT[] };

const KINDS = ["page","layout-block","content-block","component","ui","animation","styleguide","types","tokens","server-lib","api","prisma","other"] as const;

export default function BubbleMapView({ data }:{ data:Graph }) {
  const svgRef = useRef<SVGSVGElement|null>(null);
  const [metric, setMetric] = useState<"out"|"in"|"degree"|"churn">("out");
  const [group, setGroup] = useState<"kind"|"none">("kind");

  const deg = useMemo(()=>{
    const out = new Map<string,number>(), inn = new Map<string,number>();
    for (const e of data.edges){ out.set(e.source,(out.get(e.source)||0)+1); inn.set(e.target,(inn.get(e.target)||0)+1); }
    return { out, inn };
  },[data.edges]);

  const packed = useMemo(()=>{
    // Build a fake hierarchy: either group by kind or single group
    if (group === "kind") {
      const children = (KINDS as readonly string[]).map(k => ({
        name: k,
        children: data.nodes.filter(n => n.kind === k).map(n => ({
          name: n.id,
          id: n.id,
          value:
            metric === "out" ? (deg.out.get(n.id)||0) :
            metric === "in"  ? (deg.inn.get(n.id)||0) :
            metric === "degree" ? (deg.out.get(n.id)||0) + (deg.inn.get(n.id)||0) :
            (n.meta?.churn || 0)
        }))
      }));
      return { name: "root", children };
    } else {
      return {
        name: "root",
        children: data.nodes.map(n => ({
          name: n.id,
          id: n.id,
          value:
            metric === "out" ? (deg.out.get(n.id)||0) :
            metric === "in"  ? (deg.inn.get(n.id)||0) :
            metric === "degree" ? (deg.out.get(n.id)||0) + (deg.inn.get(n.id)||0) :
            (n.meta?.churn || 0)
        }))
      };
    }
  }, [data.nodes, deg, metric, group]);

  useEffect(()=>{
    if(!svgRef.current) return;
    const width = svgRef.current.clientWidth || 1000, height = 620;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const root = d3.hierarchy(packed as any)
      .sum((d:any)=>Math.max(1, d.value || 0))
      .sort((a:any,b:any)=> (b.value||0) - (a.value||0));

    d3.pack<any>().size([width, height]).padding(3)(root);

    const color = d3.scaleOrdinal<string,string>().domain(KINDS as any).range(d3.schemeTableau10 as any);

    const node = svg.append("g")
      .selectAll("g")
      .data(root.descendants().slice(1)) // skip root
      .enter().append("g")
      .attr("transform",(d:any)=>`translate(${d.x},${d.y})`);

    node.append("circle")
      .attr("r",(d:any)=>d.r)
      .attr("fill",(d:any)=>d.children ? "none" : color(kindForId(d)))
      .attr("stroke","#6b7280").attr("stroke-opacity", d=>d.children ? .5 : .2);

    node.filter((d:any)=>!d.children).append("title")
      .text((d:any)=>`${d.data.name}\n${Math.round(d.value||0)}`);

    // labels for group circles (kinds)
    node.filter((d:any)=>d.children && d.depth===1).append("text")
      .attr("text-anchor","middle").attr("dy",".35em").attr("fill","#cbd5e1").attr("font-size",12)
      .text((d:any)=>d.data.name);

    function kindForId(d:any){
      const id = d.data?.id || d.data?.name || "";
      const n = (data.nodes as any[]).find(x => x.id === id);
      return n?.kind || "other";
    }
  }, [packed]);

  return (
    <>
      <div className="view-header">
        <label className="small">Metric</label>
        <select className="input" value={metric} onChange={e=>setMetric(e.target.value as any)}>
          <option value="out">dependencies (out-degree)</option>
          <option value="in">dependants (in-degree)</option>
          <option value="degree">total degree</option>
          <option value="churn">git churn</option>
        </select>
        <label className="small">Group</label>
        <select className="input" value={group} onChange={e=>setGroup(e.target.value as any)}>
          <option value="kind">by kind</option>
          <option value="none">none (all nodes)</option>
        </select>
      </div>
      <svg ref={svgRef} width="100%" height="620" />
    </>
  );
}


⸻

viewer/views/RunOrderView.tsx (topological layering with SCC collapse)

import React, { useEffect, useMemo, useRef, useState } from "react";

type NodeT = { id:string; path:string; kind:string };
type EdgeT = { source:string; target:string };
type Graph = { nodes:NodeT[]; edges:EdgeT[] };

/** Tarjan SCC */
function scc(nodes:string[], edges:Record<string,string[]>) {
  let index = 0;
  const stack:string[] = [], onStack = new Set<string>();
  const idx = new Map<string,number>(), low = new Map<string,number>();
  const comps:string[][] = [];

  function strong(v:string){
    idx.set(v, index); low.set(v,index); index++;
    stack.push(v); onStack.add(v);
    for(const w of (edges[v]||[])){
      if (!idx.has(w)){ strong(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)); }
      else if (onStack.has(w)) { low.set(v, Math.min(low.get(v)!, idx.get(w)!)); }
    }
    if (low.get(v) === idx.get(v)){
      const comp:string[] = [];
      let w;
      do { w = stack.pop()!; onStack.delete(w); comp.push(w); } while (w!==v);
      comps.push(comp);
    }
  }

  for(const v of nodes) if (!idx.has(v)) strong(v);
  return comps;
}

/** Build layered DAG (dependencies-first or consumers-first) */
function buildLayers(data:Graph, direction:"deps-first"|"consumers-first") {
  // adjacency: reverse for deps-first (imported before importer)
  const adj:Record<string,string[]> = {};
  for (const n of data.nodes) adj[n.id] = [];
  for (const e of data.edges) {
    const from = direction==="deps-first" ? e.target : e.source;
    const to   = direction==="deps-first" ? e.source : e.target;
    if (adj[from]) adj[from].push(to);
  }

  const ids = data.nodes.map(n=>n.id);
  const comps = scc(ids, adj);
  const compId = new Map<string,number>();
  comps.forEach((c,i)=>c.forEach(v=>compId.set(v,i)));

  // Contract DAG
  const C = comps.map((c)=>({ id:`C${c[0]}`, members:c, next:new Set<number>(), indeg:0 }));
  for (const [u, outs] of Object.entries(adj)) {
    const cu = compId.get(u)!;
    for (const v of outs) {
      const cv = compId.get(v)!;
      if (cu!==cv && !C[cu].next.has(cv)) C[cu].next.add(cv);
    }
  }
  // indegrees
  for (const c of C) for (const v of c.next) C[v].indeg++;

  // Kahn layering
  const q:number[] = []; C.forEach((c,i)=>{ if(c.indeg===0) q.push(i); });
  const level = new Array(C.length).fill(0);
  const order:number[] = [];
  while (q.length){
    const u = q.shift()!;
    order.push(u);
    for (const v of C[u].next) {
      C[v].indeg--; level[v] = Math.max(level[v], level[u]+1);
      if (C[v].indeg===0) q.push(v);
    }
  }
  const maxL = Math.max(...level, 0);
  const layers: number[][] = Array.from({length:maxL+1}, ()=>[]);
  C.forEach((_,i)=>layers[level[i]].push(i));

  return { comps: C, layers };
}

export default function RunOrderView({ data }:{ data:Graph }) {
  const svgRef = useRef<SVGSVGElement|null>(null);
  const [direction, setDirection] = useState<"deps-first"|"consumers-first">("deps-first");
  const [showEdges, setShowEdges] = useState(true);

  const model = useMemo(()=>buildLayers(data, direction), [data, direction]);

  useEffect(()=>{
    if(!svgRef.current) return;
    const width = svgRef.current.clientWidth || 1000, height = 640;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const colW = Math.max(180, Math.min(260, width / Math.max(1, model.layers.length)));
    const rowH = 26, padY = 18, padX = 24;

    const x = (i:number) => padX + i*colW;
    const y = (i:number, j:number) => padY + j*rowH;

    // compute max rows
    const maxRows = Math.max( ...model.layers.map(L => L.length) , 1);
    const neededH = padY*2 + maxRows*rowH + 80;
    svg.attr("height", Math.max(height, neededH));

    // Draw columns (levels)
    model.layers.forEach((L, li) => {
      svg.append("text").attr("x", x(li)).attr("y", 14).attr("fill", "#94a3b8").attr("font-size", 12)
        .text(`Level ${li}`);
      L.forEach((ci, idx) => {
        const comp = model.comps[ci];
        const label = comp.members.length > 1 ? `${comp.members[0]} (+${comp.members.length-1})` : comp.members[0];
        svg.append("rect")
          .attr("x", x(li)).attr("y", y(li, idx))
          .attr("width", colW-16).attr("height", rowH-6)
          .attr("rx",6).attr("ry",6)
          .attr("fill", comp.members.length>1 ? "rgba(124,58,237,.12)" : "rgba(255,255,255,.04)")
          .attr("stroke", comp.members.length>1 ? "#8b5cf6" : "rgba(255,255,255,.12)");
        svg.append("text")
          .attr("x", x(li)+8).attr("y", y(li, idx)+rowH/2+3)
          .attr("fill","#e5e7eb").attr("font-size",12)
          .text(label);
      });
    });

    // Optional wires between adjacent levels
    if (showEdges) {
      for (let li=0; li<model.layers.length; li++){
        for (const ci of model.layers[li]) {
          const comp = model.comps[ci];
          const fromIdx = model.layers[li].indexOf(ci);
          const y1 = y(li, fromIdx)+rowH/2-3, x1 = x(li)+colW-16;
          for (const nv of comp.next) {
            const lj = model.layers.findIndex(L => L.includes(nv));
            if (lj < 0) continue;
            const toIdx = model.layers[lj].indexOf(nv);
            const y2 = y(lj, toIdx)+rowH/2-3, x2 = x(lj);
            const m = (x1 + x2)/2;
            svg.append("path")
              .attr("d", `M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}`)
              .attr("fill","none").attr("stroke","rgba(148,163,184,.45)").attr("stroke-width",1.2);
          }
        }
      }
    }
  }, [model, direction, showEdges]);

  return (
    <>
      <div className="view-header">
        <label className="small">Order</label>
        <select className="input" value={direction} onChange={e=>setDirection(e.target.value as any)}>
          <option value="deps-first">dependencies → consumers (build/eval order)</option>
          <option value="consumers-first">consumers → dependencies</option>
        </select>
        <label className="small">Edges</label>
        <input type="checkbox" checked={showEdges} onChange={e=>setShowEdges(e.target.checked)} />
        <span className="small" style={{marginLeft:8}}>Cycles collapse into purple boxes.</span>
      </div>
      <svg ref={svgRef} width="100%" height="640" />
    </>
  );
}


⸻

Update viewer/main.tsx (register new views)

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import GraphView from "./views/GraphView.tsx";
import SankeyView from "./views/SankeyView.tsx";
import MatrixView from "./views/MatrixView.tsx";
import TreemapView from "./views/TreemapView.tsx";
import PathsView from "./views/PathsView.tsx";
import BubbleMapView from "./views/BubbleMapView.tsx";
import RunOrderView from "./views/RunOrderView.tsx";

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
  const [diff,setDiff]=useState<Diff|null>(null);
  const [state, setState] = useUrlState({
    view: "graph" as "graph"|"paths"|"sankey"|"matrix"|"treemap"|"bubblemap"|"runorder",
    selectedId: null as string|null,
    q: "", dirPrefix: "", hops: 1,
    onlyFlagged: false,
    lowCoverageOnly: false,
    churnOverlay: false,
    enabledFlags: {} as Record<string,boolean>,
    kindFilter: {} as Record<string,boolean>
  });

  useEffect(()=>{ fetch("/graph").then(r=>r.json()).then(setData); fetch("/diff").then(r=>r.json()).then(setDiff); }, []);
  useEffect(()=>{ const es = new EventSource("/events"); const reload = () => { fetch("/graph").then(r=>r.json()).then(setData); fetch("/diff").then(r=>r.json()).then(setDiff); }; es.addEventListener("graph", reload); es.addEventListener("diff", reload); return () => es.close(); }, []);

  const common = { data, diff, state, setState };

  return (
    <div className="layout">
      <div>
        <header className="toolbar">
          <select className="input" value={state.view} onChange={e=>setState({ view: e.target.value })}>
            <option value="graph">Graph</option>
            <option value="paths">Paths</option>
            <option value="sankey">Sankey (kind→kind)</option>
            <option value="matrix">Matrix</option>
            <option value="treemap">Treemap</option>
            <option value="bubblemap">Bubblemap</option>
            <option value="runorder">Run Order</option>
          </select>
          <input className="input" type="search" placeholder="Search…" value={state.q} onChange={e=>setState({ q:e.target.value })} />
          <button className="btn" onClick={()=>setState({ selectedId:null,q:"",dirPrefix:"",hops:1,onlyFlagged:false,lowCoverageOnly:false })}>Reset</button>
          <span style={{marginLeft:"auto"}} className="small">{diff ? `Δ nodes: +${diff.summary.addedNodes}/-${diff.summary.removedNodes}, Δ edges: +${diff.summary.addedEdges}/-${diff.summary.removedEdges}` : ""}</span>
        </header>

        {state.view === "graph"    && <GraphView {...common} />}
        {state.view === "paths"    && <PathsView data={data} state={state} setState={setState} />}
        {state.view === "sankey"   && <SankeyView data={data} />}
        {state.view === "matrix"   && <MatrixView data={data} />}
        {state.view === "treemap"  && <TreemapView data={data} />}
        {state.view === "bubblemap"&& <BubbleMapView data={data} />}
        {state.view === "runorder" && <RunOrderView data={data} />}
      </div>

      <aside>
        {/* keep your Tree + Inspector panels here if desired */}
      </aside>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);


⸻

Notes
	•	Minimap mirrors the current layout and shows the viewport rectangle. Click anywhere on the minimap to jump the main camera there (preserves zoom).
	•	Bubblemap lets you see hotspots quickly:
	•	Metric: dependencies (out-degree), dependants (in-degree), total degree, or git churn.
	•	Group: by kind (makes bubbles more structured) or none for a single field of bubbles.
	•	Run Order approximates execution/build order via a topological layering:
	•	dependencies → consumers puts imported modules before importers (typical evaluation/build order).
	•	Cycles are collapsed into purple boxes; edges between layers are curved to keep the picture tidy.

If you want, I can also wire the Matrix cells to actively filter the Graph view; and add a compare snapshots panel (pick any two graph.json files and visualize only the delta).