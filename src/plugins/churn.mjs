import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

export function pluginChurn({ since = "12 months ago" } = {}) {
  return {
    name: "git-churn",
    async apply(ctx) {
      const cwd = ctx.root;

      let churnText = "";
      try {
        const { stdout } = await execFileP(
          "git",
          ["log", `--since=${since}`, "--numstat", "--format=%H %ad", "--date=iso"],
          { cwd, maxBuffer: 8 * 1024 * 1024 }
        );
        churnText = stdout;
      } catch {
        ctx.log("git-churn: no git history or command failed");
        return;
      }

      const fileStats = new Map();
      let lastCommitHeader = null;
      for (const line of churnText.split(/\r?\n/)) {
        if (!line) continue;
        if (/^[0-9a-f]{7,} /.test(line)) { lastCommitHeader = true; continue; }
        const m = line.match(/^(\d+|-)\s+(\d+|-)\s+(.+)$/);
        if (!m) continue;
        const adds = m[1] === "-" ? 0 : +m[1];
        const dels = m[2] === "-" ? 0 : +m[2];
        const file = m[3].replace(/\\/g, "/");
        const cur = fileStats.get(file) || { adds: 0, dels: 0, commits: 0 };
        cur.adds += adds; cur.dels += dels;
        cur.commits += lastCommitHeader ? 1 : 0;
        lastCommitHeader = false;
        fileStats.set(file, cur);
      }

      const once = async (file) => {
        try {
          const { stdout } = await execFileP(
            "git",
            ["log", "-1", "--pretty=format:%an\t%ad", "--date=iso", "--", file],
            { cwd }
          );
          const [author, date] = stdout.split("\t");
          return { author, date };
        } catch { return { author: null, date: null }; }
      };

      let annotated = 0;
      for (const n of ctx.graph.nodes) {
        const s = fileStats.get(n.path);
        if (!s) continue;
        const meta = (n.meta ||= {});
        meta.churnAdds = s.adds;
        meta.churnDels = s.dels;
        meta.churn = s.adds + s.dels;
        meta.commits = s.commits;
        const { author, date } = await once(n.path);
        if (author) meta.lastAuthor = author;
        if (date)   meta.lastTouched = date;
        annotated++;
      }
      ctx.log(`git-churn: annotated ${annotated} nodes`);
    }
  };
}


