import esbuild from "esbuild";
import path from "node:path";
import fs from "node:fs";

const outdir = path.join(process.cwd(), "viewer", "dist");
fs.mkdirSync(outdir, { recursive: true });

const ctx = await esbuild.context({
  entryPoints: [path.join("viewer", "main.tsx")],
  outfile: path.join(outdir, "viewer.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  sourcemap: true,
  target: ["es2022"],
  jsx: "automatic",
  loader: { ".ts": "ts", ".tsx": "tsx" },
  external: [
    "react",
    "react-dom/client",
    "react/jsx-runtime",
    "d3",
    "d3-sankey",
    "@radix-ui/react-popover",
    "@radix-ui/react-scroll-area",
    "@radix-ui/react-tooltip",
    "@radix-ui/react-toggle-group",
    "@radix-ui/react-dialog"
  ]
});

await ctx.watch();
console.log("[watch-viewer] initial build complete, watching...");

console.log("[watch-viewer] watching viewer → viewer/dist/viewer.js");
// Keep process alive
process.stdin.resume();


