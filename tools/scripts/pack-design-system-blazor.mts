/**
 * Wraps `dotnet pack` for libs/design-system/blazor with a cache eviction
 * step first.
 *
 * NuGet treats a given PackageId+Version as immutable once it's extracted
 * into the global-packages cache (~/.nuget/packages/...) -- restoring the
 * same version again after a local repack does NOT re-copy the new content,
 * it just reuses whatever was cached from the FIRST pack. Since this
 * project's version stays fixed at 0.1.0 during local dev, every consumer
 * (design-system-demo, samamat, ...) would silently keep running stale
 * component code after any change here, no matter which path triggers the
 * pack (`nx run design-system-blazor:pack` directly, `nx run
 * design-system-demo:serve`'s dependsOn, or the .claude/launch.json dev
 * script) -- so the eviction has to live here, not in any one caller.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const cachedPackageDir = path.join(os.homedir(), ".nuget", "packages", "partobita.designsystem.blazor", "0.1.0");
if (fs.existsSync(cachedPackageDir)) {
  fs.rmSync(cachedPackageDir, { recursive: true, force: true });
}

const pack = spawnSync(
  "dotnet",
  ["pack", "Design.csproj", "--configuration", "Release", "--output", "../../../local-nuget-feed"],
  { cwd: "libs/design-system/blazor", stdio: "inherit" }
);
process.exit(pack.status ?? 1);
