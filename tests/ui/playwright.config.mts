/**
 * Visual regression and accessibility tests for the docs sites and the landing page.
 * See tests/ui/README.md.
 */

import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { repoRoot, selectedTargets } from "./targets.mts";

/** Same lookup as tools/scripts/verify-demo.mts: an explicit Chromium, else Playwright's own. */
function findChromium(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers"].filter(Boolean) as string[];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const dir of fs.readdirSync(root).filter((d) => d.startsWith("chromium-")).sort().reverse()) {
      for (const exe of ["chrome-linux/chrome", "chrome-win/chrome.exe", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"]) {
        const candidate = path.join(root, dir, exe);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }
  return undefined;
}

const targets = selectedTargets();

export default defineConfig({
  testDir: ".",
  outputDir: path.join(repoRoot, "dist/ui-tests/results"),
  // Baselines are committed next to the specs, one folder per site, named per OS: fonts render
  // differently on Windows and Linux, so each platform keeps its own set.
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}-{platform}{ext}",
  globalTeardown: "./global-teardown.mts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  reporter: [["list"], ["html", { outputFolder: path.join(repoRoot, "dist/ui-tests/report"), open: "never" }]],
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      // Anti-aliasing differs slightly between runs; a real token change moves far more pixels.
      maxDiffPixelRatio: 0.002,
      threshold: 0.2,
    },
  },
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce",
    locale: "en-US",
    timezoneId: "Asia/Tehran",
    launchOptions: { executablePath: findChromium() },
    trace: "retain-on-failure",
  },
  // Each spec declares its tests per site with a @<site> tag; a project runs only its own site's.
  projects: targets.map((t) => ({ name: t.name, grep: new RegExp(`@${t.name}\\b`), use: { baseURL: process.env[t.urlEnv] ?? t.defaultUrl } })),
  // A site given by URL is used as is; otherwise its dev server is started, or reused if already up
  // (for example from `npm start`).
  webServer: targets
    .filter((t) => !process.env[t.urlEnv])
    .map((t) => ({
      command: t.serve,
      cwd: repoRoot,
      url: t.defaultUrl,
      reuseExistingServer: true,
      timeout: 5 * 60_000,
      stdout: "ignore" as const,
      stderr: "pipe" as const,
    })),
});
