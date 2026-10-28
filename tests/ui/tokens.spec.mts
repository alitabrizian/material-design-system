/**
 * Foundation tokens against Figma: every value in figma/foundations.json (the design team's Foundation
 * pages: Color System, Numeric Tokens, Typography, Shadow, Motion, Layout, Icons) must be what the tokens
 * package gives the docs, in every theme, and what the docs' Fundamentals pages show.
 *
 * A failure names the token, the theme, the Figma variable or style and both values. When Figma
 * changes, refresh the fixture (README.md, "Figma foundations") and fix the tokens to match.
 *
 * Per-component token contracts are added when the components get their Figma specs; see README.md.
 */

import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { openPage } from "./fixtures.mts";
import { DEFAULT_THEME, repoRoot, selectedTargets, THEMES } from "./targets.mts";

interface FigmaToken {
  foundation: string;
  figma: string;
  css: string;
  kind: "color" | "px" | "percent" | "number" | "font-weight" | "font-family" | "duration" | "easing" | "shadow";
  value: string;
  alias?: string;
}
interface FigmaTextStyle {
  name: string;
  fontFamily: string;
  fontWeight: string;
  fontSize: string;
  lineHeight: string;
}

const FIGMA: { tokens: FigmaToken[]; textStyles: FigmaTextStyle[] } = JSON.parse(fs.readFileSync(path.join(repoRoot, "tests/ui/figma/foundations.json"), "utf8"));
const FOUNDATIONS = [...new Set(FIGMA.tokens.map((t) => t.foundation))];

/** Reviewed differences from Figma (figma/known-mismatches.json): css name -> why. */
const KNOWN: Map<string, string> = new Map(
  JSON.parse(fs.readFileSync(path.join(repoRoot, "tests/ui/figma/known-mismatches.json"), "utf8")).mismatches.map((m: { css: string; reason: string }) => [m.css, m.reason])
);

/**
 * One soft assertion per value, so one run lists every mismatch. A known mismatch must still differ:
 * once it matches Figma, the assertion asks for it to be removed from known-mismatches.json.
 */
function check(css: string, pass: boolean, message: string) {
  if (KNOWN.has(css)) expect.soft(pass, `${css} now matches Figma; remove it from tests/ui/figma/known-mismatches.json`).toBe(false);
  else expect.soft(pass, message).toBe(true);
}

/** The CSS property a probe uses to resolve a token of each kind. */
const PROBE_PROPERTY: Record<FigmaToken["kind"], string> = {
  color: "background-color",
  px: "width",
  percent: "opacity",
  number: "opacity",
  "font-weight": "font-weight",
  "font-family": "font-family",
  duration: "transition-duration",
  easing: "transition-timing-function",
  shadow: "box-shadow",
};

interface Compared {
  css: string;
  figma: string;
  expected: string;
  actual: string;
  pass: boolean;
}

/**
 * Runs in the page: resolves each token and its Figma value with two probes, so both go through the
 * same CSS parsing (hex and rgba, ms and s, % and fractions), then compares them with a small tolerance
 * for Figma's rounding (0.6667px against 0.67px, 0.302 alpha against 0.3).
 */
