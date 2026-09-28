Great—let’s start Chunk 1: Structure (maps you can trust) with a Swimlanes (C4-lite) view. This adds lanes (UI → Blocks → Layouts → Lib → API → DB), hulls by folder, and “back-edge” highlighting (edges that go right-to-left across lanes).

⸻

1) Lane mapping utility

src/layers.mjs

// C4-lite lane mapping + helpers
export const DEFAULT_LANES = [
  "ui",           // UI primitives
  "component",    // components
  "content-block",// Blocks
  "layout-block", // Layouts / page scaffolds
  "page",         // Next pages/layouts
  "server-lib",   // server libraries
  "api",          // API routes
  "prisma",       // DB/schema
  "types",        // shared types
  "tokens",       // design tokens
  "styleguide",   // storybook/dev-only
  "other"
];

export function laneForKind(kind) {
  switch (kind) {
    case "ui": return "ui";
    case "component": return "component";
    case "content-block": return "content-block";
    case "layout-block": return "layout-block";
    case "page": return "page";
    case "server-lib": return "server-lib";
    case "api": return "api";
    case "prisma": return "prisma";
    case "types": return "types";
    case "tokens": return "tokens";
    case "styleguide": return "styleguide";
    default: return "other";
  }
}

export function laneIndex(name, order = DEFAULT_LANES) {
  const i = order.indexOf(name);
  return i === -1 ? order.length - 1 : i;
}


⸻

2) Register the view

Update your viewer entry to add a menu option.

viewer/main.tsx (snippets)

import SwimlanesView from "./views/SwimlanesView.tsx";

// state
const [state, setState] = useUrlState({
  view: "graph" as "graph"|"paths"|"sankey"|"matrix"|"treemap"|"bubblemap"|"runorder"|"swimlanes",
  // ...
});

// toolbar select
<option value="swimlanes">Swimlanes (C4-lite)</option>

// render switch
{state.view === "swimlanes" && <SwimlanesView data={data} state={state} setState={setState} />}


⸻

3) Styles for lanes/hulls

viewer/styles.css (append)

