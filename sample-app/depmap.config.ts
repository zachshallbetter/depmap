export default {
  roots: ["app","components","lib"],
  tagRules: [
    { test: /^app\/.*\/page\.tsx?$/, kind: "page" },
    { test: /^components\/UI\/.+\.(t|j)sx?$/, kind: "ui" },
    { test: /^components\/(?!UI\/).+\.(t|j)sx?$/, kind: "component" },
    { test: /^lib\/(types|component-types)\.ts$/, kind: "types" },
    { test: /^lib\/design-tokens\.ts$/, kind: "tokens" },
    { test: /^lib\/(database|prisma)\.ts$/, kind: "server-lib", addTags: ["server-only"] }
  ],
  policy: {
    allow: {
      page: ["component","ui","types","tokens"],
      component: ["component","ui","types","tokens"],
      ui: ["ui","types","tokens"],
      types: ["types","tokens"],
      tokens: ["tokens"],
      "server-lib": ["server-lib","types"],
      other: ["other"]
    }
  },
  soften: { whenSourceHasTag: { barrel: ["policy"] } },
  ignorePolicyForTags: ["stories","fixtures"],
  exclude: ["^public/.*","^node_modules/.*"]
};