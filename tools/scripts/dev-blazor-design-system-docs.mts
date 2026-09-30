/**
 * Dev-loop entry point for the design-system demo (also used by .claude/launch.json and
 * `npx nx run blazor-design-system-docs:serve`).
 *
 *   1. build the design tokens package (libs/material-design-system/tokens -> dist/)
 *   2. `dotnet watch` the demo app
 *
 * The demo references the library by ProjectReference (see PartoBita.DesignSystem.Docs.csproj), so:
 *   - CSS/JS edits under libs/material-design-system/blazor/wwwroot are served from source on the next
 *     browser refresh (Development static web assets + Cache-Control: no-cache in Program.cs);
 *   - .razor/.cs edits in the library are picked up by `dotnet watch` (hot reload, or an automatic
 *     rebuild + restart for rude edits).
 * No pack step and no NuGet cache are involved. To verify the packed library the way external
 * consumers get it, run `npx nx run blazor-design-system-docs:serve-package` instead.
 */

import { spawnSync } from "node:child_process";

const tokens = spawnSync("node", ["libs/material-design-system/tokens/scripts/build-tokens.mts"], { stdio: "inherit" });
if (tokens.status !== 0) {
  process.exit(tokens.status ?? 1);
}

// The preview tool assigns a free port via PORT (other worktrees' demo servers may hold 5080).
// A --urls app argument overrides the launch profile's fixed applicationUrl.
const urlArgs = process.env.PORT ? ["--", "--urls", `http://127.0.0.1:${process.env.PORT}`] : [];

const watch = spawnSync(
  "dotnet",
  ["watch", "--project", "apps/blazor-design-system-docs/PartoBita.DesignSystem.Docs.csproj", "run", "--launch-profile", "blazor-design-system-docs", ...urlArgs],
  { stdio: "inherit", env: { ...process.env, DOTNET_WATCH_RESTART_ON_RUDE_EDIT: "true" } }
);
process.exit(watch.status ?? 0);
