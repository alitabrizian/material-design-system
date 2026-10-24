/**
 * The sites the UI tests run against and the pages of each. Pages come from each docs app's own
 * catalog (the same source as its navigation), so a new component page is tested without editing
 * this file.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Accepted axe findings per site (a11y.spec.ts), and where an update run collects new ones. */
export const A11Y_BASELINE_DIR = path.join(repoRoot, "tests/ui/a11y-baseline");
export const A11Y_FINDINGS_DIR = path.join(repoRoot, "dist/ui-tests/a11y-findings");
/** axe rule id -> number of failing elements on one page. */
export type A11yCounts = Record<string, number>;

export const THEMES = ["rose-red", "azure-blue", "magenta-violet", "cyan-orange"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "rose-red";

export interface Target {
  /** Playwright project name, also the folder of its screenshots. */
  name: "blazor-docs" | "angular-docs" | "landing";
  /** URL override (skips starting the dev server) and the default local address. */
  urlEnv: string;
  defaultUrl: string;
  /**
   * Command that serves the site when it is not already running. It expects the tokens (and the
   * Angular docs' generated sources) to be built already: tools/scripts/test-ui.mts does that once,
   * since servers building the tokens side by side wipe each other's dist (see serve-all.mts).
   */
  serve: string;
  /** localStorage key the site reads its theme from before the first paint. */
  themeKey: string;
  routes: () => string[];
}

function read(relative: string): string {
  return fs.readFileSync(path.join(repoRoot, relative), "utf8");
}

// A Set: the catalogs also list section landing routes (/fundamentals) next to the pages.
const unique = (routes: string[]) => [...new Set(routes)];

const blazorRoutes = () =>
  unique(["/", "/fundamentals", ...[...read("apps/blazor-design-system-docs/Navigation/ComponentCatalog.cs").matchAll(/new\("[^"]+", "(\/[^"]+)"/g)].map((m) => m[1])]);

const angularRoutes = () =>
  unique(["/", "/fundamentals", ...[...read("apps/angular-design-system-docs/src/app/component-catalog.ts").matchAll(/\bpath: '([^']+)'/g)].map((m) => "/" + m[1])]);

export const TARGETS: Target[] = [
  {
    name: "blazor-docs",
    urlEnv: "BLAZOR_DOCS_URL",
    defaultUrl: "http://127.0.0.1:5080",
    serve: "node tools/scripts/dev-blazor-design-system-docs.mts",
    themeKey: "theme",
    routes: blazorRoutes,
  },
  {
    name: "angular-docs",
    urlEnv: "ANGULAR_DOCS_URL",
    defaultUrl: "http://127.0.0.1:4200",
    serve: "node node_modules/nx/bin/nx.js run angular-design-system-docs:serve --exclude-task-dependencies",
    themeKey: "theme",
    routes: angularRoutes,
  },
  {
    name: "landing",
    urlEnv: "LANDING_URL",
    defaultUrl: "http://127.0.0.1:4300",
    serve: "node tools/scripts/dev-design-system-landing.mts",
    themeKey: "pb-landing-theme",
    routes: () => ["/"],
  },
];

/** UI_TARGETS=blazor-docs,landing limits a run (and the servers it starts) to those sites. */
export function selectedTargets(): Target[] {
  const wanted = process.env.UI_TARGETS?.split(",").map((s) => s.trim()).filter(Boolean);
  return wanted?.length ? TARGETS.filter((t) => wanted.includes(t.name)) : TARGETS;
}

export function targetOf(projectName: string): Target {
  const target = TARGETS.find((t) => t.name === projectName);
  if (!target) throw new Error(`Unknown UI test project ${projectName}`);
  return target;
}

/** "/" -> "home", "/button-toggle" -> "button-toggle": a file-name-safe page id. */
export const pageId = (route: string) => (route === "/" ? "home" : route.replace(/^\//, "").replaceAll("/", "_"));
