depmap

Dependency map + interactive viewer for JavaScript/TypeScript projects (Next.js/React friendly).
Zero build step, Radix UI + ShadCN look and feel, URL-state, Inspector, and a Web Worker force layout.
	•	Scans your repo and writes public/graph.json
	•	Serves a viewer and opens your browser
	•	Policy checks (define what kinds can import what)
	•	Fast, responsive layout in a Worker
	•	Shareable state via URL query string

⸻

Contents
	•	Quickstart
	•	CLI
	•	Configuration
	•	Policy
	•	Viewer
	•	Keyboard shortcuts
	•	Output format
	•	CI usage
	•	Troubleshooting
	•	Performance tips
	•	FAQ
	•	Contributing and license

⸻

Quickstart
	1.	Install and create a config at your project root:

npm i -D depmap
# or: npx depmap  (will prompt if config is missing)

Create depmap.config.ts:

// depmap.config.ts
export default {
  roots: ["app", "components", "lib", "prisma", "stories", "scripts"],

  // Assign "kinds" and "tags" based on path patterns.
  tagRules: [
    { test: /^app\/.*\/page\.tsx?$/,                   kind: "page" },
    { test: /^app\/.*\/layout\.tsx?$/,                 kind: "page" },
    { test: /^app\/api\/.*\/route\.(t|j)s$/,           kind: "api", addTags: ["server-only"] },

    { test: /^components\/Layouts\/.+\.(t|j)sx?$/,     kind: "layout-block" },
    { test: /^components\/Blocks\/.+\.(t|j)sx?$/,      kind: "content-block" },

    { test: /^components\/UI\/.+\.(t|j)sx?$/,          kind: "ui" },
    { test: /^components\/(?!Tools\/).+\.(t|j)sx?$/,   kind: "component" },
    { test: /^components\/Tools\/.+\.(t|j)sx?$/,       kind: "styleguide" },

    { test: /^lib\/(types|component-types)\.ts$/,      kind: "types" },
    { test: /^lib\/design-tokens\.ts$/,                kind: "tokens" },
    { test: /^lib\/(database|prisma)\.ts$/,            kind: "server-lib", addTags: ["server-only"] },
    { test: /^prisma\/.+$/,                            kind: "prisma", addTags: ["server-only"] },

    { test: /index\.(t|j)s$/,                          addTags: ["barrel"] },
    { test: /\.schema\.(t|j)s$/,                       addTags: ["schema"] }
  ],

  // Policy is evaluated on edges (imports/exports). Use it to forbid certain directions.
  policy: {
    allow: {
      page:           ["layout-block","content-block","component","animation","types","tokens"],
      "layout-block": ["content-block","component","ui","animation","types","tokens"],
      "content-block":["component","ui","animation","types","tokens"],
      component:      ["component","ui","animation","types","tokens"],
      ui:             ["ui","types","tokens"],
      animation:      ["ui","component","types","tokens"],
      styleguide:     ["page","layout-block","content-block","component","ui","animation","types","tokens","server-lib","prisma","api","other"],
      types:          ["types","tokens"],
      tokens:         ["tokens"],
      "server-lib":   ["server-lib","types"],
      prisma:         [],
      api:            ["server-lib","types"]
    }
  },

  // Downgrade severity based on tags on the source file.
  soften: { whenSourceHasTag: { barrel: ["policy"] } },

  // Policy will be ignored entirely if either side has these tags.
  ignorePolicyForTags: ["stories","fixtures","dev-only"],

  // Optional folders to exclude from scanning (regex strings rooted at repo).
  exclude: ["^public/.*","^node_modules/.*","^storybook-static/.*"]
} as const;

	2.	Run it:

npx depmap               # generates public/graph.json, serves the viewer, opens browser

The viewer is available at http://localhost:5656/ by default.

⸻

CLI

npx depmap [options]

Option	Type	Default	Description
--root, -r	string	cwd	Path to project root (where your depmap.config.ts lives)
--port, -p	number	5656	Viewer port
--open, -o	boolean	true	Open browser after server starts
--graphOnly	boolean	false	Only generate public/graph.json, do not start viewer


⸻

Configuration

depmap.config.ts is required at the repository root.

Fields
	•	roots: string[]
Folders to scan for files.
	•	tagRules: { test: RegExp; kind?: string; addTags?: string[] }[]
Maps a path to a kind and optional tags. First match wins.
	•	policy: { allow: Record<Kind, Kind[]> }
Declares which kind may depend on which other kinds. Any import not allowed is flagged as policy (or policy:info when softened).
	•	soften: { whenSourceHasTag?: Record<string, string[]> }
Downgrade flags when the source file has a given tag. Example: if source has barrel, convert policy to policy:info.
	•	ignorePolicyForTags: string[]
If either side of an edge has any of these tags, policy flags are not applied.
	•	exclude: string[]
