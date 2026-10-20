# Antigravity Adapter

Last Updated: November 4, 2026

`@aerovato/operator-antigravity` binds the Antigravity `SessionStart` hook to `operator-helper preamble`. Shared memory rendering remains in Helper. Behavioral deviations are recorded against [`../reference/implementation.md`](../reference/implementation.md). Native hook behavior is documented in [`../../guides/antigravity/hooks.md`](../../guides/antigravity/hooks.md).

## Failure Visibility

Antigravity gives hook scripts no way to show a message or error to the user. stdout and stderr are captured by the harness, and a nonzero exit or invalid response is written only to the internal `cli.log` while the session continues as if no hook were registered. A failed render therefore means a session with no Operator context and no user-visible signal. Prefer injecting a valid preamble over failing wherever a valid one can be produced.

## No Workspace

An empty `workspacePaths` array means the session has no project: `agy` or the app outside a project, or `agy -p` without `--add-dir`. The hook still injects memory, so the User Partition and user instructions apply.

- Helper runs with a freshly created empty temporary directory as cwd, removed afterward. This guarantees no project partition loads. The hook process directory (the plugin directory) is not used because it depends on the install layout, and the home directory is not used because `~/.operator` would load as a Project Private partition.
- The preamble keeps its standard `<operator-warning>` that neither project partition exists. The warning is conditional on significant project work and is not suppressed for project-less sessions.

Long-term goal: a Helper option such as `operator-helper preamble --user-only` that loads only the User Partition and omits project warnings, so project-less sessions never suggest `/operator:project-init`. This needs a core `renderPreamble` change and an update to the Warnings section of [`../preamble.md`](../preamble.md). The no-workspace render must adopt it; the no-Brain case below must not.

## Brain Root

When `workspacePaths` has several entries and at least one contains `.operator` or `.operator-shared`, Helper runs in that root: it is the only evidence of which workspace is the project, since the array is sorted and carries no launch directory. The preamble names Brain files by relative path, which the agent resolves against its own cwd and which may differ from the Brain root. In that case the hook appends a second `systemMessage` step wrapped in `<operator-warning>` that states the absolute Brain root and tells the agent to resolve relative Brain paths and run Brain-operating `operator-helper` commands there, and not to create a Project Brain in another workspace. When exactly one root holds a Brain, the text says nothing is missing so the agent does not report it as a setup problem. A single workspace path gets no extra step.

Several roots holding a Brain: the hook loads the lexically first Brain-holding root and does not fail. A failed hook is invisible to the user and would also drop the User Partition, so an injected preamble from an arbitrary but stable root beats none (the same rationale as the no-workspace and no-Brain cases). The pick is stable because Antigravity sorts `workspacePaths`, so the same mounted set always yields the same root across sessions and subagents, but it carries no meaning about which project the user is working in. The choice is therefore not silent: the `<operator-warning>` lists the other Brain-holding roots, says the loaded root was chosen only because it sorts first, and tells the agent to report this to the user in its first reply, including that mounting only the intended workspace selects a different Brain. Brains are never merged.

No environment-variable override (such as `OPERATOR_PROJECT_DIR`) and no Gemini-era variables (`GEMINI_CWD`, `GEMINI_PROJECT_DIR`, `CLAUDE_PROJECT_DIR`) are read. A hook-environment dump showed Antigravity sets no `GEMINI_*` or `CLAUDE_*` variables. A variable the user exports globally cannot be set per launch for the app, would pin every session to one project, and could not be validated or reported from the hook. The escape hatch is to mount only the intended workspace. Reconsider an override only on real demand, validated against `workspacePaths` and a Brain.

Tag choice: the note is dynamic, conditional on the render-time environment, and directs the agent about a detected situation, which is the category `<operator-warning>` already covers in [`../preamble.md`](../preamble.md). Warnings carry no authority ranking. The other core tags do not fit:

- `<operator-instructions>` holds the user-owned `operator.md` files ranked least to most authoritative; a note appended last could read as a fourth, highest-priority instruction source.
- `<operator-guidance>` and `<operator-tenets>` are fixed prompt text, and Kiro uses `<operator-guidance>` as a loaded marker.
- `<operator-diagnostic>` signals a load failure and tells the agent to stop and repair.

No new tag is defined: the label vocabulary belongs to core and the preamble spec, and an adapter-only tag would fragment it. If another multi-directory adapter needs the same note, promote it to a documented core tag rather than duplicating it per adapter.

## No Brain in Any Workspace

When `workspacePaths` has entries but none contains `.operator` or `.operator-shared`, the session is valid: the user may run `/operator:project-init`, which writes to the agent's own cwd (the launch directory, which the hook cannot determine). Helper runs in the first path. Since no Brain is selected and project loading checks only the cwd itself, the preamble is identical for every root, so the arbitrary (lexically sorted) first path is harmless. The standard project-init `<operator-warning>` stays.
