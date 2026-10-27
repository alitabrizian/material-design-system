/** Page helpers shared by the visual, token and accessibility specs. */

import type { Page } from "@playwright/test";
import { DEFAULT_THEME, targetOf, type Theme } from "./targets.mts";

/**
 * Parts of a page that change from run to run, hidden from its screenshots: route -> CSS selectors.
 * The browser clock is frozen below, but the Blazor docs compute "today" on the server, so a picker
 * that opens on today belongs here.
 */
const DATE_PICKER_MASKS = [".pb-date-edit .pb-form-field__control", ".pb-calendar", ".status"];
export const MASKS: Record<string, string[]> = {
  "/datepicker": DATE_PICKER_MASKS,
  "/shamsi-datepicker": DATE_PICKER_MASKS,
};

/** Opens a page in a theme and waits until it is fully painted: fonts, Blazor circuit, layout. */
export async function openPage(page: Page, projectName: string, route: string, theme: Theme = DEFAULT_THEME) {
  const target = targetOf(projectName);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Every site applies the saved theme before its first paint, so set it before navigation.
  await page.addInitScript(
    ([key, value]) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* storage blocked: data-theme is set after load below */
      }
    },
    [target.themeKey, theme] as const
  );
  // Freeze the browser clock so client-rendered dates (the Angular pickers) are stable.
  await page.clock.install({ time: new Date("2026-01-15T10:00:00+03:30") });
  await page.clock.resume();

  // A dev server busy with parallel first loads sometimes aborts one navigation; one retry covers it.
  await page.goto(route, { waitUntil: "networkidle" }).catch(async (error: Error) => {
    if (!error.message.includes("net::ERR_ABORTED")) throw error;
    await page.goto(route, { waitUntil: "networkidle" });
  });
  await page.evaluate((t) => {
    if (document.documentElement.dataset.theme !== t) document.documentElement.dataset.theme = t;
  }, theme);
  await page.evaluate(() => document.fonts.ready);
  // A full-page shot includes images below the fold, so load the lazy ones now and wait for all.
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((img) => {
        img.loading = "eager";
        return img.decode().catch(() => undefined);
      })
    )
  );
  // Two frames for theme and late layout (TOC, navigation rail) to settle.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return { errors };
}
