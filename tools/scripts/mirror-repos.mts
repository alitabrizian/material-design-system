/**
 * Publishes read-only mirror repos from this monorepo (tools/mirror-repos.json).
 *
 * The monorepo stays the source of truth: every change lands here, in one commit even when it spans
 * the tokens, a library and an app. Each mirror gets one folder of it (git subtree split, history
 * included) on its own branch, so a project can also be cloned or browsed on its own. Splits are
 * deterministic, so re-running only fast-forwards the mirrors. Never commit to a mirror directly; the
 * next push would reject or overwrite it.
 *
 *   node tools/scripts/mirror-repos.mts                  # every mirror that has a url
 *   node tools/scripts/mirror-repos.mts pb-design-system # just these
 *   node tools/scripts/mirror-repos.mts --dry-run        # split, but don't push
 *
 * Mirrors from the current HEAD, so run it on master after merging.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Mirror = { name: string; prefix: string; url: string };
type Config = { branch: string; mirrors: Mirror[] };

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const config: Config = JSON.parse(fs.readFileSync(path.join(repoRoot, "tools/mirror-repos.json"), "utf8"));

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const names = args.filter((a) => !a.startsWith("--"));
const unknown = names.filter((n) => !config.mirrors.some((m) => m.name === n));
if (unknown.length) {
  console.error(`mirror-repos: unknown mirror(s): ${unknown.join(", ")}`);
  process.exit(1);
}

const git = (...gitArgs: string[]) =>
  execFileSync("git", gitArgs, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();

let failed = false;
for (const mirror of config.mirrors) {
  if (names.length && !names.includes(mirror.name)) continue;
  if (!mirror.url) {
    console.log(`- ${mirror.name}: no url in tools/mirror-repos.json, skipped`);
    continue;
  }
  const splitBranch = `mirror/${mirror.name}`;
  console.log(`- ${mirror.name}: splitting ${mirror.prefix} ...`);
  const commit = git("subtree", "split", `--prefix=${mirror.prefix}`, "-b", splitBranch);
  if (dryRun) {
    console.log(`  ${commit} (dry run, not pushed)`);
    continue;
  }
  try {
    git("push", mirror.url, `${splitBranch}:refs/heads/${config.branch}`);
    console.log(`  pushed ${commit.slice(0, 10)} to ${mirror.url} (${config.branch})`);
  } catch {
    console.error(`  push to ${mirror.url} failed`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
