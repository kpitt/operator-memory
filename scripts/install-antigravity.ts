import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const projectDirectory = resolve(import.meta.dirname, "..");
const packageDirectory = join(projectDirectory, "packages", "antigravity");
const installation = spawnSync("agy", ["plugin", "install", packageDirectory], {
  cwd: projectDirectory,
  stdio: "inherit",
});

if (installation.error !== undefined) {
  throw installation.error;
}
process.exitCode = installation.status ?? 1;
