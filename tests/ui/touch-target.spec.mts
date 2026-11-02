/**
 * Touch targets (design team decision 2026-10-31, docs Fundamentals > Accessibility): every control in
 * every docs example has a hit area of at least 48 x 48px. The hit area is the control's own box, grown
 * by what also activates it: its touch-target child (pb-touch-target, or Angular Material's
 * mat-mdc-*-touch-target), the label of a checkbox, radio or switch, and the form field around a text
 * input. A failure lists each control that is too small, with its size.
 */

import { expect, test } from "@playwright/test";
import { openPage } from "./fixtures.mts";
import { selectedTargets } from "./targets.mts";

/** The design team's minimum, --touch-target-min in tokens/src/touch-target-tokens.css. */
const MIN = 48;

interface Small {
  example: string;
  control: string;
  width: number;
  height: number;
}

/** Runs in the page: measures the hit area of every visible control in the examples' previews. */
function measure(min: number): Small[] {
  const CONTROLS = [
    "button", "a[href]", "input:not([type=hidden])", "select", "textarea", "summary",
    "[role=button]", "[role=tab]", "[role=option]", "[role=menuitem]", "[role=menuitemradio]",
    "[role=menuitemcheckbox]", "[role=switch]", "[role=checkbox]", "[role=radio]", "[role=slider]", "[role=treeitem]",
  ].join(",");
  const TOUCH_TARGET = ".pb-touch-target, [class*='-touch-target']";

  // Controls that can't reach 48px without growing the visual: the calendar's day, month and year cells
  // sit on a 40px grid (the M3 date picker), so a 48px target would overlap its neighbours. Left as they
  // are until the design team decides between a larger calendar and overlapping targets.
  const EXEMPT = ".pb-calendar__cell-button, .mat-calendar-body-cell";

  // A touch target only counts where an overflow-clipping ancestor still shows it. With toScroller, the
  // walk stops at the first scroll container: what it hides is a matter of scroll position (a column half
  // scrolled out of a grid), not a cut target.
  const clipped = (box: DOMRect, from: Element, self = false, toScroller = false) => {
    let { left, top, right, bottom } = box;
    for (let a = self ? from : from.parentElement; a && a !== document.body; a = a.parentElement) {
      const style = getComputedStyle(a);
      if (style.overflowX === "visible" && style.overflowY === "visible") continue;
      if (toScroller && /auto|scroll/.test(style.overflowX + style.overflowY)) break;
      let r = a.getBoundingClientRect();
      // overflow: clip on both axes paints (and hit-tests) up to overflow-clip-margin past the box.
      const margin = style.overflowX === "clip" && style.overflowY === "clip" ? parseFloat(style.overflowClipMargin.split(" ").pop() ?? "") || 0 : 0;
      if (margin) r = new DOMRect(r.left - margin, r.top - margin, r.width + 2 * margin, r.height + 2 * margin);
      if (style.overflowX !== "visible") [left, right] = [Math.max(left, r.left), Math.min(right, r.right)];
      if (style.overflowY !== "visible") [top, bottom] = [Math.max(top, r.top), Math.min(bottom, r.bottom)];
    }
    return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
  };

  const visible = (el: Element) => {
    if (el.closest("[aria-hidden=true], [inert], .pb-visually-hidden, .cdk-visually-hidden")) return false;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const small: Small[] = [];
  for (const preview of document.querySelectorAll(".example-live")) {
    const example = preview.parentElement?.id ?? "?";
    for (const el of preview.querySelectorAll<HTMLElement>(CONTROLS)) {
      // A native input styled invisible (checkbox, radio, switch, range) is measured through its label.
      const input = el instanceof HTMLInputElement ? el : null;
      if (el.matches(EXEMPT) || el.closest(EXEMPT)) continue;
      // A disabled control can't be activated, so it needs no target (Material drops pointer events on it).
      if (el.matches(":disabled, [aria-disabled=true]")) continue;
      if (!visible(el) && !(input && input.labels?.length)) continue;

      // Skip controls a scroll container or a collapsed panel hides, wholly or in part (rows scrolled out
      // of a grid's viewport): their touch targets are clipped with them.
      const own = el.getBoundingClientRect();
      const shown = clipped(own, el);
      if (shown.width < own.width - 0.5 || shown.height < own.height - 0.5) continue;

      const boxes: DOMRect[] = [own];
      const add = (t: Element) => boxes.push(clipped(t.getBoundingClientRect(), t, false, true));
      el.querySelectorAll(TOUCH_TARGET).forEach(add);
      // Material controls without a touch-target element get an ::after centered on its containing block
      // (material-touch-target.css); only that block and its ancestors clip it.
      for (const host of [el, ...el.querySelectorAll(".mdc-evolution-chip__action--primary, .mat-sort-header-container")]) {
        const after = getComputedStyle(host, "::after");
        if (after.content === "none" || after.position !== "absolute" || after.pointerEvents === "none") continue;
        let block: Element = host;
        while (block.parentElement && getComputedStyle(block).position === "static") block = block.parentElement;
        const r = block.getBoundingClientRect();
        const [w, h] = [parseFloat(after.width), parseFloat(after.height)];
        if (w && h) boxes.push(clipped(new DOMRect(r.left + (r.width - w) / 2, r.top + (r.height - h) / 2, w, h), block, true, true));
      }
      if (input || el.matches("textarea, select")) {
        el.parentElement?.querySelectorAll(`:scope > :is(${TOUCH_TARGET})`).forEach(add);
        for (const label of (el as HTMLInputElement).labels ?? []) {
          add(label);
          label.querySelectorAll(TOUCH_TARGET).forEach(add);
        }
        const field = el.closest(".pb-form-field, .mat-mdc-form-field");
        if (field) add(field);
      }
      const live = boxes.filter((b) => b.width > 0 && b.height > 0);
      if (!live.length) continue;
      const width = Math.max(...live.map((b) => b.right)) - Math.min(...live.map((b) => b.left));
      const height = Math.max(...live.map((b) => b.bottom)) - Math.min(...live.map((b) => b.top));
      if (width + 0.5 >= min && height + 0.5 >= min) continue;

      const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 30);
      const classes = [...el.classList].filter((c) => !c.startsWith("ng-")).slice(0, 3).join(".");
      small.push({ example, control: `${el.tagName.toLowerCase()}${classes ? "." + classes : ""}${name ? ` "${name}"` : ""}`, width: Math.round(width), height: Math.round(height) });
    }
  }
  return small;
}

for (const target of selectedTargets().filter((t) => t.name !== "landing")) {
  test.describe(`touch targets ${target.name}`, { tag: `@${target.name}` }, () => {
    const routes = target.routes();
    for (const route of Object.keys(target.examples()).filter((r) => routes.includes(r))) {
      test(`${route} touch targets`, async ({ page }) => {
        await openPage(page, target.name, route);
        const small = await page.evaluate(measure, MIN);
        const list = small.map((s) => `  ${s.example}: ${s.control} ${s.width}x${s.height}px`).join("\n");
        expect(small, `controls on ${route} with a hit area under ${MIN}x${MIN}px:\n${list}`).toEqual([]);
      });
    }
  });
}
