/**
 * Accessibility: axe-core (WCAG 2.2 A and AA rules) on every page of every site. Every page gets the
 * full rule set in the default theme, and color contrast is checked again in each other theme,
 * since that is what a palette change breaks.
 *
 * Issues that already exist are recorded in a11y-baseline/<site>.json (rule -> number of failing
 * elements, per page) so the suite can be adopted before they are all fixed. A test fails when a page
 * gains a rule violation or more failing elements than its baseline; fixing issues never fails it.
 * After fixing some, or to accept a new one deliberately, run `npm run test:ui:update`.
 */

import fs from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openPage } from "./fixtures.mts";
import { A11Y_BASELINE_DIR, A11Y_FINDINGS_DIR, DEFAULT_THEME, THEMES, selectedTargets, type A11yCounts, type Theme } from "./targets.mts";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

function baseline(site: string): Record<string, A11yCounts> {
  const file = path.join(A11Y_BASELINE_DIR, `${site}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}

for (const target of selectedTargets()) {
  test.describe(`a11y ${target.name}`, { tag: `@${target.name}` }, () => {
    const known = baseline(target.name);

    const check = (route: string, theme: Theme) =>
      test(`${route}${theme === DEFAULT_THEME ? "" : ` [${theme}]`}`, async ({ page }, testInfo) => {
        await openPage(page, target.name, route, theme);
        let axe = new AxeBuilder({ page }).withTags(WCAG_TAGS);
        if (theme !== DEFAULT_THEME) axe = axe.withRules(["color-contrast"]);
        const { violations } = await axe.analyze();

        const key = theme === DEFAULT_THEME ? route : `${route} [${theme}]`;
        const counts: A11yCounts = Object.fromEntries(violations.map((v) => [v.id, v.nodes.length]));
        await testInfo.attach("axe-violations.json", { body: JSON.stringify(violations, null, 2), contentType: "application/json" });

        if (process.env.A11Y_UPDATE) {
          const file = path.join(A11Y_FINDINGS_DIR, target.name, `${encodeURIComponent(key)}.json`);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, JSON.stringify({ key, counts }));
          return;
        }

        const allowed = known[key] ?? {};
        const regressions = violations
          .filter((v) => v.nodes.length > (allowed[v.id] ?? 0))
          .map((v) => ({
            rule: v.id,
            impact: v.impact,
            help: v.help,
            failing: v.nodes.length,
            baseline: allowed[v.id] ?? 0,
            elements: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
          }));
        expect(regressions, `new accessibility violations on ${key}; details in the axe-violations.json attachment`).toEqual([]);
      });

    for (const route of target.routes()) {
      for (const theme of THEMES) check(route, theme);
    }
  });
}
