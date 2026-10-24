/**
 * Visual regression and accessibility tests (tests/ui) for the docs sites and the landing page.
 *
 *   node tools/scripts/test-ui.mts [--update] [playwright test args...]
 *
 *   npm run test:ui                                   # all sites
 *   npm run test:ui -- --grep "/button"               # one page
 *   UI_TARGETS=blazor-docs npm run test:ui            # one site (blazor-docs, angular-docs, landing)
 *   npm run test:ui:update                            # accept the current look and a11y findings
 *
 * Sites that are already running (for example from `npm start`) are reused. For the others this
 * builds the design tokens once, runs the Angular docs' prepare step, and lets Playwright start the
 * dev servers with DESIGN_TOKENS_PREBUILT set, so they do not rebuild the tokens over each other.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { A11Y_FINDINGS_DIR, selectedTargets } = await import("../../tests/ui/targets.mts");

const run = (command: string, args: string[], env: NodeJS.ProcessEnv = process.env) => {
  const result = spawnSync(command, args, { cwd: repoRoot, stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

async function isUp(url: string): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
}

const args = process.argv.slice(2);
const update = args.includes("--update");
const playwrightArgs = args.filter((a) => a !== "--update");

const toStart = [];
for (const target of selectedTargets()) {
  if (!process.env[target.urlEnv] && !(await isUp(target.defaultUrl))) toStart.push(target);
}
if (toStart.length) {
  run("node", ["libs/material-design-system/tokens/scripts/build-tokens.mts"]);
  if (toStart.some((t) => t.name === "angular-docs")) {
    run("node", ["node_modules/nx/bin/nx.js", "run", "angular-design-system-docs:prepare"]);
  }
}

if (update) fs.rmSync(A11Y_FINDINGS_DIR, { recursive: true, force: true });

run("node", ["node_modules/@playwright/test/cli.js", "test", "-c", "tests/ui/playwright.config.mts", ...(update ? ["--update-snapshots"] : []), ...playwrightArgs], {
  ...process.env,
  DESIGN_TOKENS_PREBUILT: "1",
  ...(update ? { A11Y_UPDATE: "1" } : {}),
});
