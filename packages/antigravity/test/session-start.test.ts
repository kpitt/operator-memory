import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { chmod, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, test } from "vitest";

const hookPath = resolve(import.meta.dirname, "../src/session-start.ts");
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })),
  );
});

async function temporaryDirectory(prefix: string): Promise<string> {
  const directory = await realpath(await mkdtemp(join(tmpdir(), prefix)));
  temporaryDirectories.push(directory);
  return directory;
}

async function helperBin(fail: boolean): Promise<string> {
  const directory = await temporaryDirectory("operator-antigravity-bin-");
  const helperPath = join(directory, "operator-helper");
  await writeFile(
    helperPath,
    `#!/usr/bin/env node
if (${JSON.stringify(fail)}) process.exit(1);
process.stdout.write(JSON.stringify({ cwd: process.cwd(), arguments: process.argv.slice(2) }));
`,
  );
  await chmod(helperPath, 0o755);
  return directory;
}

function runHook(event: unknown, binDirectory: string): SpawnSyncReturns<string> {
  return spawnSync("bun", [hookPath], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${binDirectory}:${process.env.PATH ?? ""}` },
    input: typeof event === "string" ? event : JSON.stringify(event),
  });
}

function baseEvent(workspacePaths: string[]): Record<string, unknown> {
  return {
    conversationId: "test-conversation-id",
    workspacePaths,
    transcriptPath: "/path/to/transcript.jsonl",
    artifactDirectoryPath: "/path/to/artifacts",
    modelName: "test-model",
  };
}

test("uses the single workspace path as cwd when no operator directory exists", async () => {
  const workspace = await temporaryDirectory("workspace-single-");
  const binDirectory = await helperBin(false);
  const result = runHook(baseEvent([workspace]), binDirectory);

  expect(result.status).toBe(0);
  const parsed = JSON.parse(result.stdout);
  expect(parsed).toEqual({
    injectSteps: [
      {
        systemMessage: {
          systemMessage: JSON.stringify({ cwd: workspace, arguments: ["preamble"] }),
        },
      },
    ],
  });
});

test("uses the single workspace path as cwd when an operator directory exists", async () => {
  const workspace = await temporaryDirectory("workspace-single-");
  await mkdir(join(workspace, ".operator"));
  const binDirectory = await helperBin(false);
  const result = runHook(baseEvent([workspace]), binDirectory);

  expect(result.status).toBe(0);
  const parsed = JSON.parse(result.stdout);
  expect(parsed).toEqual({
    injectSteps: [
      {
        systemMessage: {
          systemMessage: JSON.stringify({ cwd: workspace, arguments: ["preamble"] }),
        },
      },
    ],
  });
});

test("selects the workspace containing .operator when multiple workspaces are present", async () => {
  const workspace1 = await temporaryDirectory("workspace-1-");
  const workspace2 = await temporaryDirectory("workspace-2-");
  await mkdir(join(workspace2, ".operator"));

  const binDirectory = await helperBin(false);
  const result = runHook(baseEvent([workspace1, workspace2]), binDirectory);

  expect(result.status).toBe(0);
  const parsed = JSON.parse(result.stdout);
  expect(parsed).toEqual({
    injectSteps: [
      {
        systemMessage: {
          systemMessage: JSON.stringify({ cwd: workspace2, arguments: ["preamble"] }),
        },
      },
    ],
  });
});

test("selects the workspace containing .operator-shared when multiple workspaces are present", async () => {
  const workspace1 = await temporaryDirectory("workspace-1-");
  const workspace2 = await temporaryDirectory("workspace-2-");
  await mkdir(join(workspace2, ".operator-shared"));

  const binDirectory = await helperBin(false);
  const result = runHook(baseEvent([workspace1, workspace2]), binDirectory);

  expect(result.status).toBe(0);
  const parsed = JSON.parse(result.stdout);
  expect(parsed).toEqual({
    injectSteps: [
      {
        systemMessage: {
          systemMessage: JSON.stringify({ cwd: workspace2, arguments: ["preamble"] }),
        },
      },
    ],
  });
});

test("selects the first matching workspace when multiple workspaces contain operator directories", async () => {
  const workspace1 = await temporaryDirectory("workspace-1-");
  const workspace2 = await temporaryDirectory("workspace-2-");
  await mkdir(join(workspace1, ".operator"));
  await mkdir(join(workspace2, ".operator-shared"));

  const binDirectory = await helperBin(false);
  const result = runHook(baseEvent([workspace1, workspace2]), binDirectory);

  expect(result.status).toBe(0);
  const parsed = JSON.parse(result.stdout);
  expect(parsed).toEqual({
    injectSteps: [
      {
        systemMessage: {
          systemMessage: JSON.stringify({ cwd: workspace1, arguments: ["preamble"] }),
        },
      },
    ],
  });
});

test("fails when multiple workspaces are present and none contain an operator directory", async () => {
  const workspace1 = await temporaryDirectory("workspace-1-");
  const workspace2 = await temporaryDirectory("workspace-2-");

  const binDirectory = await helperBin(false);
  const result = runHook(baseEvent([workspace1, workspace2]), binDirectory);

  expect(result.status).not.toBe(0);
  expect(result.stdout).toBe(JSON.stringify({}));
});

test("fails when workspacePaths is empty", async () => {
  const binDirectory = await helperBin(false);
  const result = runHook(baseEvent([]), binDirectory);

  expect(result.status).not.toBe(0);
  expect(result.stdout).toBe(JSON.stringify({}));
});

test("fails when input is invalid JSON", async () => {
  const binDirectory = await helperBin(false);
  const result = runHook("not-valid-json", binDirectory);

  expect(result.status).not.toBe(0);
  expect(result.stdout).toBe(JSON.stringify({}));
});

test("fails when helper fails", async () => {
  const workspace = await temporaryDirectory("workspace-1-");
  const binDirectory = await helperBin(true);
  const result = runHook(baseEvent([workspace]), binDirectory);

  expect(result.status).not.toBe(0);
  expect(result.stdout).toBe(JSON.stringify({}));
});
