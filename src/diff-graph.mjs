export function diffGraphs(base, cur) {
  const baseNodes = new Map((base.nodes||[]).map(n => [n.id, n]));
  const curNodes  = new Map((cur.nodes||[]).map(n => [n.id, n]));

  const edgeKey = (e) => `${e.source}→${e.target}|${(e.flags||[]).slice().sort().join(",")}`;
  const baseEdges = new Set((base.edges||[]).map(edgeKey));
  const curEdges  = new Set((cur.edges||[]).map(edgeKey));

  const addedNodes = (cur.nodes||[]).filter(n => !baseNodes.has(n.id));
  const removedNodes = (base.nodes||[]).filter(n => !curNodes.has(n.id));
  const changedNodes = (cur.nodes||[]).filter(n => {
    const b = baseNodes.get(n.id);
    return b && (b.kind !== n.kind || JSON.stringify(b.tags||[]) !== JSON.stringify(n.tags||[]));
  }).map(n => ({ id: n.id, before: baseNodes.get(n.id), after: n }));

  const addedEdgeKeys = [...curEdges].filter(k => !baseEdges.has(k));
  const removedEdgeKeys = [...baseEdges].filter(k => !curEdges.has(k));

  const parse = (k) => {
    const [st, fl] = k.split("|");
    const [s, t] = st.split("→");
    return { source: s, target: t, flags: fl ? fl.split(",").filter(Boolean) : [] };
  };

  const addedEdges = addedEdgeKeys.map(parse);
  const removedEdges = removedEdgeKeys.map(parse);

  const baseEdgeByEndpoints = new Map((base.edges||[]).map(e => [`${e.source}→${e.target}`, (e.flags||[]).slice().sort().join(",")]))
  const curEdgeByEndpoints  = new Map((cur.edges||[]).map(e  => [`${e.source}→${e.target}`, (e.flags||[]).slice().sort().join(",")]))
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


