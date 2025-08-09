#!/usr/bin/env node
import { fileURLToPath, pathToFileURL } from "url";
import path from "node:path";
import fs from "node:fs";
import minimist from "minimist";
import open from "open";
import { generateGraph } from "../src/generate-graph.mjs";
import { serve } from "../src/server.mjs";
import { loadConfig } from "../src/load-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: ["root", "port"],
    boolean: ["open", "graphOnly"],
    alias: { r: "root", p: "port", o: "open" },
    default: { root: process.cwd(), port: "5656", open: true, graphOnly: false }
  });

  const projectRoot = path.resolve(argv.root);

  // Require user config (TS/JS supported)
  const cfgPath = ["depmap.config.ts", "depmap.config.mjs", "depmap.config.js"]
    .map(p => path.join(projectRoot, p))
    .find(p => fs.existsSync(p));

  if (!cfgPath) {
    const sample = path.join(projectRoot, "depmap.config.ts");
    console.error("[depmap] Missing depmap.config.ts at project root.");
    console.error("Create one like this:\n");
    console.error(SAMPLE_CONFIG);
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

const SAMPLE_CONFIG = `export default {
  roots: ["app","components","lib","prisma","stories","scripts"],
  tagRules: [
    { test: /^app\\/.*\\/page\\.tsx?$/, kind: "page" },
    { test: /^app\\/.*\\/layout\\.tsx?$/, kind: "page" },
    { test: /^app\\/api\\/.*\\/route\\.(t|j)s$/, kind: "api", addTags: ["server-only"] },
    { test: /^components\\/Layouts\\/.+\\.(t|j)sx?$/, kind: "layout-block" },
    { test: /^components\\/Blocks\\/.+\\.(t|j)sx?$/,  kind: "content-block" },
    { test: /^components\\/UI\\/.+\\.(t|j)sx?$/,      kind: "ui" },
    { test: /^components\\/(?!Tools\\/).+\\.(t|j)sx?$/, kind: "component" },
    { test: /^components\\/Tools\\/.+\\.(t|j)sx?$/,   kind: "styleguide" },
    { test: /^lib\\/(types|component-types)\\.ts$/,   kind: "types" },
    { test: /^lib\\/design-tokens\\.ts$/,            kind: "tokens" },
    { test: /^lib\\/(database|prisma)\\.ts$/,        kind: "server-lib", addTags: ["server-only"] },
    { test: /^prisma\\/.+$/,                         kind: "prisma", addTags: ["server-only"] },
    { test: /index\\.(t|j)s$/,                       addTags: ["barrel"] },
    { test: /\\.schema\\.(t|j)s$/,                   addTags: ["schema"] }
  ],
  ignorePolicyForTags: ["stories","fixtures","dev-only"],
  policy: {
    allow: {
      page: ["layout-block","content-block","component","animation","types","tokens"],
      "layout-block": ["content-block","component","ui","animation","types","tokens"],
      "content-block": ["component","ui","animation","types","tokens"],
      component: ["component","ui","animation","types","tokens"],
      ui: ["ui","types","tokens"],
      animation: ["ui","component","types","tokens"],
      styleguide: ["page","layout-block","content-block","component","ui","animation","types","tokens","server-lib","prisma","api","other"],
      types: ["types","tokens"],
      tokens: ["tokens"],
      "server-lib": ["server-lib","types"],
      prisma: [],
      api: ["server-lib","types"]
    }
  },
  soften: {
    flags: ["block->page"],
    whenSourceHasTag: { barrel: ["policy"] }
  },
  exclude: ["^public/.*","^node_modules/.*","^storybook-static/.*"]
};`;

main().catch(err => {
  console.error("[depmap] error:", err);
  process.exit(1);
});