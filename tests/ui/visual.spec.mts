/**
 * Visual regression per component example: every example card of every docs page, the preview area
 * only (no code panel, no page chrome), compared with the committed screenshots under __screenshots__/.
 * A failure names the page and the example, with a diff image in the HTML report. Each page's first
 * example is also shot in every other theme, and three pages are shot whole at phone width for the
 * responsive layout. After an intended change, refresh the baselines with `npm run test:ui:update`.
 *
 * These guard the components until their Figma specs exist; then per-component token contracts take
 * over the colors and sizes (see README.md).
 */

import { expect, test, type Page } from "@playwright/test";
import { MASKS, openPage } from "./fixtures.mts";
import { DEFAULT_THEME, THEMES, pageId, selectedTargets, type Theme } from "./targets.mts";

/** Pages shot whole at phone width, for the responsive layout. */
const MOBILE_ROUTES = ["/", "/button", "/data-grid"];

async function shootExamples(page: Page, route: string, ids: string[], theme: Theme) {
  for (const id of ids) {
    const preview = page.locator(`[id="${id}"] > .example-live`);
    await expect.soft(preview, `example ${id} on ${route}`).toHaveCount(1);
    if ((await preview.count()) !== 1) continue;
    const name = theme === DEFAULT_THEME ? `${pageId(route)}--${id}.png` : `${pageId(route)}--${id}--${theme}.png`;
    await expect.soft(preview, `${route} example ${id}${theme === DEFAULT_THEME ? "" : ` [${theme}]`}`).toHaveScreenshot(name, {
      mask: (MASKS[route] ?? []).map((s) => preview.locator(s)),
    });
  }
}

for (const target of selectedTargets()) {
  test.describe(`visual ${target.name}`, { tag: `@${target.name}` }, () => {
    const routes = target.routes();
    const examples = target.examples();

    for (const [route, ids] of Object.entries(examples).filter(([r]) => routes.includes(r))) {
      test(`${route} examples`, async ({ page }) => {
        const { errors } = await openPage(page, target.name, route);
        expect(errors, "page errors").toEqual([]);
        await shootExamples(page, route, ids, DEFAULT_THEME);
      });

      for (const theme of THEMES.filter((t) => t !== DEFAULT_THEME)) {
        test(`${route} [${theme}]`, async ({ page }) => {
          await openPage(page, target.name, route, theme);
          await shootExamples(page, route, ids.slice(0, 1), theme);
        });
      }
    }

    for (const route of MOBILE_ROUTES.filter((r) => routes.includes(r))) {
      test(`${route} [360px]`, async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 780 });
        await openPage(page, target.name, route);
        await expect(page).toHaveScreenshot(`${pageId(route)}--mobile.png`, {
          fullPage: true,
          // On these 12000px-tall pages Chrome sometimes rasterizes the text below the fold with a
          // different anti-aliasing (the Angular home page: 0.28% of the pixels, text only, in 2 runs
          // out of 30). A token or layout change moves far more than this.
          maxDiffPixelRatio: 0.004,
          mask: (MASKS[route] ?? []).map((s) => page.locator(s)),
        });
      });
    }
  });
}
