/**
 * Sets the version of one project (`npm run set-version -- <project> <version>`). Each project has
 * its own version and moves only when it changes:
 *
 *   tokens      @partobita/design-tokens          libs/material-design-system/tokens/package.json
 *   angular     @partobita/design-system-angular  libs/material-design-system/angular/package.json
 *   blazor      PartoBita.DesignSystem.Blazor     libs/material-design-system/blazor/*.csproj <Version>
 *   workspace   the monorepo as a whole           package.json
 *
 * Side effects that keep the projects consistent:
 *   tokens   -> Angular's dependency range on the tokens follows (^<version>), so the next Angular
 *               release accepts the new tokens; package-lock.json's tokens entry is updated too
 *   blazor   -> the docs app's PackageReference to the Blazor package follows
 *   workspace-> package-lock.json's root entry follows
 *
 * Usage:
 *   npm run set-version                            show every project's current version
 *   npm run set-version -- tokens minor            0.1.0 -> 0.2.0   (new tokens or components)
 *   npm run set-version -- blazor patch            0.1.0 -> 0.1.1   (bug fixes)
 *   npm run set-version -- angular major           0.1.0 -> 1.0.0   (breaking changes)
 *   npm run set-version -- angular 0.3.0-beta.1    explicit version
 *   npm run set-version -- tokens minor --commit   also commit the changed files and tag
 *                                                  <project>-v<version> (nothing is pushed)
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
const lockFile = "package-lock.json";
const tokensFile = `${libs}/tokens/package.json`;
const angularFile = `${libs}/angular/package.json`;
const blazorFile = `${libs}/blazor/PartoBita.DesignSystem.Blazor.csproj`;
const docsFile = `${docsApp}/PartoBita.DesignSystem.Docs.csproj`;

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

const csprojVersion = /<Version>([^<]*)<\/Version>/;
const docsPackageReference = /(<PackageReference Include="PartoBita\.DesignSystem\.Blazor" Version=")[^"]*(")/;

const updateLock = (entry: string, version: string) => {
  const lock = readJson(lockFile);
  if (entry === "") {
    lock.version = version;
  }
  if (lock.packages[entry]) {
    lock.packages[entry].version = version;
  }
  writeJson(lockFile, lock);
};

type Project = {
  repo: string; // the git repository the project's files live in (a submodule, or the workspace)
  read: () => string;
  // Writes the version and returns every file it changed, by repository.
  write: (version: string) => Record<string, string[]>;
};

const projects: Record<string, Project> = {
  tokens: {
    repo: libs,
    read: () => readJson(tokensFile).version,
    write: (version) => {
      const tokens = readJson(tokensFile);
      tokens.version = version;
      writeJson(tokensFile, tokens);
      const angular = readJson(angularFile);
      angular.dependencies["@partobita/design-tokens"] = `^${version}`;
      writeJson(angularFile, angular);
      updateLock(`${libs}/tokens`, version);
      return { [libs]: [tokensFile, angularFile], ".": [lockFile] };
    },
  },
  angular: {
    repo: libs,
    read: () => readJson(angularFile).version,
    write: (version) => {
      const angular = readJson(angularFile);
      angular.version = version;
      writeJson(angularFile, angular);
      return { [libs]: [angularFile] };
    },
  },
  blazor: {
    repo: libs,
    read: () => fs.readFileSync(blazorFile, "utf8").match(csprojVersion)![1],
    write: (version) => {
      replaceOnce(blazorFile, csprojVersion, `<Version>${version}</Version>`);
      replaceOnce(docsFile, docsPackageReference, `$1${version}$2`);
      return { [libs]: [blazorFile], [docsApp]: [docsFile] };
    },
  },
  workspace: {
    repo: ".",
    read: () => readJson("package.json").version,
    write: (version) => {
      const workspace = readJson("package.json");
      workspace.version = version;
      writeJson("package.json", workspace);
      updateLock("", version);
      return { ".": ["package.json", lockFile] };
    },
  },
};

const [name, request] = positionals;
if (!name) {
  for (const [key, project] of Object.entries(projects)) {
    console.log(`${key.padEnd(10)} ${project.read()}`);
  }
  console.log(`\nUsage: npm run set-version -- <${Object.keys(projects).join(" | ")}> <version | patch | minor | major> [--commit]`);
  process.exit(0);
}
const project = projects[name];
if (!project || !request) {
  console.error(`Usage: npm run set-version -- <${Object.keys(projects).join(" | ")}> <version | patch | minor | major> [--commit]`);
  process.exit(1);
}

const current = project.read();
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

const changed = project.write(version);
console.log(`${name}: ${current} -> ${version}`);
for (const file of Object.values(changed).flat()) {
  console.log(`  ${file}`);
}
if (name === "tokens") {
  console.log(`\nAngular now depends on tokens ^${version}: release a new Angular version for its users to get it.`);
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

// The tag names the project: tokens, Angular and Blazor share one repository, so a bare v0.2.0
// would not say which of them it is.
const tag = `${name}-v${version}`;
const message = `chore(${name}): release ${version}`;
// Submodules first, so the workspace commit records their new commits. Only the files this script
// changed are committed: unrelated work in progress stays uncommitted.
const workspaceFiles = changed["."] ?? [];
for (const [repo, files] of Object.entries(changed)) {
  if (repo === ".") continue;
  git(repo, ["commit", "-m", message, "--", ...files.map((f) => path.relative(repo, f))]);
  if (repo === project.repo) {
    git(repo, ["tag", "-a", tag, "-m", message]);
  }
  workspaceFiles.push(repo);
}
git(".", ["commit", "-m", message, "--", ...workspaceFiles]);
if (project.repo === ".") {
  git(".", ["tag", "-a", tag, "-m", message]);
}

const pushes = [...Object.keys(changed).filter((r) => r !== "."), "."];
console.log(`\nCommitted and tagged ${tag}. Push when ready:\n${pushes
  .map((r) => (r === "." ? "  git push --follow-tags" : `  git -C ${r} push --follow-tags`))
  .join("\n")}`);
