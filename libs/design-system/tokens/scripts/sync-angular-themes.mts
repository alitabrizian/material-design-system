/**
 * Refreshes reference/angular-material/ -- the vendored copy of Angular Material's prebuilt M3 theme
 * CSS that build-tokens.mts generates every --md-sys-* token from.
 *
 *   node libs/design-system/tokens/scripts/sync-angular-themes.mts [version]   (default: latest)
 *
 * Only these four small CSS files are needed, so the package is fetched with `npm pack` into a temp
 * folder instead of becoming a devDependency (which would pull in @angular/core, cdk, rxjs as peers).
 * After syncing, run `npx nx run design-tokens:build` and review the token diff before committing.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const THEMES = ["rose-red", "azure-blue", "magenta-violet", "cyan-orange"];

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const referenceDir = path.join(packageRoot, "reference/angular-material");
const version = process.argv[2] ?? "latest";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ng-material-"));
try {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const tarball = execFileSync(npm, ["pack", `@angular/material@${version}`, "--silent"], {
    cwd: tmp,
    encoding: "utf8",
    shell: process.platform === "win32",
  }).trim().split(/\r?\n/).pop()!;
  execFileSync("tar", ["xzf", tarball], { cwd: tmp });

  const extracted = path.join(tmp, "package");
  const resolvedVersion = JSON.parse(fs.readFileSync(path.join(extracted, "package.json"), "utf8")).version;

  fs.mkdirSync(referenceDir, { recursive: true });
  for (const theme of THEMES) {
    fs.copyFileSync(path.join(extracted, "prebuilt-themes", `${theme}.css`), path.join(referenceDir, `${theme}.css`));
  }
  fs.copyFileSync(path.join(extracted, "LICENSE"), path.join(referenceDir, "LICENSE"));
  fs.writeFileSync(path.join(referenceDir, "VERSION"), `${resolvedVersion}\n`);
  console.log(`Synced Angular Material ${resolvedVersion} prebuilt themes into ${path.relative(process.cwd(), referenceDir)}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
