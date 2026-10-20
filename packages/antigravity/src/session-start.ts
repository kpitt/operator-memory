import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
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
    if (isSessionStartEvent(value)) {
      return value;
    }
  } catch {
    // Fall through to fail()
  }

  return fail();
}

function renderPreamble(cwd: string): string {
  const result = spawnSync("operator-helper", ["preamble"], {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.error !== undefined || result.status !== 0 || result.stdout.length === 0) fail();

  return result.stdout;
}

// Without a workspace there is no project, so Helper runs in a fresh empty
// directory: only the User Partition can load.
function renderWithoutProject(): string {
  const emptyDirectory = mkdtempSync(join(tmpdir(), "operator-no-project-"));
  try {
    return renderPreamble(emptyDirectory);
  } finally {
    rmSync(emptyDirectory, { recursive: true, force: true });
  }
}

function findBrainRoots(workspacePaths: string[]): string[] {
  const operatorPaths = [".operator", ".operator-shared"];

  return workspacePaths.filter(workspacePath =>
    operatorPaths.some(operatorPath => existsSync(join(workspacePath, operatorPath))),
  );
}

// The preamble refers to Brain files by relative path, which the agent resolves
// against its own working directory. With several workspaces that directory may
// not be the Brain root, so state the root explicitly. When several roots hold a
// Brain the hook cannot tell which one the user is working in, so it loads the
// lexically first and has the agent report the choice to the user.
function brainRootWarning(brainRoot: string, otherBrainRoots: string[]): string {
  const resolution = `Resolve every relative \`.operator\` and \`.operator-shared\` path in the Operator context against ${brainRoot} rather than the current working directory, including when reading, creating, or updating Brain files. Run \`operator-helper\` commands that operate on the Project Brain with that directory as the working directory. Do not create a Project Brain in any other workspace unless the user explicitly asks.`;

  if (otherBrainRoots.length === 0) {
    return `<operator-warning>
Several workspaces are mounted, and the Operator Project Brain for this session is located in ${brainRoot}. Nothing is missing; this only tells you where the Brain is. ${resolution}
</operator-warning>`;
  }

  const others = otherBrainRoots.map(root => `- ${root}`).join("\n");
  return `<operator-warning>
Several workspaces are mounted, and more than one contains an Operator Project Brain. The Operator context above was loaded from ${brainRoot}, chosen only because it sorts first; it may not be the project the user is working on. Other workspaces with a Project Brain:
${others}

In your first reply, tell the user briefly that several Project Brains were found, which one is loaded, and that they can use a different one by starting a new session with only that workspace mounted. ${resolution}
</operator-warning>`;
}

// Handles Antigravity SessionStart hook events to inject the Operator preamble.
// SessionStart fires at the start of new main sessions, subagent conversations,
// and after /clear.
function main(): void {
  const { workspacePaths } = readEvent();
  const [brainRoot, ...otherBrainRoots] = findBrainRoots(workspacePaths);

  // When no root has a Brain, the preamble is identical for every root, so
  // falling back to the first (lexically sorted, otherwise arbitrary) one is safe.
  const cwd = brainRoot ?? workspacePaths[0];
  const preamble = cwd === undefined ? renderWithoutProject() : renderPreamble(cwd);

  const steps = [systemMessage(preamble)];
  if (brainRoot !== undefined && workspacePaths.length > 1) {
    steps.push(systemMessage(brainRootWarning(brainRoot, otherBrainRoots)));
  }

  process.stdout.write(JSON.stringify(sessionStartResponse(steps)));
}

main();
