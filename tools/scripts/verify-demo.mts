/**
 * Verifies the running demo in a real browser (constitution principle VI).
 *
 *   node tools/scripts/verify-demo.mts [--url http://127.0.0.1:5080] [--out .verify] [--no-shots]
 *
 * Requires the demo to be running (npx nx run blazor-design-system-docs:serve) and a Chromium: the
 * PLAYWRIGHT_CHROMIUM env var, or Playwright's cache (npx playwright-core install chromium).
 *
 * Checks, failing with a non-zero exit code:
 *   1. tokens: for each theme, every --md-sys-color-* role computed on <html> equals the value in
 *      Angular Material's prebuilt theme (libs/material-design-system/tokens/reference/angular-material)
 *   2. theme switching applies in the same frame (< 100 ms) without a reload
 *   3. every catalog page renders in all 4 themes without page errors or failed requests
 *   4. no horizontal page overflow at 360px width
 *   5. icon fonts render (a "home" ligature is ~24px wide, not the width of the word)
 * and writes a full-page screenshot of every page x theme to --out for review.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const baseUrl = arg("--url", "http://127.0.0.1:5080");
const outDir = path.resolve(repoRoot, arg("--out", ".verify"));
const shots = !process.argv.includes("--no-shots");

const THEMES = ["rose-red", "azure-blue", "magenta-violet", "cyan-orange"];

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
  return undefined; // let playwright-core use its own default lookup
}

function catalogRoutes(): string[] {
  const source = fs.readFileSync(path.join(repoRoot, "apps/blazor-design-system-docs/Navigation/ComponentCatalog.cs"), "utf8");
  return ["/", ...[...source.matchAll(/new\("[^"]+", "(\/[^"]+)"/g)].map((m) => m[1])];
}

function referenceColors(theme: string): Map<string, string> {
  const css = fs.readFileSync(path.join(repoRoot, `libs/material-design-system/tokens/reference/angular-material/${theme}.css`), "utf8");
  const colors = new Map<string, string>();
  for (const m of css.matchAll(/--mat-sys-([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)) colors.set(m[1], m[2].toLowerCase());
  return colors;
}

const failures: string[] = [];
const fail = (message: string) => {
  failures.push(message);
  console.error("  FAIL " + message);
};

const browser = await chromium.launch({ executablePath: findChromium() });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
let pageErrors: string[] = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
// Navigating away aborts Blazor's circuit-disconnect beacon; that is expected, not a failure.
page.on("requestfailed", (r) => {
  if (!r.url().includes("/_blazor/disconnect")) pageErrors.push(`request failed: ${r.url()}`);
});
page.on("response", (r) => {
  if (r.status() >= 400 && !r.url().includes("favicon")) pageErrors.push(`${r.status()} ${r.url()}`);
});

const settle = async () => {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
};

// ---------------------------------------------------------------- 1 + 2: tokens and switching
console.log("Tokens and theme switching");
await page.goto(baseUrl + "/", { waitUntil: "networkidle" });
for (const theme of THEMES) {
  const elapsed = await page.evaluate((t) => {
    const start = performance.now();
    document.documentElement.setAttribute("data-theme", t);
    getComputedStyle(document.documentElement).getPropertyValue("--md-sys-color-primary");
    return performance.now() - start;
  }, theme);
  if (elapsed > 100) fail(`switching to ${theme} took ${elapsed.toFixed(1)} ms`);

  const computed: Record<string, string> = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (let i = 0; i < style.length; i++) {
      const name = style[i];
      if (name.startsWith("--md-sys-color-")) out[name.slice("--md-sys-color-".length)] = style.getPropertyValue(name).trim().toLowerCase();
    }
    return out;
  });
  let mismatches = 0;
  for (const [role, expected] of referenceColors(theme)) {
    if (computed[role] !== expected) {
      mismatches++;
      fail(`${theme}: --md-sys-color-${role} is ${computed[role] ?? "missing"}, Angular Material has ${expected}`);
    }
  }
  console.log(`  ${theme}: ${referenceColors(theme).size - mismatches}/${referenceColors(theme).size} roles match, switch ${elapsed.toFixed(1)} ms`);
}

// ---------------------------------------------------------------- 3 + 5: every page x theme
const routes = catalogRoutes();
if (shots) fs.mkdirSync(outDir, { recursive: true });
console.log(`Pages: ${routes.length} routes x ${THEMES.length} themes`);
for (const theme of THEMES) {
  await context.addInitScript((t) => {
    try {
      localStorage.setItem("theme", t);
    } catch {
      /* ignore */
    }
  }, theme);
  for (const route of routes) {
    pageErrors = [];
    await page.goto(baseUrl + route, { waitUntil: "networkidle" });
    await settle();
    const actual = await page.evaluate(() => document.documentElement.dataset.theme);
    if (actual !== theme) fail(`${route}: expected data-theme=${theme}, got ${actual}`);
    for (const e of pageErrors) fail(`${route} [${theme}]: ${e}`);

    const brokenIcons = await page.evaluate(() =>
      [...document.querySelectorAll(".material-icons, .material-symbols-outlined")]
        .filter((el) => (el as HTMLElement).offsetParent !== null && el.textContent!.trim().length > 3)
        .filter((el) => el.getBoundingClientRect().width > parseFloat(getComputedStyle(el).fontSize) * 1.6)
        .map((el) => el.textContent!.trim())
    );
    if (brokenIcons.length) fail(`${route} [${theme}]: icon font not rendering: ${brokenIcons.slice(0, 3).join(", ")}`);

    if (shots) {
      const name = `${theme}${route === "/" ? "_home" : route.replaceAll("/", "_")}.png`;
      await page.screenshot({ path: path.join(outDir, name), fullPage: true });
    }
  }
  console.log(`  ${theme}: done`);
}

// ---------------------------------------------------------------- 4: mobile overflow
console.log("Mobile (360px) overflow");
await page.setViewportSize({ width: 360, height: 780 });
for (const route of routes) {
  await page.goto(baseUrl + route, { waitUntil: "networkidle" });
  await settle();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) fail(`${route}: horizontal overflow of ${overflow}px at 360px wide`);
  if (shots && ["/", "/button", "/select", "/table", "/stepper"].includes(route)) {
    await page.screenshot({ path: path.join(outDir, `mobile${route === "/" ? "_home" : route.replaceAll("/", "_")}.png`), fullPage: true });
  }
}

await browser.close();

if (failures.length) {
  console.error(`\nverify-demo: ${failures.length} failure(s).`);
  process.exit(1);
}
console.log(`\nverify-demo: all checks passed${shots ? `; screenshots in ${path.relative(repoRoot, outDir)}` : ""}.`);
