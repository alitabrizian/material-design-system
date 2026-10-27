/**
 * Visual regression: every page of every site, compared with the committed screenshots under
 * __screenshots__/. A token or component change that moves pixels fails here, with a diff image in
 * the HTML report. After an intended change, refresh the baselines with `npm run test:ui:update`.
 */

import { expect, test } from "@playwright/test";
import { MASKS, openPage } from "./fixtures.mts";
import { DEFAULT_THEME, THEMES, pageId, selectedTargets } from "./targets.mts";

/** Pages shot in every theme: the color roles are what changes between themes. */
const THEMED_ROUTES = ["/", "/button", "/chips", "/form-field", "/colors"];
/** Pages shot at phone width, for the responsive layout. */
const MOBILE_ROUTES = ["/", "/button", "/data-grid"];

for (const target of selectedTargets()) {
  test.describe(`visual ${target.name}`, { tag: `@${target.name}` }, () => {
    const routes = target.routes();

    for (const route of routes) {
      test(`${route}`, async ({ page }) => {
        const { errors } = await openPage(page, target.name, route);
        expect(errors, "page errors").toEqual([]);
        await expect(page).toHaveScreenshot(`${pageId(route)}.png`, {
          fullPage: true,
          mask: (MASKS[route] ?? []).map((s) => page.locator(s)),
        });
      });
    }

    for (const theme of THEMES.filter((t) => t !== DEFAULT_THEME)) {
      for (const route of THEMED_ROUTES.filter((r) => routes.includes(r))) {
        test(`${route} [${theme}]`, async ({ page }) => {
          await openPage(page, target.name, route, theme);
          await expect(page).toHaveScreenshot(`${pageId(route)}--${theme}.png`, {
            fullPage: true,
            mask: (MASKS[route] ?? []).map((s) => page.locator(s)),
          });
        });
      }
    }

    for (const route of MOBILE_ROUTES.filter((r) => routes.includes(r))) {
      test(`${route} [360px]`, async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 780 });
        await openPage(page, target.name, route);
        await expect(page).toHaveScreenshot(`${pageId(route)}--mobile.png`, {
          fullPage: true,
          mask: (MASKS[route] ?? []).map((s) => page.locator(s)),
        });
      });
    }
  });
}