.lane-label { fill:#a1a1aa; font-size:12px; text-transform:uppercase; letter-spacing:.05em }
.lane-rail { stroke:#4b5563; stroke-opacity:.18; stroke-dasharray:2 6 }
.hull { fill: rgba(139,92,246,.10); stroke:#8b5cf6; stroke-opacity:.35 }
.hull--alt { fill: rgba(59,130,246,.08); stroke:#60a5fa; stroke-opacity:.35 }
.edge-back { stroke:#ef4444; stroke-width:1.8 }
.edge-forward { stroke:#94a3b8; stroke-opacity:.55 }


⸻

4) Swimlanes view

viewer/views/SwimlanesView.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { DEFAULT_LANES, laneForKind, laneIndex } from "../../src/layers.mjs";

type NodeT = { id:string; path:string; kind:string; tags?:string[]; meta?:Record<string,any>; x?:number; y?:number };
type EdgeT = { source:string; target:string; flags?:string[] };
type Graph = { nodes:NodeT[]; edges:EdgeT[] };

function folderKey(path:string) {
  const parts = path.split("/"); // "components/Blocks/CTA.tsx" -> "components/Blocks"
  return parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];
}

function polygonHull(points: [number, number][]) {
  const hull = d3.polygonHull(points);
  return hull || null;
}

export default function SwimlanesView({ data, state }:{ data:Graph; state:any; setState:(p:any)=>void }) {
  const svgRef = useRef<SVGSVGElement|null>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);

  const lanes = DEFAULT_LANES;

  // Assign lanes + groups
  const nodes = useMemo(() => data.nodes.map(n => ({
    ...n,
    lane: laneForKind(n.kind),
    group: folderKey(n.path)
  })), [data.nodes]);

  const edges = data.edges;

  useEffect(() => {
    if (!svgRef.current) return;
    const width = svgRef.current.clientWidth || 1200, height = 720;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const xForLane = (l:string) => {
      const i = laneIndex(l, lanes);
      const marginL = 120, right = 40;
      const band = d3.scaleBand().domain(lanes).range([marginL, width - right]).paddingInner(0.15);
      return (band(l) ?? marginL) + (band.bandwidth()/2);
    };

    const laneXBand = d3.scaleBand().domain(lanes).range([120, width - 40]).paddingInner(0.15);
    const yRange = [40, height - 40];

    // Layout: force inside each lane (x fixed by lane, y by force)
    const simNodes = nodes.map(n => ({ ...n }));
    const simEdges = edges.map(e => ({ ...e }));

    const forces = d3.forceSimulation(simNodes as any)
      .force("link", d3.forceLink(simEdges as any).id((d:any) => d.id).distance(60).strength(0.35))
      .force("charge", d3.forceManyBody().strength(-160))
      .force("x", d3.forceX((d:any) => xForLane(d.lane)).strength(0.9))
      .force("y", d3.forceY((height)/2).strength(0.04))
      .force("collide", d3.forceCollide(14))
      .stop();

    for (let i = 0; i < 200; i++) forces.tick(); // settle quickly

    const g = svg.append("g").attr("transform", transform.toString());

    // Lanes background & labels
    const laneG = g.append("g");
    laneG.selectAll("line").data(lanes).enter().append("line")
      .attr("x1", l => (laneXBand(l) ?? 0))
      .attr("x2", l => (laneXBand(l) ?? 0))
      .attr("y1", yRange[0]).attr("y2", yRange[1])
      .attr("class","lane-rail");

    laneG.selectAll("text").data(lanes).enter().append("text")
      .attr("x", l => (laneXBand(l) ?? 0) + (laneXBand.bandwidth()/2))
      .attr("y", 18)
      .attr("text-anchor","middle")
      .attr("class","lane-label")
      .text(l => l);

    // Hulls by folder inside each lane (convex hull of node circles)
    const groups = d3.group(simNodes as any, (d:any) => `${d.lane}::${d.group}`);
    const hullG = g.append("g");
    let idx = 0;
    for (const [, members] of groups) {
      if (members.length < 3) continue;
      const points: [number, number][] = members.map((m:any) => [m.x, m.y]);
      const hull = polygonHull(points);
      if (!hull) continue;
      hullG.append("path")
        .attr("d", d3.line()(hull.concat([hull[0]])) as string)
        .attr("class", idx++ % 2 ? "hull hull--alt" : "hull");
    }

    // Edges: forward (left->right) vs back (right->left)
    const byId:Record<string, any> = Object.fromEntries((simNodes as any).map((n:any) => [n.id, n]));
    const edgeG = g.append("g");
    edgeG.selectAll("path").data(simEdges).enter().append("path")
      .attr("fill","none")
      .attr("class", (e:any) => {
        const s = byId[e.source], t = byId[e.target];
        const back = laneIndex(s.lane, lanes) > laneIndex(t.lane, lanes);
        return back ? "edge-back" : "edge-forward";
      })
      .attr("d", (e:any) => {
        const s = byId[e.source], t = byId[e.target];
        const mx = (s.x + t.x)/2;
        return `M${s.x},${s.y} C${mx},${s.y} ${mx},${t.y} ${t.x},${t.y}`;
      });

    // Nodes
    const color = d3.scaleOrdinal(d3.schemeTableau10);
    const nodeG = g.append("g");
    const nodesSel = nodeG.selectAll("circle").data(simNodes).enter().append("circle")
      .attr("r", 7)
      .attr("cx", (d:any) => d.x).attr("cy", (d:any) => d.y)
      .attr("fill", (d:any) => color(d.lane))
      .attr("stroke", "#111827").attr("stroke-width", 1)
      .append("title").text((d:any) => `${d.path}\n${d.lane}`);

    // Zoom
    const zoom = d3.zoom<SVGSVGElement,unknown>().scaleExtent([0.5, 3]).on("zoom", (ev) => {
      g.attr("transform", ev.transform.toString());
      setTransform(ev.transform);
    });
    svg.call(zoom as any).call(zoom.transform as any, transform);
  }, [nodes, edges, lanes, transform]);

  return <svg ref={svgRef} width="100%" height="720" />;
}


⸻

If you want the lane order configurable per project, add to depmap.config.ts:

// depmap.config.ts
export default {
  // ...
  lanes: ["ui","component","content-block","layout-block","page","server-lib","api","prisma","types","tokens","styleguide","other"] as const
} as const;

…and change SwimlanesView to read data.policy?.lanes ?? DEFAULT_LANES (or serve a small /config endpoint). For now, defaults will work with your kinds.

When you’ve got this in and visible in the viewer, say the word and I’ll deliver Chunk 2: Chord/Radial wheel and Chunk 3: Galaxy (edge bundling), followed by Design-token usage heatmap (plugin + view).