/**
 * Builds, packs and publishes the design system packages, each at its own version
 * (`npm run release:local`):
 *
 *   tokens    npm   @partobita/design-tokens          libs/material-design-system/tokens
 *   angular   npm   @partobita/design-system-angular  ng-packagr output in dist/libs/material-design-system/angular
 *   blazor    NuGet PartoBita.DesignSystem.Blazor     dotnet pack
 *
 * Each package is published at the version in its own package.json / .csproj, set with
 * `npm run set-version`. A version that is already in the registry is skipped (a published version
 * can never be published again), so releasing everything publishes exactly the projects whose
 * version was bumped.
 *
 * Usage:
 *   node tools/scripts/release.mts [tokens] [angular] [blazor] [--dry-run] [--skip-build]
 *
 *   (no names)     all three packages
 *   --dry-run      build and pack into dist/release, publish nothing
 *   --skip-build   reuse the current tokens/angular build output
 *
 * Environment (defaults point at tools/registry/docker-compose.yml):
 *   RELEASE_PACKAGES  package names, space separated, when none are given as arguments (CI)
 *   NPM_REGISTRY      http://localhost:4873   (auth: `npm adduser --registry <url>`, or NODE_AUTH_TOKEN in CI)
 *   NUGET_SOURCE      http://localhost:5555/v3/index.json
 *   NUGET_API_KEY     local-dev-key
 */

import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import fs from "node:fs";
import { parseArgs } from "node:util";

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
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
const packagesDir = "dist/release";

const quote = (arg: string) => (/[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg);

// npm and dotnet are .cmd shims on Windows, which Node only spawns through a shell.
const spawn = (command: string, commandArgs: string[], options: SpawnSyncOptions) =>
  process.platform === "win32"
    ? spawnSync([command, ...commandArgs].map(quote).join(" "), { shell: true, ...options })
    : spawnSync(command, commandArgs, options);

const run = (command: string, commandArgs: string[]) => {
  console.log(`\n> ${[command, ...commandArgs].join(" ")}`);
  const result = spawn(command, commandArgs, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\n${command} failed (exit ${result.status ?? result.signal}).`);
    process.exit(result.status ?? 1);
  }
};

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));

const npmPublished = (name: string, version: string) => {
  const result = spawn("npm", ["view", `${name}@${version}`, "version", "--registry", npmRegistry], { encoding: "utf8" });
  return result.status === 0 && String(result.stdout).trim() === version;
};

// npm moves the `latest` dist-tag on every publish unless told otherwise; prereleases go to `next`
// so `npm install @partobita/design-tokens` keeps resolving the last stable release.
const npmTag = (version: string) => (version.includes("-") ? "next" : "latest");

const known = ["tokens", "angular", "blazor"];
const fromEnv = (process.env.RELEASE_PACKAGES ?? "").split(/\s+/).filter(Boolean);
const selected = positionals.length ? positionals : fromEnv.length ? fromEnv : known;
const unknown = selected.filter((name) => !known.includes(name));
if (unknown.length) {
  console.error(`Unknown package(s): ${unknown.join(", ")}. Choose from: ${known.join(", ")}.`);
  process.exit(1);
}

// --- 1. build ---------------------------------------------------------------------------------
// The Blazor library builds the tokens itself (an MSBuild target), so only the npm packages need Nx.
const nxProjects = [
  ...(selected.includes("tokens") ? ["design-tokens"] : []),
  ...(selected.includes("angular") ? ["design-system-angular"] : []),
];
if (!args["skip-build"] && nxProjects.length) {
  run("node", ["node_modules/nx/bin/nx.js", "run-many", "-t", "build", "-p", nxProjects.join(",")]);
}

// --- 2. pack and publish, in dependency order (Angular depends on the tokens) -----------------
fs.rmSync(packagesDir, { recursive: true, force: true });
fs.mkdirSync(packagesDir, { recursive: true });

const summary: string[] = [];

const releaseNpm = (key: string, packageDir: string) => {
  const { name, version } = readJson(`${packageDir}/package.json`);
  if (!args["dry-run"] && npmPublished(name, version)) {
    summary.push(`${key.padEnd(8)} ${name}@${version} already published, skipped`);
    return;
  }
  run("npm", ["pack", packageDir, "--pack-destination", packagesDir]);
  if (args["dry-run"]) {
    summary.push(`${key.padEnd(8)} ${name}@${version} packed`);
    return;
  }
  const tarball = `${name.replace("@", "").replace("/", "-")}-${version}.tgz`;
  run("npm", ["publish", `${packagesDir}/${tarball}`, "--registry", npmRegistry, "--tag", npmTag(version)]);
  summary.push(`${key.padEnd(8)} ${name}@${version} published to ${npmRegistry}`);
};

if (selected.includes("tokens")) {
  releaseNpm("tokens", tokensRoot);
}
if (selected.includes("angular")) {
  releaseNpm("angular", angularDist);
}
if (selected.includes("blazor")) {
  const version = fs.readFileSync(blazorProject, "utf8").match(/<Version>([^<]*)<\/Version>/)![1];
  run("dotnet", ["pack", blazorProject, "--configuration", "Release", "--output", packagesDir]);
  if (args["dry-run"]) {
    summary.push(`blazor   PartoBita.DesignSystem.Blazor ${version} packed`);
  } else {
    // --skip-duplicate: an already-published version is reported and skipped instead of failing.
    run("dotnet", [
      "nuget", "push", `${packagesDir}/PartoBita.DesignSystem.Blazor.${version}.nupkg`,
      "--source", nugetSource, "--api-key", nugetApiKey, "--skip-duplicate",
    ]);
    summary.push(`blazor   PartoBita.DesignSystem.Blazor ${version} pushed to ${nugetSource} (skipped if it already existed)`);
  }
}

console.log(`\n${summary.join("\n")}`);
