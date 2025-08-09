import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as d3 from "d3";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as ScrollArea from "@radix-ui/react-scroll-area";

type NodeT = { id:string; path:string; kind:string; tags?:string[]; circular?:boolean; x?:number; y?:number; meta?: Record<string, any> };
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
      kindScale: (d3.scaleOrdinal() as any).domain(KINDS as any).range(d3.schemeTableau10 as any)
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
    if (state.lowCoverageOnly) {
      for (const id of Array.from(ids)) {
        const n = nodes.find(x => x.id === id);
        if (!n?.meta || typeof n.meta.coverage !== "number" || n.meta.coverage >= 60) ids.delete(id);
      }
    }
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
      .attr("fill", d => (colors.kindScale as any)(d.kind))
      .attr("stroke", d => d.circular ? "#ef4444" : (d.meta?.coverage != null && d.meta.coverage < 60 ? "#f59e0b" : (state.selectedId===d.id ? "#fff" : "#111827")))
      .attr("stroke-width", d => d.circular ? 2.5 : state.selectedId===d.id ? 2 : 1)
      .style("cursor","pointer")
      .on("click", (_, d:any) => setState({ selectedId: d.id }))
      .append("title").text(d => d.path);

    const labels = g.append("g").selectAll("text").data(simNodes).enter().append("text")
      .text(d => shortLabel(d.path)).attr("font-size",10).attr("dx",8).attr("dy",3)
      .attr("fill", colors.text).attr("opacity", transform.k >= 0.8 ? 1 : 0);

    const update = () => {
      (bg as any).attr("x1", (d:any)=>byId[d.source].x).attr("y1", (d:any)=>byId[d.source].y)
        .attr("x2", (d:any)=>byId[d.target].x).attr("y2", (d:any)=>byId[d.target].y);
      (hl as any).attr("x1", (d:any)=>byId[d.source].x).attr("y1", (d:any)=>byId[d.source].y)
        .attr("x2", (d:any)=>byId[d.target].x).attr("y2", (d:any)=>byId[d.target].y);
      (nodeSel as any).attr("cx",(d:any)=>d.x).attr("cy",(d:any)=>d.y);
      (labels as any).attr("x",(d:any)=>d.x).attr("y",(d:any)=>d.y);
    };

    const messageHandler = (ev:MessageEvent) => {
      const { type, nodes:n } = ev.data;
      if (n) for (const m of n) { const t = (byId as any)[m.id]; if (t) { t.x = m.x; t.y = m.y; } }
      update();
    };
    (worker as any).addEventListener("message", messageHandler);

    // zoom
    const zoom = (d3.zoom() as any).scaleExtent([0.25,4]).on("zoom",(ev:any)=>{
      g.attr("transform", ev.transform.toString()); setTransform(ev.transform);
      labels.attr("opacity", ev.transform.k >= 0.8 ? 1 : 0);
    });
    (svg as any).call(zoom as any).call((zoom as any).transform as any, transform);

    return () => { (worker as any).terminate(); };
  }, [nodes, edges, active, colors, transform, state.enabledFlags, state.selectedId]);

  // toolbar
  const pill = (label:string, active:boolean, cb:()=>void, color?:string) =>
    (<button className="chip" aria-pressed={active} onClick={cb} style={color?{color}:undefined}>{label}</button>);

  const selected = state.selectedId ? byId[state.selectedId] : null;

  return (
    <>
      <div className="toolbar">
        <input className="input" type="search" placeholder="Search nodes by path…" value={state.q} onChange={e=>setState({ q:(e.target as any).value })} />
        {Object.entries(FLAGS).map(([k,c]) => pill(k, !!state.enabledFlags[k], () => setState({ enabledFlags: { ...state.enabledFlags, [k]: !state.enabledFlags[k] } }), c))}
        {pill("only flagged", !!state.onlyFlagged, () => setState({ onlyFlagged: !state.onlyFlagged }))}
        {pill("coverage<60%", !!state.lowCoverageOnly, () => setState({ lowCoverageOnly: !state.lowCoverageOnly }))}
        <span style={{marginLeft:"auto"}} className="small">Hops</span>
        <select className="input" value={state.hops} onChange={e=>setState({ hops: Number((e.target as any).value) })}>
          <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
        </select>
        <button className="btn" onClick={()=>setState({ selectedId:null })}>Clear focus</button>
        <button className="btn" onClick={()=>setState({
          selectedId:null,q:"",dirPrefix:"",hops:1,onlyFlagged:false,
          enabledFlags:Object.fromEntries(Object.keys(FLAGS).map(k=>[k,true])),
          kindFilter:Object.fromEntries((KINDS as readonly string[]).map(k=>[k,true]))
        })}>Reset</button>
      </div>

      <div className="toolbar" style={{borderBottom:"none"}}>
        {pill("All", Object.values(state.kindFilter).every(Boolean), () => setState({ kindFilter: Object.fromEntries((KINDS as readonly string[]).map(k=>[k,true])) }))}
        {pill("None", Object.values(state.kindFilter).every(v=>!v), () => setState({ kindFilter: Object.fromEntries((KINDS as readonly string[]).map(k=>[k,false])) }))}
        {(KINDS as readonly string[]).map(k => pill(k, !!state.kindFilter[k], () => setState({ kindFilter: { ...state.kindFilter, [k]: !state.kindFilter[k] } })))}
      </div>

      <svg ref={svgRef as any} width="100%" height="720" />

      <Inspector
        node={selected as any}
        edges={data.edges}
        byId={byId}
        onReveal={()=>document.querySelector(`.tree button[title='${selected?.path||""}']`)?.scrollIntoView({behavior:"smooth",block:"center"})}
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
    kindFilter:Object.fromEntries((KINDS as readonly string[]).map(k=>[k,true])) as Record<string,boolean>,
    lowCoverageOnly:false
  });
  const setState = (patch: any) => setStatePatch(patch);

  useEffect(()=>{ fetch("/graph").then(r=>r.json()).then(setData); }, []);
  useEffect(()=>{
    const es = new EventSource("/events");
    const handler = () => fetch("/graph").then(r=>r.json()).then(setData);
    es.addEventListener("graph", handler);
    return () => es.close();
  }, []);

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