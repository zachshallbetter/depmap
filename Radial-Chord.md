Perfect—Chunk 2 = Radial Chord (dependency wheel). This view aggregates dependencies by kind (default) or by folder group, lets you trim noise (top-N/threshold), and on click it jumps back to Graph view filtered to that pair.

Below are the exact code additions/patches.

⸻

1) Register the view

viewer/main.tsx – add menu option and URL-state key.

-import GraphView from "./views/GraphView.tsx";
+import GraphView from "./views/GraphView.tsx";
+import ChordView from "./views/ChordView.tsx";

-  const [state, setState] = useUrlState({
-    view: "graph" as "graph"|"paths"|"sankey"|"matrix"|"treemap"|"bubblemap"|"runorder",
+  const [state, setState] = useUrlState({
+    view: "graph" as "graph"|"paths"|"sankey"|"matrix"|"treemap"|"bubblemap"|"runorder"|"chord",
     selectedId: null as string|null,
     q: "", dirPrefix: "", hops: 1,
     onlyFlagged: false,
     lowCoverageOnly: false,
     churnOverlay: false,
     enabledFlags: {} as Record<string,boolean>,
-    kindFilter: {} as Record<string,boolean>
+    kindFilter: {} as Record<string,boolean>,
+    pairFilter: null as null | { mode: "kind" | "folder1" | "folder2", groups: [string,string] }
   });

           <option value="treemap">Treemap</option>
           <option value="bubblemap">Bubblemap</option>
           <option value="runorder">Run Order</option>
+          <option value="chord">Chord (radial)</option>

         {state.view === "runorder" && <RunOrderView data={data} />}
+        {state.view === "chord"    && <ChordView data={data} state={state} setState={setState} />}


⸻

2) Graph view: honor pairFilter (edges-only subgraph for a selected pair)

viewer/views/GraphView.tsx – add a tiny helper and filter block.

+function folderGroup(path: string, depth: 1 | 2) {
+  const parts = path.split("/");
+  if (depth === 1) return parts[0] || "";
+  return parts.slice(0, Math.min(2, parts.length - 1)).join("/");
+}

Find where active is computed and extend it:

   const active = useMemo(()=>{
-    const ids = new Set(nodes
+    let ids = new Set(nodes
       .filter(n =>
         (!state.dirPrefix || n.path.startsWith(state.dirPrefix)) &&
         (!state.q || n.path.toLowerCase().includes(state.q.toLowerCase()))
       ).map(n=>n.id));
-    let es = edges.filter(e=>ids.has(e.source)&&ids.has(e.target));
+    let es = edges.filter(e=>ids.has(e.source)&&ids.has(e.target));

+    // Optional pairFilter from Chord view
+    if (state.pairFilter) {
+      const [a,b] = state.pairFilter.groups;
+      const groupOf = (id: string) => {
+        const n = byId[id];
+        if (!n) return "";
+        if (state.pairFilter.mode === "kind") return n.kind;
+        if (state.pairFilter.mode === "folder2") return folderGroup(n.path, 2);
+        return folderGroup(n.path, 1); // folder1
+      };
+      es = es.filter(e => {
+        const gs = groupOf(e.source), gt = groupOf(e.target);
+        return (gs===a && gt===b) || (gs===b && gt===a);
+      });
+      ids = new Set<string>();
+      for (const e of es) { ids.add(e.source); ids.add(e.target); }
+    }

Optional: add a small chip to clear this in the Graph header (same file, in the toolbar JSX):

      <div className="toolbar" style={{borderBottom:"none"}}>
+        {state.pairFilter && (
+          <button className="chip" onClick={()=>setState({ pairFilter: null })}>
+            clear pair filter: {state.pairFilter.mode} {state.pairFilter.groups[0]} ↔ {state.pairFilter.groups[1]}
+          </button>
+        )}


⸻

3) Styles (subtle polish for chords)

viewer/styles.css – append:

/* --- Chord --- */
.chord-arc { fill: none; stroke: var(--border); stroke-opacity: .6 }
.chord-group-label { fill: #cbd5e1; font-size: 12px; text-anchor: middle }
.chord-ribbon { mix-blend-mode: screen; }
.chord-ribbon:hover { filter: brightness(1.2); }


⸻

4) The view itself

viewer/views/ChordView.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

type NodeT = { id:string; path:string; kind:string };
type EdgeT = { source:string; target:string };
type Graph = { nodes:NodeT[]; edges:EdgeT[] };

const KINDS = ["page","layout-block","content-block","component","ui","animation","styleguide","types","tokens","server-lib","api","prisma","other"] as const;

// Folder grouping helpers
function folder1(p: string) { return (p.split("/")[0]) || ""; }
function folder2(p: string) {
  const parts = p.split("/");
  return parts.length > 1 ? `${parts[0]}/${parts[1]}` : parts[0] || "";
}

export default function ChordView({
  data, state, setState
}: { data:Graph; state:any; setState:(p:any)=>void }) {
  const svgRef = useRef<SVGSVGElement|null>(null);
  const [mode, setMode] = useState<"kind"|"folder1"|"folder2">("kind");
  const [topN, setTopN] = useState<number>(24);
  const [minCount, setMinCount] = useState<number>(1);

  // Build groups & index
  const groups = useMemo(()=>{
    if (mode === "kind") {
      // Only include kinds that exist in the data
      const present = new Set(data.nodes.map(n => n.kind));
      return KINDS.filter(k => present.has(k as any)) as string[];
    }
    if (mode === "folder1") {
      return Array.from(new Set(data.nodes.map(n => folder1(n.path)))).sort();
    }
    return Array.from(new Set(data.nodes.map(n => folder2(n.path)))).sort();
  }, [data.nodes, mode]);

  const groupOf = (id: string) => {
    const n = data.nodes.find(x => x.id === id);
    if (!n) return "";
    if (mode === "kind") return n.kind;
    if (mode === "folder1") return folder1(n.path);
    return folder2(n.path);
  };

  // Aggregate edges → matrix
  const matrix = useMemo(()=>{
    const idx = new Map<string, number>(groups.map((g,i)=>[g,i]));
    const M = Array.from({length:groups.length}, ()=>Array.from({length:groups.length}, ()=>0));
    for (const e of data.edges) {
      const s = groupOf(e.source), t = groupOf(e.target);
      const i = idx.get(s), j = idx.get(t);
      if (i==null || j==null) continue;
      M[i][j] += 1;
    }
    // Top-N/threshold pruning by pair weight (undirected score = i→j + j→i)
    const pairs: {i:number;j:number;w:number}[] = [];
    for (let i=0;i<M.length;i++) for (let j=i;j<M.length;j++) {
      const w = M[i][j] + M[j][i];
      if (w >= minCount) pairs.push({i,j,w});
    }
    pairs.sort((a,b)=>b.w - a.w);
    const keep = new Set(pairs.slice(0, topN).map(p=>`${p.i}-${p.j}`));
    for (let i=0;i<M.length;i++) for (let j=i;j<M.length;j++) {
      if (!keep.has(`${i}-${j}`)) { M[i][j]=0; M[j][i]=0; }
    }
    return M;
  }, [data.edges, groups, minCount, topN]);

  useEffect(()=>{
    if (!svgRef.current) return;
    const width = svgRef.current.clientWidth || 960, height = 640;
    const outerR = Math.min(width, height) * 0.45;
    const innerR = outerR - 16;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const chord = d3.chord()
      .padAngle(8 / innerR)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending);

    const chords = chord(matrix as any);

    const color = mode === "kind"
      ? d3.scaleOrdinal<string,string>().domain(KINDS as any).range(d3.schemeTableau10 as any)
      : d3.scaleOrdinal<string,string>().domain(groups).range(d3.quantize(t => d3.interpolateSpectral(0.15 + t*0.7), groups.length));

    const g = svg.append("g").attr("transform", `translate(${width/2},${height/2})`);

    // Group arcs
    const arc = d3.arc<any>().innerRadius(innerR).outerRadius(outerR);
    const ribbons = d3.ribbon<any>().radius(innerR - 1);

    const group = g.append("g")
      .selectAll("g").data(chords.groups).enter().append("g");

    group.append("path")
      .attr("d", arc)
      .attr("fill", d => color(groups[d.index]))
      .attr("stroke", "#0f172a")
      .attr("class","chord-arc");

    // Group labels
    group.append("text")
      .each(d => { (d as any).angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy",".35em")
      .attr("class","chord-group-label")
      .attr("transform", d => `
        rotate(${((d as any).angle * 180 / Math.PI - 90)})
        translate(${outerR + 12})
        ${((d as any).angle > Math.PI) ? "rotate(180)" : ""}
      `)
      .style("text-anchor", d => ((d as any).angle > Math.PI) ? "end" : "start")
      .text(d => groups[d.index]);

    // Ribbons
    const rSel = g.append("g")
      .attr("fill-opacity", 0.9)
      .selectAll("path")
      .data(chords)
      .enter().append("path")
      .attr("d", ribbons as any)
      .attr("fill", d => color(groups[d.source.index]))
      .attr("stroke", "#0f172a")
      .attr("class","chord-ribbon")
      .append("title")
      .text(d => {
        const s = groups[d.source.index], t = groups[d.target.index];
        const w = matrix[d.source.index][d.target.index] + matrix[d.target.index][d.source.index];
        return `${s} ↔ ${t}: ${w}`;
      });

    // Click → jump to Graph with pairFilter
    svg.selectAll<SVGPathElement, any>(".chord-ribbon")
      .on("click", (_, d:any) => {
        const a = groups[d.source.index], b = groups[d.target.index];
        setState({
          view: "graph",
          pairFilter: { mode, groups: [a,b] }
        });
      });

  }, [matrix, groups, mode, setState]);

  return (
    <>
      <div className="view-header">
        <label className="small">Group by</label>
        <select className="input" value={mode} onChange={e=>setMode(e.target.value as any)}>
          <option value="kind">kind</option>
          <option value="folder1">folder (top level)</option>
          <option value="folder2">folder (two levels)</option>
        </select>
        <label className="small">Top pairs</label>
        <input className="input" type="number" min={4} max={200} value={topN} onChange={e=>setTopN(Number(e.target.value)||24)} style={{width:90}} />
        <label className="small">Min count</label>
        <input className="input" type="number" min={1} max={50} value={minCount} onChange={e=>setMinCount(Number(e.target.value)||1)} style={{width:90}} />
        <span className="small" style={{marginLeft:"auto"}}>Click a ribbon to filter Graph</span>
      </div>
      <svg ref={svgRef} width="100%" height="640" />
    </>
  );
}


⸻

5) (Optional) Kind-pair quick filter from Matrix view

If you also want Matrix cells to drive the same pairFilter, add this in your MatrixView.tsx cell button onClick:

onClick={() => setState({
  view: "graph",
  pairFilter: { mode: "kind", groups: [row, col] }
})}


⸻

That’s Chunk 2 done: an at-a-glance radial map of the project’s major relationships, wired to drill down into the main Graph on click.
When you’re ready, I’ll deliver Chunk 3: Galaxy (hierarchical edge bundling) next.