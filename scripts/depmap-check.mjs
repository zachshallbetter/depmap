import { execFileSync } from "node:child_process";
import fs from "node:fs";

const CUR = "public/graph.json";
if (!fs.existsSync(CUR)) {
    console.error("[depmap-check] missing public/graph.json (run depmap --graphOnly first)");
    process.exit(1);
}

const cur = JSON.parse(fs.readFileSync(CUR, "utf8"));
let base = { edges: [], summary: { flags: {} } };
try {
    const raw = execFileSync("git", ["show", "origin/main:public/graph.json"], { encoding: "utf8" });
    base = JSON.parse(raw);
} catch { }

function flagCounts(g) {
    const out = {};
    for (const e of g.edges || []) for (const f of e.flags || []) out[f] = (out[f] || 0) + 1;
    return out;
}
const a = flagCounts(base), b = flagCounts(cur);
const flags = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();

let regressions = [];
for (const f of flags) {
    const dv = (b[f] || 0) - (a[f] || 0);
    if (dv > 0 && /^(policy|server-in-client)/.test(f)) regressions.push({ flag: f, delta: dv, before: a[f] || 0, after: b[f] || 0 });
}

if (regressions.length) {
    console.error("[depmap-check] new violations detected:");
    for (const r of regressions) console.error(`  ${r.flag}: +${r.delta} (was ${r.before} → now ${r.after})`);
    process.exit(1);
} else {
    console.log("[depmap-check] OK (no new violations)");
}


