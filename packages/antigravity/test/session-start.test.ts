import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
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

function preambleStep(cwd: string): unknown {
  return {
    systemMessage: { systemMessage: JSON.stringify({ cwd, arguments: ["preamble"] }) },
  };
}

function expectBrainRootStep(step: unknown, brainRoot: string, otherBrainRoots: string[]): void {
  const message = (step as { systemMessage: { systemMessage: string } }).systemMessage
    .systemMessage;
  expect(message).toMatch(/^<operator-warning>\n/);
  expect(message).toMatch(/\n<\/operator-warning>$/);
  expect(message).toContain(brainRoot);
  if (otherBrainRoots.length === 0) {
    expect(message).not.toContain("more than one");
    return;
  }
  expect(message).toContain("more than one");
  for (const root of otherBrainRoots) expect(message).toContain(`- ${root}`);
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
  expect(parsed.injectSteps).toHaveLength(2);
  expect(parsed.injectSteps[0]).toEqual(preambleStep(workspace2));
  expectBrainRootStep(parsed.injectSteps[1], workspace2, []);
});

test("selects the workspace containing .operator-shared when multiple workspaces are present", async () => {
  const workspace1 = await temporaryDirectory("workspace-1-");
  const workspace2 = await temporaryDirectory("workspace-2-");
  await mkdir(join(workspace2, ".operator-shared"));

  const binDirectory = await helperBin(false);
  const result = runHook(baseEvent([workspace1, workspace2]), binDirectory);

  expect(result.status).toBe(0);
  const parsed = JSON.parse(result.stdout);
  expect(parsed.injectSteps).toHaveLength(2);
  expect(parsed.injectSteps[0]).toEqual(preambleStep(workspace2));
  expectBrainRootStep(parsed.injectSteps[1], workspace2, []);
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
  expect(parsed.injectSteps).toHaveLength(2);
  expect(parsed.injectSteps[0]).toEqual(preambleStep(workspace1));
  expectBrainRootStep(parsed.injectSteps[1], workspace1, [workspace2]);
});

test("skips roots without a Brain and reports every other Brain root", async () => {
  const workspace1 = await temporaryDirectory("workspace-1-");
  const workspace2 = await temporaryDirectory("workspace-2-");
  const workspace3 = await temporaryDirectory("workspace-3-");
  await mkdir(join(workspace2, ".operator-shared"));
  await mkdir(join(workspace3, ".operator"));

  const binDirectory = await helperBin(false);
  const result = runHook(baseEvent([workspace1, workspace2, workspace3]), binDirectory);

  expect(result.status).toBe(0);
  const parsed = JSON.parse(result.stdout);
  expect(parsed.injectSteps).toHaveLength(2);
  expect(parsed.injectSteps[0]).toEqual(preambleStep(workspace2));
  expectBrainRootStep(parsed.injectSteps[1], workspace2, [workspace3]);
});

test("falls back to the first workspace when multiple workspaces contain no operator directory", async () => {
  const workspace1 = await temporaryDirectory("workspace-1-");
  const workspace2 = await temporaryDirectory("workspace-2-");

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

test("runs helper in an empty temporary directory when workspacePaths is empty", async () => {
  const binDirectory = await helperBin(false);
  const result = runHook(baseEvent([]), binDirectory);

  expect(result.status).toBe(0);
  const parsed = JSON.parse(result.stdout);
  const message = JSON.parse(parsed.injectSteps[0].systemMessage.systemMessage);
  expect(message.arguments).toEqual(["preamble"]);
  expect(dirname(message.cwd)).toBe(await realpath(tmpdir()));
  expect(basename(message.cwd)).toMatch(/^operator-no-project-/);
  expect(existsSync(message.cwd)).toBe(false);
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
