Here’s a drop-in rules inference feature. It scans a repo end-to-end and emits a suggested depmap.config.ts based on what it finds (kinds, tags, policy allow-matrix, softening, ignores). You’ll get:
	•	depmap infer → writes depmap.config.suggested.ts at the project root (safe default)
	•	depmap infer --write → writes depmap.config.ts if it doesn’t exist
	•	depmap infer --force → overwrites depmap.config.ts

It uses the same parser stack as your graph generator, then learns patterns from actual imports.

⸻

src/infer-rules.mjs

import path from "node:path";
import fs from "node:fs";
import fg from "fast-glob";
import { Project, ts, SyntaxKind } from "ts-morph";

const DEFAULT_EXCLUDE = ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**"];
const FILE_GLOBS = ["**/*.{ts,tsx,js,jsx}"];

const SAFE_STRING = (s) => s.replace(/`/g, "\\`");
const asRegex = (re) => re; // pass through for template literal output

function rel(root, abs) {
  return path.relative(root, abs).replace(/\\/g, "/");
}

async function scanFiles(root, rootsGuess) {
  const roots = rootsGuess?.length ? rootsGuess : await guessRoots(root);
  const patterns = roots.map((r) => `${r}/${FILE_GLOBS[0]}`);
  const files = await fg(patterns, { cwd: root, dot: false, ignore: DEFAULT_EXCLUDE });
  return { roots, files };
}

async function guessRoots(root) {
  // Heuristic: take top-level dirs with code files, prefer common names
  const entries = fs.readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => !["node_modules", ".git", "public", ".next", "dist", "build", "storybook-static"].includes(n));

  const candidates = [];
  for (const dir of entries) {
    const hasCode = await fg(`${dir}/${FILE_GLOBS[0]}`, { cwd: root, ignore: DEFAULT_EXCLUDE, dot: false, onlyFiles: true, unique: true, absolute: false, deep: 2 });
    if (hasCode.length) candidates.push(dir);
  }
  // Bias to common conventions
  const sorted = candidates.sort((a, b) => {
    const rank = (x) => ["app","src","components","lib","server","api","packages","prisma","stories","scripts"].indexOf(x);
    const ra = rank(a) === -1 ? 99 : rank(a);
    const rb = rank(b) === -1 ? 99 : rank(b);
    return ra - rb || a.localeCompare(b);
  });
  return sorted.length ? sorted : ["."];
}

function buildTsProject(root, files) {
  const project = new Project({
    tsConfigFilePath: fs.existsSync(path.join(root, "tsconfig.json")) ? path.join(root, "tsconfig.json") : undefined,
    skipAddingFilesFromTsConfig: false
  });
  files.forEach((f) => project.addSourceFileAtPath(path.join(root, f)));
  return project;
}

function resolveImport(project, root, fromPath, spec) {
  if (!spec) return null;
  if (spec.startsWith(".") || spec.startsWith("/")) {
    const fromAbs = path.join(root, fromPath);
    const full = path.resolve(path.dirname(fromAbs), spec);
    const cands = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];
    for (const c of cands) {
      const abs = full + c;
      if (fs.existsSync(abs)) return rel(root, abs);
    }
    return null;
  }
  // ts path mapping / node resolution
  const sf = project.getSourceFile(path.join(root, fromPath));
  const res = ts.resolveModuleName(spec, sf.getFilePath(), project.getCompilerOptions(), ts.sys);
  if (res?.resolvedModule?.resolvedFileName) return rel(root, res.resolvedModule.resolvedFileName);
  return null;
}

