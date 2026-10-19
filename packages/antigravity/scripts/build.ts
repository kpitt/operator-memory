import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";

const packageDirectory = resolve(import.meta.dir, "..");
const outputDirectory = join(packageDirectory, "hooks");

await rm(outputDirectory, { recursive: true, force: true });
const build = await Bun.build({
  entrypoints: [join(packageDirectory, "src", "session-start.ts")],
  outdir: outputDirectory,
  target: "node",
  format: "esm",
  minify: true,
});

if (!build.success) {
  for (const log of build.logs) console.error(log);
  process.exit(1);
}