function compareInPage(items: { css: string; figma: string; value: string; prop: string }[]): Compared[] {
  const numbers = (s: string) => (s.match(/-?\d*\.?\d+(e-?\d+)?/g) ?? []).map(Number);
  const words = (s: string) => s.replace(/-?\d*\.?\d+(e-?\d+)?/g, "#").replace(/\s+/g, " ").trim();
  const same = (prop: string, a: string, b: string) => {
    if (prop === "font-family") return a.split(",")[0].replace(/["']/g, "").trim() === b.split(",")[0].replace(/["']/g, "").trim();
    if (a === b) return true;
    if (words(a) !== words(b)) return false;
    const x = numbers(a);
    const y = numbers(b);
    return x.length === y.length && x.every((n, i) => Math.abs(n - y[i]) <= Math.max(0.011, Math.abs(y[i]) * 0.004));
  };
  const resolve = (prop: string, value: string) => {
    const probe = document.createElement("div");
    probe.style.setProperty(prop, value);
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).getPropertyValue(prop).trim();
    probe.remove();
    return computed;
  };
  const root = getComputedStyle(document.documentElement);
  return items.map(({ css, figma, value, prop }) => {
    if (root.getPropertyValue(css).trim() === "") return { css, figma, expected: value, actual: "not defined", pass: false };
    const actual = resolve(prop, `var(${css})`);
    const expected = resolve(prop, value);
    return { css, figma, expected: value, actual, pass: same(prop, actual, expected) };
  });
}

async function compare(page: Page, tokens: FigmaToken[]) {
  return page.evaluate(compareInPage, tokens.map((t) => ({ css: t.css, figma: t.figma, value: t.value, prop: PROBE_PROPERTY[t.kind] })));
}

function assertAll(results: Compared[], where: string) {
  for (const r of results) check(r.css, r.pass, `${r.css} ${where} (Figma ${r.figma}): expected ${r.expected}, got ${r.actual}`);
}

const lower = (s: string) => s.trim().toLowerCase();

// Runs with the first selected site's project, so once per run.
test.describe("foundation token sources", { tag: `@${selectedTargets()[0]?.name}` }, () => {
  // Static: each Figma alias color must be a var() of the same base color in the source, not a copy of
  // its hex, so a change to the base color reaches the alias.
  test("alias colors point at their Figma base colors", () => {
    const source = fs.readFileSync(path.join(repoRoot, "libs/material-design-system/tokens/src/color-tokens.css"), "utf8");
    const declared = new Map([...source.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]));
    for (const t of FIGMA.tokens.filter((t) => t.alias)) {
      expect.soft(declared.get(t.css), `${t.css} (Figma ${t.figma}) should be var(${t.alias})`).toBe(`var(${t.alias})`);
    }
  });

  // Static: media queries can't read custom properties, so pb-layout repeats the Figma breakpoints as
  // literals; each library's layout.css must switch at exactly those widths.
  test("pb-layout media queries use the Figma breakpoints", () => {
    const breakpoints = FIGMA.tokens
      .filter((t) => t.css.startsWith("--layout-breakpoint-") && !["--layout-breakpoint-compact", "--layout-breakpoint-xlarge"].includes(t.css))
      .map((t) => t.value);
    for (const file of ["libs/material-design-system/blazor/wwwroot/styles/layout.css", "libs/material-design-system/angular/src/styles/layout.css"]) {
      const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
      const used = [...source.matchAll(/@media \(min-width: ([\d.]+px)\)/g)].map((m) => m[1]);
      expect.soft(used, `${file} media queries (Figma Layout breakpoints medium, expanded, large)`).toEqual(breakpoints);
    }
  });
});

