/**
 * Starts every project that has a `serve` target at once (`npm start`):
 *
 *   1. build the design tokens package once, and run every `prepare` target (generated sources)
 *   2. `nx run-many -t serve --exclude-task-dependencies`, with DESIGN_TOKENS_PREBUILT=1
 *
 * The token build starts by deleting tokens/dist, and each server would otherwise trigger its own:
 * the serve scripts build the tokens, the Blazor library's MSBuild target rebuilds them when its inputs
 * look newer, and the `design-tokens:build` dependency restores them from the Nx cache. Run side by side,
 * one of those wipes dist while another server is compiling against it. So the tokens are built here,
 * fresh (newer than their inputs, which keeps the MSBuild target up to date), the dev scripts skip their
 * own build when DESIGN_TOKENS_PREBUILT is set, and run-many leaves out the dependencies done in step 1.
 */

import { spawnSync } from "node:child_process";

const nx = (args: string[], env: NodeJS.ProcessEnv = process.env) => {
  const result = spawnSync("node", ["node_modules/nx/bin/nx.js", ...args], { stdio: "inherit", env });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

nx(["run", "design-tokens:build", "--skip-nx-cache"]);
nx(["run-many", "-t", "prepare"]);

// Each serve task holds a slot until it is stopped, so allow more slots than there are servers.
nx(["run-many", "-t", "serve", "--parallel=10", "--exclude-task-dependencies", ...process.argv.slice(2)], {
  ...process.env,
  DESIGN_TOKENS_PREBUILT: "1",
});
