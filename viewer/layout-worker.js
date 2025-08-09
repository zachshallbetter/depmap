// Runs d3-force in a worker and streams node positions back to the main thread.
importScripts("https://esm.sh/d3-force@3?bundle");

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