for (const target of selectedTargets().filter((t) => t.name !== "landing")) {
  test.describe(`tokens ${target.name}`, { tag: `@${target.name}` }, () => {
    // Durations are only real with motion allowed; the tokens turn instant under reduced motion.
    test.use({ reducedMotion: "no-preference" });

    for (const theme of THEMES) {
      test(`Figma foundations [${theme}]`, async ({ page }) => {
        await openPage(page, target.name, "/fundamentals", theme);
        for (const foundation of FOUNDATIONS) {
          await test.step(foundation, async () => {
            assertAll(await compare(page, FIGMA.tokens.filter((t) => t.foundation === foundation)), `[${theme}]`);
          });
        }
      });
    }

    test("/typography shows the Figma text styles", async ({ page }) => {
      await openPage(page, target.name, "/typography", DEFAULT_THEME);
      const shown = await page.locator(".typography-frame__style").evaluateAll((styles) =>
        styles.map((s) => {
          const cs = getComputedStyle(s.querySelector(".typography-frame__sample")!);
          return {
            name: s.querySelector(".typography-frame__style-name")?.textContent?.trim() ?? "",
            fontFamily: cs.fontFamily,
            fontWeight: cs.fontWeight,
            fontSize: cs.fontSize,
            lineHeight: cs.lineHeight,
          };
        })
      );
      for (const style of FIGMA.textStyles) {
        const sample = shown.find((s) => s.name === style.name);
        expect.soft(sample, `text style ${style.name} is missing from /typography`).toBeTruthy();
        if (!sample) continue;
        expect.soft(sample.fontFamily.split(",")[0].replace(/"/g, ""), `${style.name} font-family`).toBe(style.fontFamily);
        for (const [prop, suffix] of [["fontWeight", "font-weight"], ["fontSize", "font-size"], ["lineHeight", "line-height"]] as const) {
          const css = `--typography-${style.name}-${suffix}`;
          check(css, sample[prop] === style[prop], `${style.name} sample on /typography: ${suffix} (Figma text style ${style.name}) expected ${style[prop]}, got ${sample[prop]}`);
        }
      }
    });

    test("/colors shows the Figma colors", async ({ page }) => {
      await openPage(page, target.name, "/colors", DEFAULT_THEME);
      const swatches = await page.locator(".color-swatch[title]").evaluateAll((els) =>
        els.map((el) => ({
          css: el.getAttribute("title") ?? "",
          hex: el.querySelector(".color-swatch__hex")?.textContent ?? "",
        }))
      );
      const aliases = await page.locator(".color-alias__token").evaluateAll((els) =>
        els.map((el) => ({
          css: el.querySelector(".color-alias__name")?.textContent?.trim() ?? "",
          base: el.querySelector(".color-alias__base")?.textContent?.trim() ?? "",
        }))
      );
      for (const t of FIGMA.tokens.filter((t) => t.foundation === "Color System")) {
        if (t.alias) {
          const shown = aliases.find((a) => a.css === t.css);
          expect.soft(shown, `alias ${t.css} (Figma ${t.figma}) is missing from /colors`).toBeTruthy();
          if (shown) expect.soft(shown.base, `alias ${t.css} on /colors names its base color`).toBe(`var(${t.alias})`);
        } else {
          const shown = swatches.find((s) => s.css === t.css);
          expect.soft(shown, `base color ${t.css} (Figma ${t.figma}) is missing from /colors`).toBeTruthy();
          if (shown) expect.soft(lower(shown.hex).replace(/^#/, ""), `${t.css} hex on /colors (Figma ${t.figma})`).toBe(lower(t.value).replace(/^#/, ""));
        }
      }
    });

    test("/scales shows the Figma numeric tokens", async ({ page }) => {
      await openPage(page, target.name, "/scales", DEFAULT_THEME);
      const rows = await page.locator(".scale-table tbody tr").evaluateAll((trs) =>
        trs.map((tr) => ({ css: tr.querySelector("code")?.textContent?.trim() ?? "", value: tr.querySelectorAll("td")[1]?.textContent?.trim() ?? "" }))
      );
      for (const t of FIGMA.tokens.filter((t) => t.foundation === "Numeric Tokens")) {
        const row = rows.find((r) => r.css === t.css);
        expect.soft(row, `${t.css} (Figma ${t.figma}) is missing from /scales`).toBeTruthy();
        if (row) expect.soft(parseFloat(row.value), `${t.css} value on /scales (Figma ${t.figma} = ${t.value})`).toBe(parseFloat(t.value));
      }
    });

    test("/shadow shows the Figma shadows", async ({ page }) => {
      await openPage(page, target.name, "/shadow", DEFAULT_THEME);
      const levels = await page.locator(".shadow-frame__level").evaluateAll((els) =>
        els.map((el) => ({
          css: "--" + (el.querySelector(".shadow-frame__name")?.textContent?.trim() ?? "").replace(/^--/, ""),
          shadow: getComputedStyle(el.querySelector(".shadow-frame__sample")!).boxShadow,
        }))
      );
      const resolved = await page.evaluate(
        (values) =>
          values.map((v) => {
            const probe = document.createElement("div");
            probe.style.boxShadow = v;
            document.body.appendChild(probe);
            const computed = getComputedStyle(probe).boxShadow;
            probe.remove();
            return computed;
          }),
        FIGMA.tokens.filter((t) => t.foundation === "Shadow").map((t) => t.value)
      );
      FIGMA.tokens
        .filter((t) => t.foundation === "Shadow")
        .forEach((t, i) => {
          const level = levels.find((l) => l.css === t.css);
          expect.soft(level, `${t.css} (Figma ${t.figma}) is missing from /shadow`).toBeTruthy();
          if (level) expect.soft(level.shadow, `${t.css} sample on /shadow (Figma ${t.figma})`).toBe(resolved[i]);
        });
    });
  });
}