function detectFeatures(root, files) {
  const feats = {
    hasNextApp: files.some((f) => /^app\/.+\/page\.tsx?$/.test(f)),
    hasNextLayout: files.some((f) => /^app\/.+\/layout\.tsx?$/.test(f)),
    hasNextApi: files.some((f) => /^app\/api\/.+\/route\.(t|j)s$/.test(f)),
    hasComponentsLayouts: files.some((f) => /^components\/Layouts\/.+\.(t|j)sx?$/.test(f)),
    hasComponentsBlocks: files.some((f) => /^components\/Blocks\/.+\.(t|j)sx?$/.test(f)),
    hasUI: files.some((f) => /^components\/UI\/.+\.(t|j)sx?$/.test(f)),
    hasStories: files.some((f) => /\.stories\.(t|j)sx?$/.test(f) || /stories\/.+\.stories\.(t|j)sx?$/.test(f)),
    hasFixtures: files.some((f) => /__fixtures__\//.test(f)),
    hasSchemas: files.some((f) => /\.schema\.(t|j)s$/.test(f)),
    hasPrisma: files.some((f) => /^prisma\/.+/.test(f)),
    hasServerLib: files.some((f) => /(^|\/)(server|server\-lib|lib\/(database|prisma))\.(t|j)s$/.test(f)),
    hasTypes: files.some((f) => /^lib\/(types|component-types)\.ts$/.test(f)),
    hasTokens: files.some((f) => /^lib\/design-tokens\.ts$/.test(f))
  };
  return feats;
}

function synthesizeTagRules(features) {
  const rules = [];
  if (features.hasNextApp) {
    rules.push({ test: asRegex(/^app\/.*\/page\.tsx?$/), kind: "page" });
  }
  if (features.hasNextLayout) {
    rules.push({ test: asRegex(/^app\/.*\/layout\.tsx?$/), kind: "page" });
  }
  if (features.hasNextApi) {
    rules.push({ test: asRegex(/^app\/api\/.*\/route\.(t|j)s$/), kind: "api", addTags: ["server-only"] });
  }

  if (features.hasComponentsLayouts)
    rules.push({ test: asRegex(/^components\/Layouts\/.+\.(t|j)sx?$/), kind: "layout-block" });
  if (features.hasComponentsBlocks)
    rules.push({ test: asRegex(/^components\/Blocks\/.+\.(t|j)sx?$/), kind: "content-block" });
  if (features.hasUI)
    rules.push({ test: asRegex(/^components\/UI\/.+\.(t|j)sx?$/), kind: "ui" });

  // Fallback for general components (but avoid Tools if present)
  rules.push({ test: asRegex(/^components\/(?!Tools\/).+\.(t|j)sx?$/), kind: "component" });

  if (features.hasTypes) rules.push({ test: asRegex(/^lib\/(types|component-types)\.ts$/), kind: "types" });
  if (features.hasTokens) rules.push({ test: asRegex(/^lib\/design-tokens\.ts$/), kind: "tokens" });

  if (features.hasServerLib) rules.push({ test: asRegex(/^lib\/(database|prisma)\.ts$/), kind: "server-lib", addTags: ["server-only"] });
  if (features.hasPrisma) rules.push({ test: asRegex(/^prisma\/.*$/), kind: "prisma", addTags: ["server-only"] });

  if (features.hasStories) {
    rules.push({ test: asRegex(/^stories\/.*\.stories\.tsx?$/), kind: "styleguide", addTags: ["stories","dev-only"] });
    rules.push({ test: asRegex(/^components\/.*\/.*\.stories\.tsx?$/), kind: "styleguide", addTags: ["stories","dev-only"] });
  }
  if (features.hasFixtures) rules.push({ test: asRegex(/^components\/.*\/__fixtures__\/.*/ ), kind: "styleguide", addTags: ["fixtures","dev-only"] });

  if (features.hasSchemas) rules.push({ test: asRegex(/\.schema\.(t|j)s$/), addTags: ["schema"] });

  // Common meta tags
  rules.push({ test: asRegex(/index\.(t|j)s$/), addTags: ["barrel"] });

  return rules;
}

function classify(pathRel, rules) {
  for (const r of rules) {
    if (r.test.test(pathRel)) {
      return { kind: r.kind || "other", tags: r.addTags || [] };
    }
  }
  return { kind: "other", tags: [] };
}

function inferAllowMatrix(nodes, edges) {
  // Build frequency table: srcKind -> dstKind -> count
  const kinds = Array.from(new Set(nodes.map((n) => n.kind)));
  const counts = new Map(); // key: srcKind -> Map(dstKind -> count)
  for (const e of edges) {
    const s = e._src.kind, d = e._dst.kind;
    if (!counts.has(s)) counts.set(s, new Map());
    const m = counts.get(s);
    m.set(d, (m.get(d) || 0) + 1);
  }

  const allow = {};
  for (const s of kinds) {
    const m = counts.get(s) || new Map();
    const total = Array.from(m.values()).reduce((a, b) => a + b, 0) || 0;
    // Choose destinations contributing ≥5% of outgoing edges and at least 3 edges
    const dests = Array.from(m.entries())
      .filter(([_, c]) => c >= 3 || (total && c / total >= 0.05))
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
    // Safety: types/tokens often allowed
    if (!dests.includes("types")) dests.push("types");
    if (!dests.includes("tokens")) dests.push("tokens");
    allow[s] = Array.from(new Set(dests));
  }
  return allow;
}

function stringifyConfigTs({ roots, rules, allow, hasStoriesOrFixtures }) {
  const ignore = [];
  if (hasStoriesOrFixtures) ignore.push("stories","fixtures","dev-only");

  // Render RegExp literals as-is in TS
  const rulesTs = rules.map((r) => {
    const parts = [`test: ${r.test}`];
    if (r.kind) parts.push(`kind: "${r.kind}"`);
    if (r.addTags?.length) parts.push(`addTags: ${JSON.stringify(r.addTags)}`);
    return `{ ${parts.join(", ")} }`;
  });

  const header = `// Generated by depmap infer on ${new Date().toISOString()}
// Review and edit as needed. Rules are based on observed files and imports.

`;

  return header + `export default {
  roots: ${JSON.stringify(roots)},

  tagRules: [
    ${rulesTs.join(",\n    ")}
  ],

  ignorePolicyForTags: ${JSON.stringify(ignore)},

  policy: {
    allow: ${JSON.stringify(allow, null, 2)}
  },

  soften: {
    whenSourceHasTag: { barrel: ["policy"] }
  },

  exclude: ["^public/.*","^node_modules/.*","^storybook-static/.*"]
} as const;
`;
}

export async function inferRules({ root, rootsGuess }) {
  const { roots, files } = await scanFiles(root, rootsGuess);
  if (!files.length) throw new Error("No source files found in guessed roots: " + roots.join(", "));
  const features = detectFeatures(root, files);
  const tagRules = synthesizeTagRules(features);

  const project = buildTsProject(root, files);
  // Build naive graph
  const nodes = files.map((f) => {
    const c = classify(f, tagRules);
    return { id: f, path: f, kind: c.kind, tags: c.tags };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = [];

  for (const f of files) {
    const sf = project.getSourceFile(path.join(root, f));
    if (!sf) continue;

    const push = (to) => {
      if (!to) return;
      if (!byId.has(to)) return; // external or out of roots
      const _src = byId.get(f);
      const _dst = byId.get(to);
      edges.push({ source: f, target: to, _src, _dst });
    };

    // imports
    sf.getImportDeclarations().forEach((imp) => push(resolveImport(project, root, f, imp.getModuleSpecifierValue())));
    // re-exports
    sf.getExportDeclarations().forEach((exp) => push(resolveImport(project, root, f, exp.getModuleSpecifierValue())));
    // dynamic import()
    sf.forEachDescendant((n) => {
      if (n.getKind() === SyntaxKind.CallExpression) {
        const ce = n;
        const expr = ce.getExpression().getText();
        if (expr === "import") {
          const arg = ce.getArguments()[0];
          const lit = arg && arg.getKind() === SyntaxKind.StringLiteral ? arg.getLiteralValue() : null;
          if (lit) push(resolveImport(project, root, f, lit));
        }
      }
    });
  }

  const allow = inferAllowMatrix(nodes, edges);
  const hasStoriesOrFixtures = features.hasStories || features.hasFixtures;
  const ts = stringifyConfigTs({ roots, rules: tagRules, allow, hasStoriesOrFixtures });

  return { text: ts, stats: { files: files.length, nodes: nodes.length, edges: edges.length }, roots, features };
}


⸻

Update bin/depmap.mjs (add infer subcommand)

#!/usr/bin/env node
import { fileURLToPath } from "url";
import path from "node:path";
import fs from "node:fs";
import minimist from "minimist";
import open from "open";
import { generateGraph } from "../src/generate-graph.mjs";
import { serve } from "../src/server.mjs";
import { loadConfig } from "../src/load-config.mjs";
import { inferRules } from "../src/infer-rules.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: ["root", "port"],
    boolean: ["open", "graphOnly", "write", "force"],
    alias: { r: "root", p: "port", o: "open" },
    default: { root: process.cwd(), port: "5656", open: true, graphOnly: false, write: false, force: false }
  });

  const cmd = argv._[0]; // optional subcommand: infer
  const projectRoot = path.resolve(argv.root);

  if (cmd === "infer") {
    await runInfer({ projectRoot, write: argv.write, force: argv.force });
    return;
  }

  // default command: scan + serve
  const cfgPath = ["depmap.config.ts", "depmap.config.mjs", "depmap.config.js"]
    .map((p) => path.join(projectRoot, p))
    .find((p) => fs.existsSync(p));

  if (!cfgPath) {
    console.error("[depmap] Missing depmap.config.ts at project root.");
    console.error("Run `depmap infer` to generate a suggested config.");
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

async function runInfer({ projectRoot, write, force }) {
  console.log(`[depmap] inferring rules from ${projectRoot}`);
  const { text, stats, roots, features } = await inferRules({ root: projectRoot });
  const targetSuggested = path.join(projectRoot, "depmap.config.suggested.ts");
  const targetConfig = path.join(projectRoot, "depmap.config.ts");

  const banner =
    `// Files: ${stats.files}, Nodes: ${stats.nodes}, Edges: ${stats.edges}\n` +
    `// Roots: ${roots.join(", ")}\n` +
    `// Detected: ${Object.entries(features).filter(([,v])=>v).map(([k])=>k).join(", ") || "none"}\n\n`;

  if (write) {
    if (fs.existsSync(targetConfig) && !force) {
      console.error(`[depmap] ${path.basename(targetConfig)} already exists. Use --force to overwrite, or omit --write to create ${path.basename(targetSuggested)} instead.`);
      process.exit(1);
    }
    fs.writeFileSync(targetConfig, banner + text);
    console.log(`[depmap] wrote ${path.relative(projectRoot, targetConfig)}`);
  } else {
    fs.writeFileSync(targetSuggested, banner + text);
    console.log(`[depmap] wrote ${path.relative(projectRoot, targetSuggested)}`);
  }

  console.log("\nReview the suggested config, adjust as needed, then run:");
  console.log("  npx depmap");
}

main().catch((err) => {
  console.error("[depmap] error:", err);
  process.exit(1);
});


⸻

How it infers
	•	Roots: scans top-level folders for code; prefers app, components, lib, prisma, stories, scripts, src.
	•	Kinds & tags: detects Next.js page/layout/route, components/Layouts, components/Blocks, components/UI, prisma, server libs, stories, fixtures, schemas, barrels.
	•	Policy allow-matrix: measures actual edges by kind; for each source kind, allows destinations that contribute a meaningful share of edges (≥ 5% or ≥ 3 edges), then always allows types and tokens.
	•	Softening & ignores: converts policy to policy:info when the source is a barrel; ignores policy for stories, fixtures, dev-only if those exist.

This gives you a solid starter depmap.config.ts derived from the project’s true shape. After writing it, run npx depmap to generate the graph and open the viewer.