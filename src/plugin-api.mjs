import fg from "fast-glob";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

export async function runPlugins({ root, graph, plugins = [] }) {
    const ctx = {
        root,
        graph,
        log: (...a) => console.log("[depmap:plugin]", ...a),
        readText: async (rel) => {
            try { return await fs.readFile(new URL(`file://${root}/${rel}`), "utf8"); }
            catch { return null; }
        },
        glob: async (pat) => fg(pat, { cwd: root, dot: false }),
        git: {
            changedSince: async (rev = "origin/main") => {
                try {
                    const { stdout } = await execFileP("git", ["diff", "--name-only", rev, "HEAD"], { cwd: root });
                    return stdout.trim().split("\n").filter(Boolean);
                } catch { return []; }
            }
        }
    };

    for (const p of plugins) {
        try { await p.apply(ctx); }
        catch (e) { console.warn(`[depmap] plugin ${p?.name || "anonymous"} failed:`, e?.message || e); }
    }
}


