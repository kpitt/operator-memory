# Operator Memory for Antigravity

Operator Memory gives Antigravity durable project and user context maintained by agents as readable Markdown.

## Install

Requires Antigravity CLI `v1.4.0` or newer and the [Helper](https://github.com/aerovato/operator-memory#installation) installed on `PATH`.

<!--
TODO: Implement an `operator-helper install` command for Antigravity.
TODO: Determine whether or not Antigravity supports custom marketplaces.
-->
```sh
operator-helper install antigravity
```

Start a new Antigravity CLI process after installation. Run `agy plugin list`, or use the `/plugin list` command from the Antigravity prompt, to confirm `operator` is enabled, then ask the agent whether Operator Memory guidance is available.

<!-- TODO: Determine how Antigravity handles initial context for new subagents. -->
The plugin injects the preamble into the main system instructions once for each new or cleared session. Resumed and forked sessions keep their existing context. Start a fresh session with `/clear` to reload memory.

To update the plugin, rerun `operator-helper install antigravity` and restart the Antigravity CLI.

## Commands

- `/operator:user-init` — Configure the User Partition.
- `/operator:project-init` — Configure the Project Brain.
- `/operator:index` — Build or refresh the Project Index.
- `/operator:repair` — Diagnose and repair memory load failures.

Run each Operator command in a new conversation so the agent can focus on setup, indexing, or repair with a clean working context.

<!-- TODO: Create the "harnesses" doc file for Antigravity -->
See the [Antigravity guide](https://github.com/aerovato/operator-memory/blob/main/docs/harnesses/antigravity.md) for verification, updates, and troubleshooting. For local development, run `bun run install:antigravity` from the workspace root.
