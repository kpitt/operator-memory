import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Effect } from "effect";
import { ChildProcessSpawner } from "effect/unstable/process";

import { type CliContext, type CliResult, getErrorMessage } from "../../utils.ts";
import { type ProcessResult, runProcess } from "../common.ts";

const PLUGIN_NAME = "operator";
const ANTIGRAVITY_PACKAGE = "@aerovato/operator-antigravity";

export const installAntigravity = Effect.fn("installAntigravity")(function* (context: CliContext) {
  const helper = yield* runProcess("operator-helper", ["help"], context.cwd, null);
  const helperFailure = commandFailure(helper, "Operator Helper must be available on PATH");
  if (helperFailure !== null) return helperFailure;

  const directory = yield* Effect.tryPromise(() =>
    mkdtemp(join(tmpdir(), "operator-antigravity-")),
  ).pipe(Effect.result);
  if (directory._tag === "Failure") {
    return {
      exitCode: 1,
      output: `✗ Could not create a temporary directory: ${getErrorMessage(directory.failure)}`,
    } satisfies CliResult;
  }

  return yield* installFrom(directory.success, context.cwd).pipe(
    Effect.ensuring(Effect.promise(() => rm(directory.success, { recursive: true, force: true }))),
  );
});

function installFrom(
  directory: string,
  cwd: string,
): Effect.Effect<CliResult, never, ChildProcessSpawner.ChildProcessSpawner> {
  return Effect.gen(function* () {
    const download = yield* runProcess(
      "npm",
      [
        "install",
        `${ANTIGRAVITY_PACKAGE}@latest`,
        "--prefix",
        directory,
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
      ],
      cwd,
      { NPM_CONFIG_MIN_RELEASE_AGE: "0" },
    );
    const downloadFailure = commandFailure(download, "Could not download the Antigravity plugin");
    if (downloadFailure !== null) return downloadFailure;

    const install = yield* runProcess(
      "agy",
      ["plugin", "install", join(directory, "node_modules", ...ANTIGRAVITY_PACKAGE.split("/"))],
      cwd,
      null,
    );
    const installFailure = commandFailure(install, "Antigravity plugin installation failed");
    if (installFailure !== null) return installFailure;

    const status = yield* runProcess("agy", ["plugin", "list", "--json"], cwd, null);
    const statusFailure = commandFailure(
      status,
      "Could not verify Antigravity plugin installation",
    );
    if (statusFailure !== null) return statusFailure;
    if (!(status.ok && isInstalledAndEnabled(status.stdout))) {
      return {
        exitCode: 1,
        output:
          "✗ Antigravity plugin installation finished but the plugin is not installed and enabled",
      };
    }

    return {
      exitCode: 0,
      output: "✓ Antigravity plugin installed and enabled\nStart a new Antigravity CLI process.",
    };
  });
}

function isInstalledAndEnabled(output: string): boolean {
  try {
    const plugins: unknown = JSON.parse(output);
    return (
      Array.isArray(plugins)
      && plugins.some(
        plugin =>
          typeof plugin === "object"
          && plugin !== null
          && "name" in plugin
          && plugin.name === PLUGIN_NAME
          && "enabled" in plugin
          && plugin.enabled === true,
      )
    );
  } catch {
    return false;
  }
}

function commandFailure(result: ProcessResult, fallback: string): CliResult | null {
  if (!result.ok) return { exitCode: 1, output: `✗ ${fallback}: ${result.error}` };
  return result.exitCode === 0
    ? null
    : { exitCode: result.exitCode, output: result.output || fallback };
}
