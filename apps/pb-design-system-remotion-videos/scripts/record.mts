/**
 * Records one video per scene in src/scenes.json by driving the real
 * pb-design-system-docs app in Edge, so videos always show the actual Blazor
 * components rather than a re-drawn imitation.
 *
 * For each scene: opens the page, isolates the chosen example card in the
 * middle of the frame, draws a visible cursor (headless browsers render
 * none), plays the steps at human speed, and writes
 * public/recordings/<id>.webm plus <id>.json with the caption timings that
 * the Remotion composition reads.
 *
 * Requires the demo app to be running:  npx nx run pb-design-system-docs:serve
 * Usage:  node scripts/record.mts [scene-id ...]   (no ids = all scenes)
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseMedia } from "@remotion/media-parser";
import { nodeReader } from "@remotion/media-parser/node";
import { chromium, type Browser, type BrowserContext, type Locator, type Page, type Video } from "playwright-core";
import type { Caption, RecordingMeta, Scene, Step } from "../src/scenes";

type Point = { x: number; y: number };

const VIEWPORT = { width: 1280, height: 720 };
const CARD_WIDTH = 760;
const MAX_ZOOM = 1.5;
const FRAME_MARGIN = 80;

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest: { theme: string; baseUrl: string; scenes: Scene[] } = JSON.parse(
  fs.readFileSync(path.join(appRoot, "src/scenes.json"), "utf8")
);
const outDir = path.join(appRoot, "public/recordings");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-recordings-"));

async function main() {
  const requested = process.argv.slice(2);
  const unknown = requested.filter((id) => !manifest.scenes.some((s) => s.id === id));
  if (unknown.length) {
    console.error(`Unknown scene id(s): ${unknown.join(", ")}`);
    process.exit(1);
  }
  const scenes = requested.length ? manifest.scenes.filter((s) => requested.includes(s.id)) : manifest.scenes;

  try {
    await fetch(manifest.baseUrl);
  } catch {
    console.error(`The demo app is not reachable at ${manifest.baseUrl}.\nStart it first: npx nx run pb-design-system-docs:serve`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge" });
  const failed: string[] = [];

  for (const scene of scenes) {
    try {
      await record(browser, scene);
      console.log(`recorded  ${scene.id}`);
    } catch (error) {
      failed.push(scene.id);
      console.error(`FAILED    ${scene.id}: ${(error as Error).message.split("\n")[0]}`);
    }
  }

  await browser.close();
  fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  if (failed.length) {
    console.error(`\n${failed.length} scene(s) failed: ${failed.join(", ")}`);
    process.exit(1);
  }
}

async function record(browser: Browser, scene: Scene) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    locale: "en-US",
    recordVideo: { dir: tmpDir, size: VIEWPORT },
  });
  let result: { video: Video; meta: RecordingMeta; t0: number };
  let closedAtMs: number;
  try {
    result = await recordInContext(context, scene);
  } finally {
    closedAtMs = Date.now();
    // Closing the context is what finalizes the video file -- and releases it on failure.
    await context.close();
  }
  const videoFile = path.join(outDir, `${scene.id}.webm`);
  fs.copyFileSync(await result.video.path(), videoFile);

  // Playwright starts the video a few hundred ms after newPage() (our t0) and stops it at
  // close, so the real start is: close time minus video length. Shift every timestamp onto
  // the video's own timeline, otherwise captions drift out of sync with the footage.
  const { durationInSeconds } = await parseMedia({ src: videoFile, reader: nodeReader, fields: { durationInSeconds: true } });
  const offset = Math.max(0, closedAtMs - result.t0 - durationInSeconds! * 1000);
  const shift = (ms: number) => Math.round(ms - offset);
  const meta: RecordingMeta = {
    startMs: shift(result.meta.startMs),
    endMs: shift(result.meta.endMs),
    captions: result.meta.captions.map((c) => ({ ...c, fromMs: shift(c.fromMs), toMs: shift(c.toMs) })),
  };
  fs.writeFileSync(path.join(outDir, `${scene.id}.json`), JSON.stringify(meta, null, 2) + "\n");
}

async function recordInContext(context: BrowserContext, scene: Scene) {
  await context.addInitScript(installCursor, manifest.theme);
  const page = await context.newPage();
  const t0 = Date.now();

  // TopAppBar imports /js/theme.js from OnAfterRenderAsync, which only runs once the
  // Blazor Server circuit is live -- before that, clicks hit inert prerendered HTML.
  const interactive = page.waitForResponse((r) => r.url().endsWith("/js/theme.js"));
  await page.goto(manifest.baseUrl + scene.route);
  await interactive;

  const card = page
    .locator(".example-card")
    .filter({ has: page.locator(".example-card-title", { hasText: exactly(scene.example) }) });
  await card.waitFor();
  await isolate(page, card, scene.zoom);

  const cursor = new Cursor(page, { x: VIEWPORT.width * 0.78, y: VIEWPORT.height * 0.82 });
  await cursor.place();
  await page.waitForTimeout(700);

  const startMs = Date.now() - t0;
  const captions: Caption[] = [];
  for (const step of scene.steps) {
    if (step.caption) {
      const now = Date.now() - t0;
      if (captions.length) captions[captions.length - 1].toMs = now;
      captions.push({ text: step.caption, fromMs: now, toMs: -1 });
    }
    await runStep(page, card, cursor, step);
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(1200);
  const endMs = Date.now() - t0;
  if (captions.length) captions[captions.length - 1].toMs = endMs;

  const meta: RecordingMeta = { startMs, endMs, captions };
  return { video: page.video()!, meta, t0 };
}

async function runStep(page: Page, card: Locator, cursor: Cursor, step: Step) {
  if (step.action === "wait") {
    await page.waitForTimeout(step.ms ?? 1000);
    return;
  }

  const target = card.locator(step.target!).first();
  await target.waitFor({ state: "visible", timeout: 5000 });

  switch (step.action) {
    case "hover":
      await cursor.moveTo(step.position ?? (await pointIn(target, step.offset)));
      await page.waitForTimeout(550);
      return;
    case "click":
      await cursor.moveTo(step.position ?? (await pointIn(target, step.offset)));
      await cursor.click();
      await page.waitForTimeout(450);
      return;
    case "type":
      await cursor.moveTo(await pointIn(target, step.offset));
      await cursor.click();
      await page.keyboard.type(step.text!, { delay: 110 });
      return;
    case "select":
      await cursor.moveTo(await pointIn(target, step.offset));
      await target.selectOption({ label: step.label! });
      await page.waitForTimeout(400);
      return;
    case "drag": {
      const box = (await target.boundingBox())!;
      const y = box.y + box.height / 2;
      await cursor.moveTo({ x: box.x + box.width * step.from!, y });
      await page.mouse.down();
      await cursor.moveTo({ x: box.x + box.width * step.to!, y }, 900);
      await page.mouse.up();
      return;
    }
  }
}

async function pointIn(target: Locator, offset = { x: 0.5, y: 0.5 }): Promise<Point> {
  const box = (await target.boundingBox())!;
  return { x: box.x + box.width * offset.x, y: box.y + box.height * offset.y };
}

/** Moves the real mouse along an eased path so the injected cursor visibly travels. */
class Cursor {
  private page: Page;
  private at: Point;

