import path from "node:path";
import fs from "node:fs";
import fg from "fast-glob";
import { Project, ts, SyntaxKind } from "ts-morph";
import { runPlugins } from "./plugin-api.mjs";

function matchRule(p, rules = []) {
  for (const r of rules) if (r.test.test(p)) return r;
  return null;
}
const rel = (root, abs) => path.relative(root, abs).replace(/\\/g, "/");

export async function generateGraph({ root, config }) {
  const roots = config.roots || ["app", "components", "lib", "prisma", "stories", "scripts"];
  const patterns = roots.map(r => `${r}/**/*.{ts,tsx,js,jsx}`);
  const ignore = ["**/node_modules/**", "**/.next/**", "**/dist/**"];
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
      const cands = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];
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
      const serverKinds = new Set(["server-lib", "prisma", "api"]);
      const clientSurf = /^(components\/(?!Tools\/)|app\/(?!api\/))/.test(src.path);
      const serverOnly = serverKinds.has(dst.kind) || (dst.tags || []).includes("server-only");
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
    flags: edges.reduce((a, e) => { for (const f of e.flags || []) a[f] = (a[f] || 0) + 1; return a; }, {})
  };

  const graph = { nodes, edges, summary, policy: config.policy || {} };

  if (Array.isArray(config.plugins) && config.plugins.length) {
    await runPlugins({ root, graph, plugins: config.plugins });
  }

  return graph;
}