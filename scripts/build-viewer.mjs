import esbuild from "esbuild";
import path from "node:path";
import fs from "node:fs";

const outdir = path.join(process.cwd(), "viewer", "dist");
fs.mkdirSync(outdir, { recursive: true });

await esbuild.build({
    entryPoints: [path.join("viewer", "main.tsx")],
    outfile: path.join(outdir, "viewer.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    sourcemap: true,
    target: ["es2020"],
    jsx: "automatic",
    loader: { ".ts": "ts", ".tsx": "tsx" },
    external: [
        "react",
        "react-dom/client",
        "react/jsx-runtime",
        "d3",
        "@radix-ui/react-popover",
        "@radix-ui/react-scroll-area",
        "@radix-ui/react-tooltip",
        "@radix-ui/react-toggle-group",
        "@radix-ui/react-dialog"
    ]
});

console.log("[build-viewer] wrote", path.relative(process.cwd(), path.join(outdir, "viewer.js")));


