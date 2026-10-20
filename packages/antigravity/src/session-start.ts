import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HookError,
  isSessionStartEvent,
  sessionStartResponse,
  systemMessage,
  type SessionStartEvent,
} from "./types";

const FAILURE_MESSAGE = "Operator could not load memory because operator-helper preamble failed.";

function fail(): never {
  console.error(FAILURE_MESSAGE);
  process.stdout.write(JSON.stringify({}));
  throw new HookError(FAILURE_MESSAGE);
}

function readEvent(): SessionStartEvent {
  try {
    const value: unknown = JSON.parse(readFileSync(0, "utf8"));
    if (isSessionStartEvent(value) && value.workspacePaths.length > 0) {
      return value;
    }
  } catch {
    // Fall through to fail()
  }

  return fail();
}

function main(): void {
  const event = readEvent();

  const operatorPaths = [".operator", ".operator-shared"];

  const cwd =
    event.workspacePaths.length === 1
      ? event.workspacePaths[0]
      : event.workspacePaths.find(workspacePath =>
          operatorPaths.some(operatorPath => existsSync(join(workspacePath, operatorPath))),
        );

  if (cwd === undefined) fail();

  const result = spawnSync("operator-helper", ["preamble"], {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.error !== undefined || result.status !== 0 || result.stdout.length === 0) fail();

  const response = sessionStartResponse([systemMessage(result.stdout)]);
  process.stdout.write(JSON.stringify(response));
}

main();
