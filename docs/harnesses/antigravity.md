# Antigravity

### Install

Requires Antigravity CLI `v1.4.0` or newer, Node.js 20 or newer, and the [Helper](../../README.md#installation) installed on `PATH`.

```sh
operator-helper install antigravity
```

Start a new Antigravity CLI process after installation.

The plugin injects the preamble into system instructions for new main and subagent sessions, as well as cleared sessions. Resumed and forked sessions keep their existing context. Start a fresh session with `/clear` to reload memory.

### Verify

Run `agy plugin list`, or use the `/plugin list` command from the Antigravity prompt, to confirm `operator` is enabled. Then, in a new session, ask:

```text
Is Operator Memory guidance available to you? Give a brief outline of what it says.
```

The agent should confirm the guidance is loaded and outline the brain, partitions, and memory-aware workflow. If it cannot, confirm the plugin is enabled, then start a new process or session.

### Commands

- `/operator:user-init` — Configure the User Partition.
- `/operator:project-init` — Configure the Project Brain.
- `/operator:index` — Build or refresh the Project Index.
- `/operator:repair` — Diagnose and repair memory load failures.

Run each in a new conversation. See [Getting Started](../getting-started.md#appendix-commands) for what each command does.

### Update

Rerun the install command and restart the Antigravity CLI:

```sh
operator-helper install antigravity
```

For local development, run `bun run install:antigravity` from the workspace root.

### Workspaces

Antigravity does not tell plugins which directory a session was launched from, and it lists mounted workspaces in sorted order rather than launch order. Operator therefore chooses the project from the mounted workspaces by looking for a Project Brain (`.operator` or `.operator-shared`).

- **No workspace:** sessions started outside a project, or with `agy -p` and no `--add-dir`, load only your User Partition. The preamble still suggests `/operator:project-init`, which you can ignore.
- **One workspace:** that workspace is the project.
- **Several workspaces, one Project Brain:** the workspace holding the Brain is the project. The agent is told where it is, so it reads and updates Brain files there even if the session was launched from another directory.
- **Several workspaces, no Project Brain:** only your User Partition and the `/operator:project-init` suggestion apply. Run `/operator:project-init` from the directory where you want the Brain created.
- **Several workspaces, several Project Brains:** Operator loads the first workspace in sorted path order, never merges Brains, and asks the agent to tell you in its first reply which Brain is loaded. To use a different one, start a new session with only that workspace mounted.

### Known Bugs and Limitations

- No hook feedback: Antigravity shows no hook messages or errors to the user, so Operator avoids failing wherever it can still load a valid preamble. Ask the agent whether Operator Memory guidance is available to check.
- Resumed and forked sessions do not reload memory. Use `/clear` or start a new session.

### Troubleshooting

- No Operator guidance: confirm `operator` is enabled with `agy plugin list`, rerun the install command, and start a new Antigravity process.
- Wrong project loaded with several workspaces: see [Workspaces](#workspaces) and mount only the intended workspace.
- Missing memory or load failures: see [Troubleshooting](../troubleshooting.md).
