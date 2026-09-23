/**
 * Dev-loop entry point for the design-system-demo Browser-pane preview
 * (.claude/launch.json). `dotnet watch` is started directly here rather than
 * via `nx run design-system-demo:serve`, so it never goes through Nx's
 * `dependsOn` wiring -- this script fills that gap manually:
 *   1. build the design tokens package (libs/design-system/tokens)
 *   2. pack the design-system-blazor library into local-nuget-feed, evicting
 *      any stale NuGet global-packages cache entry first (see
 *      libs/design-system/blazor/scripts/pack.mts for why that eviction is needed)
 *   3. hand off to `dotnet watch` for the demo app
 *
 * Known limitation: unlike the old ProjectReference setup, `dotnet watch`
 * here only watches the demo app's own files. Editing a component/.razor
 * file inside libs/design-system/blazor will NOT hot-reload -- re-run this
 * script (or `npx nx run design-system-blazor:pack` + restart watch) to
 * pick up library changes.
 */

import { spawnSync } from "node:child_process";

const generate = spawnSync("node", ["libs/design-system/tokens/scripts/build-tokens.mts"], {
  stdio: "inherit",
});
if (generate.status !== 0) {
  process.exit(generate.status ?? 1);
}

const pack = spawnSync("node", ["libs/design-system/blazor/scripts/pack.mts"], {
  stdio: "inherit",
});
if (pack.status !== 0) {
  process.exit(pack.status ?? 1);
}

const watch = spawnSync(
  "dotnet",
  [
    "watch",
    "--project",
    "apps/design-system-demo/Design.Demo.csproj",
    "run",
    "--launch-profile",
    "design-system-demo",
  ],
  { stdio: "inherit" }
);
process.exit(watch.status ?? 0);