Repo-root-anchored regex strings to skip paths entirely.

Kinds are arbitrary labels you define. A common set used by the viewer is:
page, layout-block, content-block, component, ui, animation, styleguide, types, tokens, server-lib, api, prisma, other.

⸻

Policy

An edge is created for:
	•	static imports,
	•	re-exports,
	•	import() calls where the argument is a string literal.

Each edge is checked against policy.allow[source.kind].
If the destination kind is not listed, the edge receives a policy flag.

Extra flags:
	•	server-in-client — a client surface (e.g., components/* or app/* non-API) imports a server-only file (server-lib, prisma, api, or a file tagged server-only).
	•	policy:info — policy violation softened by soften.whenSourceHasTag.

You can ignore policy for dev/test code via ignorePolicyForTags.

⸻

Viewer

The viewer is a static ESM app (React + D3), styled with a ShadCN-like theme and Radix primitives. The force simulation runs in a Web Worker so the UI remains responsive.

URL-state

The app keeps its state in the URL under dg.*:
	•	dg.selectedId — currently focused node id
	•	dg.hops — hop depth when focused (1–3)
	•	dg.q — search query
	•	dg.dirPrefix — directory prefix filter
	•	dg.onlyFlagged — show only edges with enabled flags
	•	dg.enabledFlags — record of which flags are active
	•	dg.kindFilter — record of which kinds are visible

Copy the URL to share an exact view.

Controls
	•	Search: filters nodes by full path.
	•	Flag chips: toggle individual flags; “only flagged” shows nodes connected by flagged edges.
	•	Kind chips: show/hide kinds; “All/None” presets included.
	•	Hops: when focused on a node, shows neighbors within N hops.
	•	Clear focus: exit focus mode.
	•	Reset: resets focus and all filters.
	•	Tree: click a directory to filter by it; click a file to focus that node.

Inspector

Click any node to open the Inspector:
	•	path, kind, tags, cycle mark
	•	in/out degree
	•	incident flags
	•	neighbor list
	•	actions: Expand neighbors, Reveal in tree

⸻

Keyboard shortcuts
	•	f — focus search input
	•	g — reset zoom
	•	h / j — decrease / increase hops
	•	a — enable all kinds
	•	i — invert kinds
	•	Esc — clear focus

⸻

Output format

public/graph.json:

type Node = {
  id: string;        // repo-relative path
  path: string;      // same as id
  kind: string;      // from tagRules
  tags?: string[];   // from tagRules
  circular?: boolean;
};

type Edge = {
  source: string;    // Node.id
  target: string;    // Node.id
  flags?: string[];  // "policy", "policy:info", "server-in-client", etc.
};

type Graph = {
  nodes: Node[];
  edges: Edge[];
  summary?: {
    counts: { nodes: number; edges: number };
    flags: Record<string, number>;
  };
  policy?: { allow: Record<string, string[]> };
};


⸻

CI usage

Add a script to regenerate the graph and keep it as a build artifact:

{
  "scripts": {
    "depmap:graph": "depmap --graphOnly"
  }
}

In a pull request workflow, run depmap --graphOnly, upload public/graph.json, and optionally post counts from summary.flags to the PR as a check.

⸻

Troubleshooting
	•	“Missing depmap.config.ts”
Create it at the repo root. The CLI prints a sample.
	•	Nothing shows in the viewer
Check public/graph.json exists and contains nodes. Ensure roots includes your code folders.
	•	Edges to external packages are missing
Only files resolvable inside your repo are graphed. External packages are intentionally excluded.
	•	Path aliases are not resolving
Make sure tsconfig.json has baseUrl and paths and that it can be discovered from the project root.
	•	Large repos feel heavy
Use directory filters and kind filters. The worker layout keeps the UI responsive, but rendering thousands of labels can still be costly—zoom in or rely on hover and Inspector.

⸻

Performance tips
	•	Prefer filtering in the toolbar before focusing on a single node.
	•	Labels hide below a zoom threshold; zoom in for text.
	•	Use roots and exclude to keep the graph relevant.
	•	Add tags like server-only to surface client/server boundary mistakes.

⸻

FAQ

Does this modify my code?
No. It only reads files and writes public/graph.json.

What files are scanned?
**/*.{ts,tsx,js,jsx} inside roots, excluding exclude patterns.

How are dynamic imports handled?
String-literal import("…") are resolved like static imports. Non-literal expressions are ignored.

What about monorepos?
Run with --root at the workspace you want to visualize. You can create a config per package.

⸻

Contributing and license

Contributions are welcome. Open issues and PRs with clear reproduction steps.
License: MIT.

⸻

Acknowledgements
	•	Radix UI primitives for accessible controls.
	•	ShadCN-inspired tokens for a clean, minimal theme.
	•	D3 for rendering and the Web Worker force simulation.