# Security Policy

## Reporting a vulnerability

If you find a security issue in depmap, please report it privately rather than opening a
public issue. Use GitHub private vulnerability reporting:

<https://github.com/zachshallbetter/depmap/security/advisories/new>

Include:

- a description of the issue and its impact,
- steps to reproduce (a minimal example is ideal),
- the affected component and version or commit.

This is a solo-maintained project. Handling is best-effort with no SLA: there is no
guaranteed response or fix time. Please give a reasonable window to ship a fix before any
public disclosure.

## Scope

This repository currently holds the README, three design drafts (`Setup.md`, `Additions.md`,
`Inferance.md`) and a placeholder `package.json`. It contains no executable source. The
README describes a tool that reads project files, writes `public/graph.json`, and serves a
viewer on a local port (default 5656). In scope are security problems in the code that
those documents specify: the local viewer server, file and path handling, and the loading
of `depmap.config.ts`.

## Supported versions

depmap has no packaged release in this repository. Only the latest commit on `main` is current.
