/**
 * Builds, packs and publishes the design system packages (`npm run release:local`):
 *
 *   npm  @partobita/design-tokens            (libs/material-design-system/tokens)
 *   npm  @partobita/design-system-angular    (ng-packagr output in dist/libs/material-design-system/angular)
 *   NuGet PartoBita.DesignSystem.Blazor      (dotnet pack, with -p:Version)
 *
 * Publishes the version in the workspace package.json, which `npm run set-version` writes into every
 * project. A published version can never be published again, so set a new one before each release.
 *
 * Usage:
 *   node tools/scripts/release.mts [--version 0.2.0-test.1] [--dry-run] [--skip-build]
 *
 *   --version      publish this version instead (written to the packed copies only, not the sources)
 *   --dry-run      build and pack into dist/release/packages, publish nothing
 *   --skip-build   reuse the current tokens/angular build output
 *
 * Environment (defaults point at tools/registry/docker-compose.yml):
 *   RELEASE_VERSION   same as --version
 *   NPM_REGISTRY      http://localhost:4873   (auth: `npm adduser --registry <url>`, or NODE_AUTH_TOKEN in CI)
 *   NUGET_SOURCE      http://localhost:5555/v3/index.json
 *   NUGET_API_KEY     local-dev-key
 */

import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    version: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    "skip-build": { type: "boolean", default: false },
  },
});

const npmRegistry = process.env.NPM_REGISTRY ?? "http://localhost:4873";
const nugetSource = process.env.NUGET_SOURCE ?? "http://localhost:5555/v3/index.json";
const nugetApiKey = process.env.NUGET_API_KEY ?? "local-dev-key";

// Paths stay relative to the workspace root (the cwd of every command): the Windows checkout lives
// under "C:\Parto bita\...", and relative paths keep spaces out of the shell command lines.
const tokensRoot = "libs/material-design-system/tokens";
const angularDist = "dist/libs/material-design-system/angular";
const blazorProject = "libs/material-design-system/blazor/PartoBita.DesignSystem.Blazor.csproj";
const releaseRoot = "dist/release";
const stagingRoot = `${releaseRoot}/npm`;
const packagesDir = `${releaseRoot}/packages`;

const quote = (arg: string) => (/[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg);

// npm and dotnet are .cmd shims on Windows, which Node only spawns through a shell.
const run = (command: string, commandArgs: string[], options: SpawnSyncOptions = {}) => {
  console.log(`\n> ${[command, ...commandArgs].join(" ")}`);
  const windows = process.platform === "win32";
  const result = windows
    ? spawnSync([command, ...commandArgs].map(quote).join(" "), { stdio: "inherit", shell: true, ...options })
    : spawnSync(command, commandArgs, { stdio: "inherit", ...options });
  if (result.status !== 0) {
    console.error(`\n${command} failed (exit ${result.status ?? result.signal}).`);
    process.exit(result.status ?? 1);
  }
};

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file: string, value: unknown) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

// --- 1. version -------------------------------------------------------------------------------
// The version set by `npm run set-version` (tools/scripts/set-version.mts). --version overrides it
// for one run, e.g. a throwaway 0.2.0-test.1 while rehearsing.
const version = args.version ?? process.env.RELEASE_VERSION ?? readJson("package.json").version;
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`"${version}" is not a valid semantic version (e.g. 0.2.0 or 0.2.0-beta.1).`);
  process.exit(1);
}
// npm moves the `latest` dist-tag on every publish unless told otherwise; prereleases go to `next`
// so `npm install @partobita/design-tokens` keeps resolving the last stable release.
const npmTag = version.includes("-") ? "next" : "latest";
console.log(`Releasing ${version} (npm tag: ${npmTag})${args["dry-run"] ? " -- dry run" : ""}`);

// --- 2. build ---------------------------------------------------------------------------------
if (!args["skip-build"]) {
  run("node", ["node_modules/nx/bin/nx.js", "run-many", "-t", "build", "-p", "design-tokens,design-system-angular"]);
}

// --- 3. stage and pack ------------------------------------------------------------------------
fs.rmSync(releaseRoot, { recursive: true, force: true });
fs.mkdirSync(packagesDir, { recursive: true });

const stage = (name: string, sourceDir: string, files: string[]) => {
  const target = `${stagingRoot}/${name}`;
  for (const file of files) {
    fs.cpSync(path.join(sourceDir, file), path.join(target, file), { recursive: true });
  }
  const manifest = readJson(`${target}/package.json`);
  manifest.version = version;
  // The Angular library must depend on the tokens released alongside it, not on the base version.
  if (manifest.dependencies?.["@partobita/design-tokens"]) {
    manifest.dependencies["@partobita/design-tokens"] = version;
  }
  writeJson(`${target}/package.json`, manifest);
  return target;
};

const tokensStage = stage("design-tokens", tokensRoot, ["package.json", "README.md", "dist"]);
const angularStage = stage("design-system-angular", angularDist, fs.readdirSync(angularDist));

for (const staged of [tokensStage, angularStage]) {
  run("npm", ["pack", staged, "--pack-destination", packagesDir]);
}
run("dotnet", ["pack", blazorProject, "--configuration", "Release", "--output", packagesDir, `-p:Version=${version}`]);

const packages = fs.readdirSync(packagesDir);
console.log(`\nPacked into ${packagesDir}:\n${packages.map((p) => `  ${p}`).join("\n")}`);

if (args["dry-run"]) {
  process.exit(0);
}

// --- 4. publish -------------------------------------------------------------------------------
// Tokens first: the Angular package depends on that exact version.
for (const tarball of ["partobita-design-tokens", "partobita-design-system-angular"]) {
  const file = packages.find((p) => p.startsWith(`${tarball}-`) && p.endsWith(".tgz"))!;
  run("npm", ["publish", `${packagesDir}/${file}`, "--registry", npmRegistry, "--tag", npmTag]);
}
for (const nupkg of packages.filter((p) => p.endsWith(".nupkg"))) {
  run("dotnet", ["nuget", "push", `${packagesDir}/${nupkg}`, "--source", nugetSource, "--api-key", nugetApiKey]);
}

console.log(`\nPublished ${version}: npm -> ${npmRegistry}, NuGet -> ${nugetSource}`);
