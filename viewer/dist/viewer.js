// viewer/main.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as d3 from "d3";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var FLAGS = {
  "page->ui": "#d9480f",
  "ui->block": "#c1121f",
  "ui->layout": "#6a040f",
  "block->page": "#ff7b00",
  "policy": "#b000b5",
  "policy:info": "#8b5cf6",
  "prisma-import": "#005f73",
  "server-in-client": "#ff3b30"
};
var KINDS = ["page", "layout-block", "content-block", "component", "ui", "animation", "styleguide", "types", "tokens", "server-lib", "api", "prisma", "other"];
function useUrlState(defaults) {
  const [state, setState] = useState(() => {
    const u = new URL(window.location.href);
    const out = { ...defaults };
    Object.keys(defaults).forEach((k) => {
      const key = `dg.${k}`;
      if (!u.searchParams.has(key)) return;
      try {
        out[k] = JSON.parse(u.searchParams.get(key));
      } catch {
      }
    });
    return out;
  });
  const patch = (next) => {
    setState((s) => {
      const merged = { ...s, ...next };
      const u = new URL(window.location.href);
      for (const [k, v] of Object.entries(merged)) u.searchParams.set(`dg.${k}`, JSON.stringify(v));
      history.replaceState(null, "", u.toString());
      return merged;
    });
  };
  return [state, patch];
}
function shortLabel(p) {
  const parts = p.split("/"), file = parts.at(-1) || "", parent = parts.at(-2) || "root";
  const base = ["app", "components"].includes(parent) ? "root" : parent;
  if (/^page\.(t|j)sx?$/.test(file)) return `${base} (p)`;
  if (/^route\.(t|j)sx?$/.test(file)) return `${base} (r)`;
  if (/^index\.(t|j)sx?$/.test(file)) return `${base} (i)`;
  return file.replace(/\.(t|j)sx?$/, "");
}
function TreeView({ data, selectedId, onPick, onFilterDir }) {
  const [open, setOpen] = useState({ app: true, components: true, lib: true });
  const [q, setQ] = useState("");
  const tree = useMemo(() => {
    const root = { name: "", path: "", files: [], dirs: {} };
    for (const n of data.nodes) {
      const parts = n.path.split("/");
      let cur = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const seg = parts[i];
        cur.dirs[seg] ||= { name: seg, path: (cur.path ? cur.path + "/" : "") + seg, files: [], dirs: {} };
        cur = cur.dirs[seg];
      }
      cur.files.push(n);
    }
    return root;
  }, [data.nodes]);
  function Dir({ t, depth }) {
    return Object.keys(t.dirs).sort().map((name) => {
      const child = t.dirs[name], key = child.path || name, isOpen = !!open[key];
      const dirCount = Object.keys(child.dirs).length, fileCount = child.files.length;
      return /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center", style: { paddingLeft: depth * 12 }, children: [
          /* @__PURE__ */ jsx("button", { className: "chip", onClick: () => setOpen((o) => ({ ...o, [key]: !o[key] })), children: isOpen ? "\u25BE" : "\u25B8" }),
          /* @__PURE__ */ jsxs("button", { className: "tree-item", style: { marginLeft: 6 }, onClick: () => onFilterDir(child.path), children: [
            name,
            /* @__PURE__ */ jsxs("span", { className: "badge", children: [
              dirCount ? " " + dirCount + "d" : "",
              " ",
              fileCount ? " " + fileCount + "f" : ""
            ] })
          ] })
        ] }),
        isOpen && /* @__PURE__ */ jsx(Dir, { t: child, depth: depth + 1 }),
        isOpen && child.files.filter((f) => !q || f.path.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.path.localeCompare(b.path)).map((f) => /* @__PURE__ */ jsxs(
          "button",
          {
            style: { paddingLeft: (depth + 1) * 12 },
            className: "tree",
            onClick: () => onPick(f.id),
            children: [
              f.path.split("/").pop(),
              " ",
              /* @__PURE__ */ jsxs("span", { className: "badge", children: [
                "(",
                f.kind,
                ")"
              ] })
            ]
          },
          f.id
        ))
      ] }, key);
    });
  }
  return /* @__PURE__ */ jsxs("div", { className: "panel", children: [
    /* @__PURE__ */ jsx("div", { className: "hd", children: "Tree" }),
    /* @__PURE__ */ jsxs("div", { className: "bd", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2 mb-2", children: [
        /* @__PURE__ */ jsx("input", { className: "input", placeholder: "Filter tree\u2026", value: q, onChange: (e) => setQ(e.target.value) }),
        /* @__PURE__ */ jsx("button", { className: "btn", onClick: () => onFilterDir(""), children: "Clear" })
      ] }),
      /* @__PURE__ */ jsx(ScrollArea.Root, { type: "always", children: /* @__PURE__ */ jsx(ScrollArea.Viewport, { children: /* @__PURE__ */ jsx("div", { className: "tree", children: /* @__PURE__ */ jsx(Dir, { t: tree, depth: 0 }) }) }) })
    ] })
  ] });
}
function Inspector({ node, edges, byId, onReveal, onExpand }) {
  if (!node) return null;
  const inc = edges.filter((e) => e.source === node.id || e.target === node.id);
  const inDeg = inc.filter((e) => e.target === node.id).length;
  const outDeg = inc.filter((e) => e.source === node.id).length;
  const flags = Array.from(new Set(inc.flatMap((e) => e.flags || [])));
  const neighbors = Array.from(new Set(inc.map((e) => e.source === node.id ? e.target : e.source))).map((id) => byId[id]);
  return /* @__PURE__ */ jsxs("div", { className: "panel", style: { marginTop: 12 }, children: [
    /* @__PURE__ */ jsx("div", { className: "hd", children: "Inspector" }),
    /* @__PURE__ */ jsxs("div", { className: "bd", children: [
      /* @__PURE__ */ jsx("div", { className: "small", children: "Focused" }),
      /* @__PURE__ */ jsx("div", { style: { fontWeight: 600 }, children: node.path }),
      /* @__PURE__ */ jsxs("div", { className: "small", style: { marginTop: 6 }, children: [
        "kind: ",
        node.kind,
        " \xB7 tags: ",
        node.tags?.join(", ") || "\u2014",
        " ",
        node.circular ? " \xB7 in a cycle" : ""
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "kv", style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsx("div", { className: "small", children: "in-degree" }),
        /* @__PURE__ */ jsx("div", { children: inDeg }),
        /* @__PURE__ */ jsx("div", { className: "small", children: "out-degree" }),
        /* @__PURE__ */ jsx("div", { children: outDeg }),
        /* @__PURE__ */ jsx("div", { className: "small", children: "flags" }),
        /* @__PURE__ */ jsx("div", { children: flags.length ? flags.join(", ") : "\u2014" })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { marginTop: 8 }, className: "small", children: "Neighbors" }),
      /* @__PURE__ */ jsxs("ul", { style: { margin: 0, paddingLeft: 16 }, children: [
        neighbors.slice(0, 20).map((n) => /* @__PURE__ */ jsx("li", { children: n.path }, n.id)),
        neighbors.length > 20 ? /* @__PURE__ */ jsxs("li", { children: [
          "\u2026 ",
          neighbors.length - 20,
          " more"
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, marginTop: 10 }, children: [
        /* @__PURE__ */ jsx("button", { className: "btn", onClick: onExpand, children: "Expand neighbors" }),
        /* @__PURE__ */ jsx("button", { className: "btn", onClick: onReveal, children: "Reveal in tree" })
      ] })
    ] })
  ] });
}
function DepGraph({ data, state, setState }) {
  const svgRef = useRef(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const colors = useMemo(() => {
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    return {
      stroke: dark ? "#4b5563" : "#c4c4c4",
      text: dark ? "#cbd5e1" : "#1f2937",
      kindScale: d3.scaleOrdinal().domain(KINDS).range(d3.schemeTableau10)
    };
  }, []);
  const nodes = useMemo(() => data.nodes.map((n) => ({ ...n })), [data.nodes]);
  const edges = useMemo(() => data.edges.map((e) => ({ ...e })), [data.edges]);
  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const adj = useMemo(() => {
    const o = {};
    for (const e of edges) {
      (o[e.source] ||= /* @__PURE__ */ new Set()).add(e.target);
      (o[e.target] ||= /* @__PURE__ */ new Set()).add(e.source);
    }
    return o;
  }, [edges]);
  const active = useMemo(() => {
    const enabledFlags = state.enabledFlags;
    const onlyFlagged = state.onlyFlagged;
    if (state.selectedId) {
      const keep = /* @__PURE__ */ new Set([state.selectedId]);
      let front = /* @__PURE__ */ new Set([state.selectedId]);
      for (let i = 0; i < state.hops; i++) {
        const next = /* @__PURE__ */ new Set();
        for (const id of front) for (const n of Array.from(adj[id] || [])) next.add(n);
        next.forEach((n) => keep.add(n));
        front = next;
      }
      let es2 = edges.filter((e) => keep.has(e.source) && keep.has(e.target));
      if (onlyFlagged) es2 = es2.filter((e) => (e.flags || []).some((f) => enabledFlags[f]));
      const ids2 = new Set(nodes.filter((n) => keep.has(n.id)).map((n) => n.id));
      if (onlyFlagged && es2.length === 0) ids2.add(state.selectedId);
      return { ids: ids2, edges: es2 };
    }
    const allowedKinds = new Set(Object.entries(state.kindFilter).filter(([, v]) => v).map(([k]) => k));
    const ids = new Set(nodes.filter(
      (n) => (!state.dirPrefix || n.path.startsWith(state.dirPrefix)) && (!state.q || n.path.toLowerCase().includes(state.q.toLowerCase())) && (allowedKinds.size ? allowedKinds.has(n.kind) : true)
    ).map((n) => n.id));
    if (state.lowCoverageOnly) {
      for (const id of Array.from(ids)) {
        const n = nodes.find((x) => x.id === id);
        if (!n?.meta || typeof n.meta.coverage !== "number" || n.meta.coverage >= 60) ids.delete(id);
      }
    }
    let es = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    if (onlyFlagged) {
      es = es.filter((e) => (e.flags || []).some((f) => enabledFlags[f]));
      if (es.length) {
        const inc = /* @__PURE__ */ new Set();
        for (const e of es) {
          inc.add(e.source);
          inc.add(e.target);
        }
        for (const id of Array.from(ids)) if (!inc.has(id)) ids.delete(id);
      }
    }
    return { ids, edges: es };
  }, [nodes, edges, state, adj]);
  useEffect(() => {
    if (!svgRef.current) return;
    const width = svgRef.current.clientWidth || 1e3;
    const height = 720;
    const colWidth = width / Math.max(1, KINDS.length - 2);
    const xForKind = (k) => 60 + Math.max(0, KINDS.indexOf(k)) * (colWidth * 0.9);
    const worker = new Worker("./layout-worker.js", { type: "module" });
    const simNodes = nodes.filter((n) => active.ids.has(n.id));
    const simEdges = active.edges.map((e) => ({ ...e }));
    worker.postMessage({
      nodes: simNodes,
      edges: simEdges,
      width,
      height,
      xForKind: (k) => xForKind(k)
      // note: structured clone will serialize function? Can't. We pass samples instead:
    });
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const g = svg.append("g").attr("transform", transform.toString());
    g.append("g").selectAll("line").data(KINDS).enter().append("line").attr("x1", (k) => xForKind(k)).attr("x2", (k) => xForKind(k)).attr("y1", 8).attr("y2", height - 8).attr("stroke", colors.stroke).attr("stroke-opacity", 0.12).attr("stroke-dasharray", "2,4");
    const bg = g.append("g").attr("stroke", colors.stroke).attr("stroke-opacity", 0.3).selectAll("line").data(simEdges).enter().append("line").attr("stroke-width", 1);
    const flagged = simEdges.filter((e) => (e.flags || []).some((f) => state.enabledFlags[f]));
    const hl = g.append("g").selectAll("line").data(flagged).enter().append("line").attr("stroke", (d) => FLAGS[(d.flags || []).find((f) => state.enabledFlags[f])] || "#d00").attr("stroke-width", 2.2).attr("stroke-opacity", 0.95);
    const nodeSel = g.append("g").selectAll("circle").data(simNodes).enter().append("circle").attr("r", (d) => state.selectedId === d.id ? 8.5 : 6.5).attr("fill", (d) => colors.kindScale(d.kind)).attr("stroke", (d) => d.circular ? "#ef4444" : d.meta?.coverage != null && d.meta.coverage < 60 ? "#f59e0b" : state.selectedId === d.id ? "#fff" : "#111827").attr("stroke-width", (d) => d.circular ? 2.5 : state.selectedId === d.id ? 2 : 1).style("cursor", "pointer").on("click", (_, d) => setState({ selectedId: d.id })).append("title").text((d) => d.path);
    const labels = g.append("g").selectAll("text").data(simNodes).enter().append("text").text((d) => shortLabel(d.path)).attr("font-size", 10).attr("dx", 8).attr("dy", 3).attr("fill", colors.text).attr("opacity", transform.k >= 0.8 ? 1 : 0);
    const update = () => {
      bg.attr("x1", (d) => byId[d.source].x).attr("y1", (d) => byId[d.source].y).attr("x2", (d) => byId[d.target].x).attr("y2", (d) => byId[d.target].y);
      hl.attr("x1", (d) => byId[d.source].x).attr("y1", (d) => byId[d.source].y).attr("x2", (d) => byId[d.target].x).attr("y2", (d) => byId[d.target].y);
      nodeSel.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      labels.attr("x", (d) => d.x).attr("y", (d) => d.y);
    };
    const messageHandler = (ev) => {
      const { type, nodes: n } = ev.data;
      if (n) for (const m of n) {
        const t = byId[m.id];
        if (t) {
          t.x = m.x;
          t.y = m.y;
        }
      }
      update();
    };
    worker.addEventListener("message", messageHandler);
    const zoom2 = d3.zoom().scaleExtent([0.25, 4]).on("zoom", (ev) => {
      g.attr("transform", ev.transform.toString());
      setTransform(ev.transform);
      labels.attr("opacity", ev.transform.k >= 0.8 ? 1 : 0);
    });
    svg.call(zoom2).call(zoom2.transform, transform);
    return () => {
      worker.terminate();
    };
  }, [nodes, edges, active, colors, transform, state.enabledFlags, state.selectedId]);
  const pill = (label, active2, cb, color) => /* @__PURE__ */ jsx("button", { className: "chip", "aria-pressed": active2, onClick: cb, style: color ? { color } : void 0, children: label });
  const selected = state.selectedId ? byId[state.selectedId] : null;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "toolbar", children: [
      /* @__PURE__ */ jsx("input", { className: "input", type: "search", placeholder: "Search nodes by path\u2026", value: state.q, onChange: (e) => setState({ q: e.target.value }) }),
      Object.entries(FLAGS).map(([k, c]) => pill(k, !!state.enabledFlags[k], () => setState({ enabledFlags: { ...state.enabledFlags, [k]: !state.enabledFlags[k] } }), c)),
      pill("only flagged", !!state.onlyFlagged, () => setState({ onlyFlagged: !state.onlyFlagged })),
      pill("coverage<60%", !!state.lowCoverageOnly, () => setState({ lowCoverageOnly: !state.lowCoverageOnly })),
      /* @__PURE__ */ jsx("span", { style: { marginLeft: "auto" }, className: "small", children: "Hops" }),
      /* @__PURE__ */ jsxs("select", { className: "input", value: state.hops, onChange: (e) => setState({ hops: Number(e.target.value) }), children: [
        /* @__PURE__ */ jsx("option", { value: 1, children: "1" }),
        /* @__PURE__ */ jsx("option", { value: 2, children: "2" }),
        /* @__PURE__ */ jsx("option", { value: 3, children: "3" })
      ] }),
      /* @__PURE__ */ jsx("button", { className: "btn", onClick: () => setState({ selectedId: null }), children: "Clear focus" }),
      /* @__PURE__ */ jsx("button", { className: "btn", onClick: () => setState({
        selectedId: null,
        q: "",
        dirPrefix: "",
        hops: 1,
        onlyFlagged: false,
        enabledFlags: Object.fromEntries(Object.keys(FLAGS).map((k) => [k, true])),
        kindFilter: Object.fromEntries(KINDS.map((k) => [k, true]))
      }), children: "Reset" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "toolbar", style: { borderBottom: "none" }, children: [
      pill("All", Object.values(state.kindFilter).every(Boolean), () => setState({ kindFilter: Object.fromEntries(KINDS.map((k) => [k, true])) })),
      pill("None", Object.values(state.kindFilter).every((v) => !v), () => setState({ kindFilter: Object.fromEntries(KINDS.map((k) => [k, false])) })),
      KINDS.map((k) => pill(k, !!state.kindFilter[k], () => setState({ kindFilter: { ...state.kindFilter, [k]: !state.kindFilter[k] } })))
    ] }),
    /* @__PURE__ */ jsx("svg", { ref: svgRef, width: "100%", height: "720" }),
    /* @__PURE__ */ jsx(
      Inspector,
      {
        node: selected,
        edges: data.edges,
        byId,
        onReveal: () => document.querySelector(`.tree button[title='${selected?.path || ""}']`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
        onExpand: () => setState({ hops: Math.min(3, state.hops + 1) })
      }
    )
  ] });
}
function App() {
  const [data, setData] = useState({ nodes: [], edges: [], summary: {}, policy: {} });
  const [state, setStatePatch] = useUrlState({
    selectedId: null,
    q: "",
    dirPrefix: "",
    hops: 1,
    onlyFlagged: false,
    enabledFlags: Object.fromEntries(Object.keys(FLAGS).map((k) => [k, true])),
    kindFilter: Object.fromEntries(KINDS.map((k) => [k, true])),
    lowCoverageOnly: false
  });
  const setState = (patch) => setStatePatch(patch);
  useEffect(() => {
    fetch("/graph").then((r) => r.json()).then(setData);
  }, []);
  useEffect(() => {
    const es = new EventSource("/events");
    const handler = () => fetch("/graph").then((r) => r.json()).then(setData);
    es.addEventListener("graph", handler);
    return () => es.close();
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "layout", children: [
    /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(DepGraph, { data, state, setState }) }),
    /* @__PURE__ */ jsxs("aside", { children: [
      /* @__PURE__ */ jsx(
        TreeView,
        {
          data,
          selectedId: state.selectedId,
          onPick: (id) => setState({ selectedId: id }),
          onFilterDir: (dir) => setState({ dirPrefix: dir })
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "panel", style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsx("div", { className: "hd", children: "Policy Matrix" }),
        /* @__PURE__ */ jsx("div", { className: "bd small", children: "Click a src\u2192dst to filter edges (future toggle)." })
      ] })
    ] })
  ] });
}
createRoot(document.getElementById("root")).render(/* @__PURE__ */ jsx(App, {}));
//# sourceMappingURL=viewer.js.map
