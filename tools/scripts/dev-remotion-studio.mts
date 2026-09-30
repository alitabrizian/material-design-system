/**
 * Dev-loop entry point for Remotion Studio (also used by .claude/launch.json).
 *
 *   1. build the design tokens package (the compositions import its dist/ CSS)
 *   2. start `remotion studio` for apps/pb-design-system-remotion-videos without opening a browser
 *
 * The preview tool assigns a free port via PORT; Remotion's default is 3000.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";

const tokens = spawnSync("node", ["libs/design-system/tokens/scripts/build-tokens.mts"], { stdio: "inherit" });
if (tokens.status !== 0) {
  process.exit(tokens.status ?? 1);
}

// Remotion resolves public/ against the nearest package.json (the workspace root), not the app,
// so point it at the app's public/ explicitly or every staticFile() -- the recordings -- 404s.
const app = path.resolve("apps/pb-design-system-remotion-videos");
const studio = spawnSync(
  process.execPath,
  [
    path.resolve("node_modules/@remotion/cli/remotion-cli.js"),
    "studio",
    "src/index.ts",
    `--public-dir=${path.join(app, "public")}`,
    `--port=${process.env.PORT ?? "3000"}`,
    "--no-open",
  ],
  { cwd: app, stdio: "inherit" }
);
process.exit(studio.status ?? 1);