  constructor(page: Page, at: Point) {
    this.page = page;
    this.at = at;
  }

  place() {
    return this.page.mouse.move(this.at.x, this.at.y);
  }

  async moveTo(to: Point, durationMs = 450) {
    const from = this.at;
    const steps = Math.max(8, Math.round(durationMs / 18));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      await this.page.mouse.move(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
      await this.page.waitForTimeout(12);
    }
    this.at = to;
  }

  async click() {
    await this.page.waitForTimeout(120);
    await this.page.mouse.down();
    await this.page.waitForTimeout(90);
    await this.page.mouse.up();
  }
}

/**
 * Hides everything except the scene's card, centers it, and enlarges it with CSS zoom
 * (the browser re-renders at the larger size, so it stays sharp, unlike scaling the video).
 * Zoom defaults to the largest factor that still fits the frame.
 */
async function isolate(page: Page, card: Locator, zoomOverride?: number) {
  await card.evaluate((el) => el.setAttribute("data-record-card", ""));
  await page.addStyleTag({
    content: `
      html { background: var(--md-sys-color-background) !important; overflow: hidden !important; }
      body { visibility: hidden !important; }
      /* Centered with inset+margin rather than a transform: a transform would become the
         containing block for the card's own position:fixed overlays (bottom sheet, drawer). */
      [data-record-card] {
        visibility: visible !important;
        position: fixed !important;
        inset: 0 !important;
        margin: auto !important;
        width: ${CARD_WIDTH}px !important;
        height: fit-content !important;
        z-index: 1;
      }
    `,
  });

  const height = (await card.boundingBox())!.height;
  const fit = Math.min((VIEWPORT.width - FRAME_MARGIN) / CARD_WIDTH, (VIEWPORT.height - FRAME_MARGIN) / height);
  const zoom = zoomOverride ?? Math.min(MAX_ZOOM, fit);
  await card.evaluate((el, z) => ((el as HTMLElement).style.zoom = String(z)), zoom);
}

function exactly(text: string) {
  return new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
}

/** Runs in the page before any app script: pins the theme and draws a cursor that follows the mouse. */
function installCursor(theme: string) {
  localStorage.setItem("theme", theme);

  const mount = () => {
    const cursor = document.createElement("div");
    cursor.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l14 11.5-6.2.6 3.6 7.6-2.8 1.3-3.6-7.7L4 20z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    Object.assign(cursor.style, {
      position: "fixed", left: "0", top: "0", zIndex: "2147483647", pointerEvents: "none",
      visibility: "visible", transform: "translate(-100px, -100px)",
    });
    document.documentElement.appendChild(cursor);

    window.addEventListener("mousemove", (e) => {
      cursor.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 2}px)`;
    }, true);

    window.addEventListener("mousedown", (e) => {
      const ring = document.createElement("div");
      Object.assign(ring.style, {
        position: "fixed", left: `${e.clientX - 18}px`, top: `${e.clientY - 18}px`, width: "36px", height: "36px",
        borderRadius: "50%", background: "color-mix(in srgb, var(--md-sys-color-primary) 35%, transparent)",
        pointerEvents: "none", zIndex: "2147483646", visibility: "visible",
      });
      document.documentElement.appendChild(ring);
      ring.animate([{ transform: "scale(0.2)", opacity: 1 }, { transform: "scale(1)", opacity: 0 }], {
        duration: 450, easing: "ease-out",
      }).onfinish = () => ring.remove();
    }, true);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
}

await main();
