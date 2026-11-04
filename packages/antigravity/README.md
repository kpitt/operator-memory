# Operator Memory for Antigravity

Operator Memory gives Antigravity durable project and user context maintained by agents as readable Markdown.

## Install

Requires Antigravity CLI `v1.4.0` or newer and the [Helper](https://github.com/aerovato/operator-memory#installation) installed on `PATH`.

```sh
operator-helper install antigravity
```

Start a new Antigravity CLI process after installation. Run `agy plugin list`, or use the `/plugin list` command from the Antigravity prompt, to confirm `operator` is enabled, then ask the agent whether Operator Memory guidance is available.

The plugin injects the preamble into system instructions for new main and subagent sessions, as well as cleared sessions. Resumed and forked sessions keep their existing context. Start a fresh session with `/clear` to reload memory.

To update the plugin, rerun `operator-helper install antigravity` and restart the Antigravity CLI.

## Commands

- `/operator:user-init` — Configure the User Partition.
- `/operator:project-init` — Configure the Project Brain.
- `/operator:index` — Build or refresh the Project Index.
- `/operator:repair` — Diagnose and repair memory load failures.

Run each Operator command in a new conversation so the agent can focus on setup, indexing, or repair with a clean working context.

## Workspaces

Antigravity does not tell plugins which directory a session was launched from, and it lists mounted workspaces in sorted order rather than launch order. Operator therefore chooses the project from the mounted workspaces by looking for a Project Brain (`.operator` or `.operator-shared`).

- **No workspace:** sessions started outside a project, or with `agy -p` and no `--add-dir`, load only your User Partition. The preamble still suggests `/operator:project-init`, which you can ignore.
- **One workspace:** that workspace is the project.
- **Several workspaces, one Project Brain:** the workspace holding the Brain is the project. The agent is told where it is, so it reads and updates Brain files there even if the session was launched from another directory.
- **Several workspaces, no Project Brain:** only your User Partition is loaded. Run `/operator:project-init` from the directory where you want the Brain created.
- **Several workspaces, several Project Brains:** Operator loads the first workspace in sorted path order, never merges Brains, and asks the agent to tell you in its first reply which Brain is loaded. To use a different one, start a new session with only that workspace mounted.

Antigravity shows no hook messages or errors to the user, so Operator avoids failing wherever it can still load a valid preamble. If Operator memory seems to be missing, ask the agent whether Operator Memory guidance is available.

See the [Antigravity guide](https://github.com/aerovato/operator-memory/blob/main/docs/harnesses/antigravity.md) for verification, updates, and troubleshooting. For local development, run `bun run install:antigravity` from the workspace root.
