---
description: "@aerovato/operator-antigravity plugin package, SessionStart hook, Operator skills, and tests"
read_if: Working in packages/antigravity or changing Antigravity plugin packaging, preamble injection, or skills
---

# Operator Antigravity Index

## Coverage

- `packages/antigravity/`

## Architecture

- `@aerovato/operator-antigravity` is an Antigravity plugin package that injects the Operator preamble via a `SessionStart` command hook and exposes the four Operator workflows as skills.
- Bun compiles `src/session-start.ts` into a self-contained Node ESM hook script (`hooks/session-start.js`) that runs `operator-helper preamble` in the first workspace path and returns an `injectSteps` system message response.

## `packages/antigravity/` Index

- `README.md`, `package.json`, `tsconfig.check.json` — Ditto
- `plugin.json` — Antigravity plugin manifest.
- `hooks.json` — Registers the `SessionStart` command hook (`node ./hooks/session-start.js`).
- `hooks/session-start.js` — Ignored generated Node ESM `SessionStart` hook bundle.
- `src/session-start.ts` — Validates `SessionStart` event input, runs `operator-helper preamble` in the primary workspace directory, and emits an `injectSteps` system message response or fails loudly.
- `src/types.ts` — Antigravity hook event interfaces, runtime type guards, `injectSteps` response constructors, and `HookError`.
- `scripts/build.ts` — Clean minified Node ESM build for `hooks/session-start.js`.
- `skills/user-init/SKILL.md`, `skills/project-init/SKILL.md`, `skills/index/SKILL.md`, `skills/repair/SKILL.md` — Agent-driven User, Project, Index, and memory-repair workflows.
