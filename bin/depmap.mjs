#!/usr/bin/env node
import { fileURLToPath } from "url";
import path from "node:path";
import fs from "node:fs";
import minimist from "minimist";
import open from "open";
import chokidar from "chokidar";
import { generateGraph } from "../src/generate-graph.mjs";
import { serve } from "../src/server.mjs";
import { loadConfig } from "../src/load-config.mjs";
import { inferRules } from "../src/infer-rules.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function build({ projectRoot, config }) {
  const graph = await generateGraph({ root: projectRoot, config });
  const outPath = path.join(projectRoot, "public", "graph.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(graph, null, 2));
  console.log(`[depmap] wrote ${path.relative(projectRoot, outPath)} (${graph.nodes.length} nodes, ${graph.edges.length} edges)`);
  return graph;
}

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: ["root", "port"],
    boolean: ["open", "graphOnly", "write", "force", "watch"],
    alias: { r: "root", p: "port", o: "open" },
    default: { root: process.cwd(), port: "5656", open: true, graphOnly: false, write: false, force: false, watch: false }
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
  await build({ projectRoot, config });

  if (argv.graphOnly && !argv.watch) return;

  const viewerRoot = path.join(__dirname, "../viewer");
  const srv = await serve({ projectRoot, viewerRoot, port: Number(argv.port) });

  console.log(`[depmap] viewer on ${srv.url}`);
  if (argv.open) await open(srv.url);

  if (argv.watch) {
    const roots = config.roots?.length ? config.roots : ["."];
    const globs = roots.map(r => `${r}/**/*.{ts,tsx,js,jsx}`);
    const watcher = chokidar.watch(globs, {
      cwd: projectRoot,
      ignored: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**", "**/public/graph.json"],
    });
    const rebuild = debounce(async () => {
      try {
        await build({ projectRoot, config });
        srv.broadcast("graph", { at: Date.now() });
      } catch (e) {
        console.error("[depmap] rebuild failed:", e?.message || e);
      }
    }, 250);
    watcher.on("add", rebuild).on("change", rebuild).on("unlink", rebuild);
    console.log("[depmap] watch mode enabled");
  }
}

async function runInfer({ projectRoot, write, force }) {
  console.log(`[depmap] inferring rules from ${projectRoot}`);
  const { text, stats, roots, features } = await inferRules({ root: projectRoot });
  const targetSuggested = path.join(projectRoot, "depmap.config.suggested.ts");
  const targetConfig = path.join(projectRoot, "depmap.config.ts");

  const banner =
    `// Files: ${stats.files}, Nodes: ${stats.nodes}, Edges: ${stats.edges}\n` +
    `// Roots: ${roots.join(", ")}\n` +
    `// Detected: ${Object.entries(features).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}\n\n`;

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