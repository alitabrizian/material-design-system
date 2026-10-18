/**
 * Sets one version on the whole design system (`npm run set-version -- <version>`):
 *
 *   package.json                                             workspace
 *   libs/material-design-system/tokens/package.json          @partobita/design-tokens
 *   libs/material-design-system/angular/package.json         @partobita/design-system-angular (+ its tokens dependency)
 *   libs/material-design-system/blazor/*.csproj <Version>    PartoBita.DesignSystem.Blazor
 *   apps/blazor-design-system-docs/*.csproj                  the docs app's PackageReference to the Blazor package
 *   package-lock.json                                        workspace and tokens entries
 *
 * The packages are released together and Angular/Blazor are built on the tokens, so they share one
 * version: "0.3.0" means the same thing in every project.
 *
 * Usage:
 *   npm run set-version -- 0.2.0            explicit version
 *   npm run set-version -- patch            0.1.0 -> 0.1.1   (bug fixes)
 *   npm run set-version -- minor            0.1.0 -> 0.2.0   (new components, new tokens)
 *   npm run set-version -- major            0.1.0 -> 1.0.0   (breaking changes)
 *   npm run set-version -- minor --commit   also commit the changed files and tag v<version>, in each
 *                                           submodule first, then the workspace (nothing is pushed)
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: { commit: { type: "boolean", default: false } },
});

const libs = "libs/material-design-system";
const docsApp = "apps/blazor-design-system-docs";
const files = {
  workspace: "package.json",
  lock: "package-lock.json",
  tokens: `${libs}/tokens/package.json`,
  angular: `${libs}/angular/package.json`,
  blazor: `${libs}/blazor/PartoBita.DesignSystem.Blazor.csproj`,
  docs: `${docsApp}/PartoBita.DesignSystem.Docs.csproj`,
};

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
// Keeps the file's line endings: Windows checkouts have CRLF, and rewriting them as LF would show
// every line as changed.
const writeJson = (file: string, value: unknown) => {
  const eol = fs.readFileSync(file, "utf8").includes("\r\n") ? "\r\n" : "\n";
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`.replace(/\n/g, eol));
};

// Replaces exactly one match, so a csproj that no longer has the expected shape fails loudly
// instead of silently keeping the old version.
const replaceOnce = (file: string, pattern: RegExp, replacement: string) => {
  const text = fs.readFileSync(file, "utf8");
  const matches = text.match(new RegExp(pattern, "g")) ?? [];
  if (matches.length !== 1) {
    console.error(`${file}: expected one match for ${pattern}, found ${matches.length}.`);
    process.exit(1);
  }
  fs.writeFileSync(file, text.replace(pattern, replacement));
};

const current: string = readJson(files.workspace).version;
const request = positionals[0];
if (!request) {
  console.error(`Current version: ${current}\nUsage: npm run set-version -- <version | patch | minor | major> [--commit]`);
  process.exit(1);
}

const bump = (kind: string) => {
  const [major, minor, patch] = current.split(/[.-]/).map(Number);
  if (kind === "major") return `${major + 1}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  // 0.3.0-beta.1 -> 0.3.0: the patch release of a prerelease is the release it was leading up to.
  return current.includes("-") ? `${major}.${minor}.${patch}` : `${major}.${minor}.${patch + 1}`;
};
const version = ["major", "minor", "patch"].includes(request) ? bump(request) : request;
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`"${version}" is not a valid version (e.g. 0.2.0 or 0.2.0-beta.1).`);
  process.exit(1);
}

// --- write the version everywhere -------------------------------------------------------------
const workspace = readJson(files.workspace);
workspace.version = version;
writeJson(files.workspace, workspace);

const tokens = readJson(files.tokens);
tokens.version = version;
writeJson(files.tokens, tokens);

const angular = readJson(files.angular);
angular.version = version;
angular.dependencies["@partobita/design-tokens"] = `^${version}`;
writeJson(files.angular, angular);

replaceOnce(files.blazor, /<Version>[^<]*<\/Version>/, `<Version>${version}</Version>`);
replaceOnce(
  files.docs,
  /(<PackageReference Include="PartoBita\.DesignSystem\.Blazor" Version=")[^"]*(")/,
  `$1${version}$2`,
);

// The lock file records the workspace's and the tokens workspace package's versions; npm ci fails
// when they disagree with the package.json files.
const lock = readJson(files.lock);
lock.version = version;
lock.packages[""].version = version;
if (lock.packages[`${libs}/tokens`]) {
  lock.packages[`${libs}/tokens`].version = version;
}
writeJson(files.lock, lock);

console.log(`Version ${current} -> ${version}`);
for (const file of Object.values(files)) {
  console.log(`  ${file}`);
}

if (!args.commit) {
  console.log(`\nNext: review the changes, then commit and tag (or run again with --commit).`);
  process.exit(0);
}

// --- commit and tag ---------------------------------------------------------------------------
const git = (cwd: string, gitArgs: string[]) => {
  console.log(`\n[${cwd}] git ${gitArgs.join(" ")}`);
  const result = spawnSync("git", gitArgs, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const tag = `v${version}`;
const message = `chore: release ${tag}`;
// Submodules first: the workspace commit records their new commits. Only the files this script
// changed are committed, so unrelated work in progress stays uncommitted.
const repos: Array<[string, string[]]> = [
  [libs, [files.tokens, files.angular, files.blazor].map((f) => path.relative(libs, f))],
  [docsApp, [path.relative(docsApp, files.docs)]],
];
for (const [repo, changed] of repos) {
  git(repo, ["commit", "-m", message, "--", ...changed]);
  git(repo, ["tag", "-a", tag, "-m", message]);
}
git(".", ["commit", "-m", message, "--", files.workspace, files.lock, libs, docsApp]);
git(".", ["tag", "-a", tag, "-m", message]);

console.log(`\nCommitted and tagged ${tag}. Push each repository with its tag when ready:
  git -C ${libs} push --follow-tags
  git -C ${docsApp} push --follow-tags
  git push --follow-tags`);
