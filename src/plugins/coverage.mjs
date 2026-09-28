export function pluginCoverage({ lcov = "coverage/lcov.info", threshold = 0 } = {}) {
    return {
        name: "coverage",
        async apply(ctx) {
            const text = await ctx.readText(lcov);
            if (!text) return ctx.log("coverage: no lcov at", lcov);

            const map = parseLcov(text);
            let applied = 0;
            for (const n of ctx.graph.nodes) {
                const key = normalize(n.path);
                const pct = map.get(key);
                if (pct != null) {
                    n.meta ||= {};
                    n.meta.coverage = pct;
                    if (pct < threshold) n.meta.coverageLow = true;
                    applied++;
                }
            }
            ctx.log(`coverage: annotated ${applied} nodes`);
        }
    };
}

function parseLcov(data) {
    const out = new Map();
    let file = null, found = false, hit = 0, total = 0;
    for (const line of data.split(/\r?\n/)) {
        if (line.startsWith("SF:")) {
            if (file && found) out.set(normalize(file), total ? Math.round((hit / total) * 100) : 100);
            file = line.slice(3).trim(); found = false; hit = 0; total = 0;
        } else if (line.startsWith("DA:")) {
            const [, hits] = line.split(",");
            total++; if (Number(hits) > 0) { hit++; found = true; }
        } else if (line === "end_of_record" && file) {
            out.set(normalize(file), total ? Math.round((hit / total) * 100) : 100);
            file = null; found = false; hit = 0; total = 0;
        }
    }
    return out;
}

function normalize(p) {
    return p.replace(/^.*?\/(?=(app|src|components|lib|prisma|stories|scripts)\/)/, "").replace(/\\/g, "/");
}


