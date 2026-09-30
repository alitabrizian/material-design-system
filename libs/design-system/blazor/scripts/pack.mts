/**
 * Wraps `dotnet pack` for libs/design-system/blazor with a cache eviction
 * step first.
 *
 * NuGet treats a given PackageId+Version as immutable once it's extracted
 * into the global-packages cache (per checkout, see NuGet.config) -- restoring the
 * same version again after a local repack does NOT re-copy the new content,
 * it just reuses whatever was cached from the FIRST pack. Since this
 * project's version stays fixed at 0.1.0 during local dev, every local
 * consumer (pb-design-system, ...) would silently keep running stale
 * component code after any change here, no matter which path triggers the
 * pack (`nx run design-system-blazor:pack` directly, `nx run
 * pb-design-system:serve`'s dependsOn, or the .claude/launch.json dev
 * script) -- so the eviction has to live here, not in any one caller.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const libraryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localFeed = path.resolve(libraryRoot, "../../../local-nuget-feed");

// Ask NuGet which packages folder is in effect rather than assuming ~/.nuget/packages:
// NuGet.config points it at a per-checkout folder so evicting here can't break other worktrees.
const locals = spawnSync("dotnet", ["nuget", "locals", "global-packages", "--list"], { cwd: libraryRoot, encoding: "utf8" });
const packagesFolder = locals.stdout.match(/global-packages:\s*(.+)/)?.[1].trim();
if (locals.status !== 0 || !packagesFolder) {
  console.error(`Could not determine the NuGet global-packages folder:\n${locals.stdout}${locals.stderr}`);
  process.exit(1);
}
const cachedPackageDir = path.join(packagesFolder, "partobita.designsystem.blazor", "0.1.0");
if (fs.existsSync(cachedPackageDir)) {
  fs.rmSync(cachedPackageDir, { recursive: true, force: true });
}

const pack = spawnSync(
  "dotnet",
  ["pack", "Design.csproj", "--configuration", "Release", "--output", localFeed],
  { cwd: libraryRoot, stdio: "inherit" }
);
process.exit(pack.status ?? 1);
