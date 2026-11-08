/**
 * Builds the PartoBita Icons font (called by build-icons.mts) from the icon set's SVGs, so an app draws its icons
 * as text from one cached file instead of loading or inlining one SVG per icon.
 *
 * Fonts hold filled outlines only, so each icon's 2px round-capped strokes are first expanded into outlines and
 * merged (Skia's stroker and path ops, through canvaskit-wasm). The outlines are exact: no tracing.
 *
 * Every icon has:
 *   - a ligature, its name: <span class="pb-icons">home-line</span>
 *   - a Private Use Area codepoint, from icons/codepoints.json (committed, so a codepoint never changes; new icons
 *     get the next free one and the file is rewritten), used by the per-icon classes: <span class="pb-icons
 *     pb-icons--home-line"></span>
 *
 * Output (dist/):
 *   - fonts/partobita-icons.{woff2,woff,ttf,eot}  the same font in the four web font formats
 *   - css/partobita-icons.css                     @font-face + the .pb-icons class (also in icons.css and fonts.css)
 *   - css/partobita-icon-classes.css              one .pb-icons--<name>::before rule per icon (opt-in: ~70 KB)
 *   - data/icon-codepoints.json                   { "<name>": "e001", ... }
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const ICON_FONT_FAMILY = "PartoBita Icons";
export const ICON_FONT_FILE = "partobita-icons";

/** Font units per 24px icon: 40 units per CSS pixel. */
const UNITS_PER_EM = 960;
const SCALE = UNITS_PER_EM / 24;
/** First Private Use Area codepoint handed out. */
const FIRST_CODEPOINT = 0xe001;

export interface FontIcon {
  name: string;
  /** The <path> elements' attributes, as in icons/svg/<name>.svg. */
  paths: { d: string; strokeWidth: number }[];
}

export async function buildIconFont(
  packageRoot: string,
  distRoot: string,
  icons: FontIcon[],
  fail: (message: string) => never,
): Promise<Map<string, string>> {
  const codepoints = assignCodepoints(packageRoot, icons.map((icon) => icon.name), fail);

  const CanvasKitInit = require("canvaskit-wasm");
  const ck = await CanvasKitInit();

  const unsimplified: string[] = [];
  const glyphs = icons.map((icon) => {
    // canvaskit-wasm is pinned to 0.40: later releases dropped the path ops (op, simplify) from the npm build.
    const check = (ok: unknown, step: string) => {
      if (!ok) fail(`icons/svg/${icon.name}.svg: Skia could not ${step} it`);
    };
    // Each path stroked into its outline, all of them in one path. Stroke outlines are meant to be filled with the
    // nonzero rule, as fonts are, so this is already a correct (if overlapping) glyph.
    const outline = new ck.Path();
    for (const { d, strokeWidth } of icon.paths) {
      const path = ck.Path.MakeFromSVGString(d);
      check(path, "read");
      // precision > 1 draws the round caps and joins with finer curves, for large font sizes.
      check(path.stroke({ width: strokeWidth, cap: ck.StrokeCap.Round, join: ck.StrokeJoin.Round, precision: 4 }), "outline");
      outline.addPath(path);
      path.delete();
    }
    // Merged into one non-overlapping shape where Skia's path ops manage it: smaller, and no seams where the
    // contours overlap. simplify() may give an even-odd path, which makeAsWinding() turns back into nonzero, but
    // that conversion sometimes fills a hole (shield-01's inside, for one). So the merged shape is only kept when it
    // covers the same points as the stroke outline; otherwise the overlapping outline is.
    let glyph = outline.copy();
    let merged = glyph.simplify();
    if (merged && glyph.getFillType() !== ck.FillType.Winding) {
      const winding = glyph.makeAsWinding();
      glyph.delete();
      glyph = winding;
      merged = !!winding;
    }
    if (merged && !sameCoverage(outline, glyph)) merged = false;
    if (merged) {
      outline.delete();
    } else {
      glyph?.delete();
      glyph = outline;
      unsimplified.push(icon.name);
    }
    // Flipped into font space: y up, the baseline on the icon's bottom edge.
    glyph.transform([SCALE, 0, 0, 0, -SCALE, UNITS_PER_EM, 0, 0, 1]);
    const d = glyph.toSVGString();
    glyph.delete();
    if (!d) fail(`icons/svg/${icon.name}.svg outlines to an empty shape`);
    return { name: icon.name, d, code: codepoints.get(icon.name)! };
  });
  if (unsimplified.length) console.log(`build-icon-font: kept the overlapping outline of ${unsimplified.length} icons (Skia could not merge them)`);

  const escape = (text: string) => text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  const svgFont = [
    '<?xml version="1.0" standalone="no"?>',
    '<svg xmlns="http://www.w3.org/2000/svg"><defs>',
    `<font id="${ICON_FONT_FILE}" horiz-adv-x="${UNITS_PER_EM}">`,
    `<font-face font-family="${ICON_FONT_FAMILY}" font-weight="400" font-style="normal" units-per-em="${UNITS_PER_EM}" ascent="${UNITS_PER_EM}" descent="0"/>`,
    '<missing-glyph horiz-adv-x="0"/>',
    // The codepoint glyph and the ligature glyph share one outline (svg2ttf merges identical glyphs).
    ...glyphs.flatMap((glyph) => [
      `<glyph glyph-name="${glyph.name}" unicode="&#x${glyph.code};" d="${glyph.d}"/>`,
      `<glyph glyph-name="${glyph.name}.liga" unicode="${escape(glyph.name)}" d="${glyph.d}"/>`,
    ]),
    "</font></defs></svg>",
  ].join("\n");

  const svg2ttf = require("svg2ttf");
  const ttf2woff = require("ttf2woff");
  const ttf2eot = require("ttf2eot");
  const wawoff2 = require("wawoff2");

  // A fixed timestamp keeps the font files byte-identical between builds of the same icons.
  const ttf = Buffer.from(
    svg2ttf(svgFont, {
      copyright: "Untitled UI icons (MIT); PartoBita icons",
      description: "PartoBita icon set as a font, generated by libs/material-design-system/tokens/scripts/build-icon-font.mts",
      url: "",
      version: "1.0",
      ts: 0,
    }).buffer,
  );
  const fontsDir = path.join(distRoot, "fonts");
  fs.mkdirSync(fontsDir, { recursive: true });
  fs.writeFileSync(path.join(fontsDir, `${ICON_FONT_FILE}.ttf`), ttf);
  fs.writeFileSync(path.join(fontsDir, `${ICON_FONT_FILE}.woff`), Buffer.from(ttf2woff(ttf)));
  fs.writeFileSync(path.join(fontsDir, `${ICON_FONT_FILE}.eot`), Buffer.from(ttf2eot(ttf)));
  fs.writeFileSync(path.join(fontsDir, `${ICON_FONT_FILE}.woff2`), Buffer.from(await wawoff2.compress(ttf)));

  fs.mkdirSync(path.join(distRoot, "css"), { recursive: true });
  fs.writeFileSync(path.join(distRoot, "css/partobita-icons.css"), iconFontCss() + "\n", "utf8");
  fs.writeFileSync(
    path.join(distRoot, "css/partobita-icon-classes.css"),
    [
      "/* GENERATED by libs/material-design-system/tokens/scripts/build-icon-font.mts -- do not edit.",
      " * One class per PartoBita icon, for markup that can't hold the ligature name:",
      ' *   <span class="pb-icons pb-icons--home-line" aria-hidden="true"></span>',
      " * Needs partobita-icons.css (or icons.css / fonts.css) for the font itself. */",
      "",
      ...glyphs.map((glyph) => `.pb-icons--${glyph.name}::before { content: "\\${glyph.code}"; }`),
    ].join("\n") + "\n",
    "utf8",
  );
  fs.mkdirSync(path.join(distRoot, "data"), { recursive: true });
  fs.writeFileSync(
    path.join(distRoot, "data/icon-codepoints.json"),
    JSON.stringify(Object.fromEntries(glyphs.map((glyph) => [glyph.name, glyph.code])), null, 2) + "\n",
    "utf8",
  );
  return codepoints;
}

/** The @font-face rule and the .pb-icons class, with URLs relative to dist/css/. */
export function iconFontCss(): string {
  const url = (ext: string) => `url(../fonts/${ICON_FONT_FILE}.${ext})`;
  return [
    "/* PartoBita Icons: the PartoBita icon set as a font (scripts/build-icon-font.mts).",
    ' *   <span class="pb-icons" aria-hidden="true">home-line</span>    the icon\'s name is a ligature',
    " * Size it with font-size (24px by default); it takes the text color. */",
    "@font-face {",
    `  font-family: '${ICON_FONT_FAMILY}';`,
    "  font-style: normal;",
    "  font-weight: 400;",
    "  font-display: block;",
    `  src: ${url("eot")};`,
    `  src: url(../fonts/${ICON_FONT_FILE}.eot?#iefix) format('embedded-opentype'),`,
    `    ${url("woff2")} format('woff2'),`,
    `    ${url("woff")} format('woff'),`,
    `    ${url("ttf")} format('truetype');`,
    "}",
    "",
    ".pb-icons {",
    `  font-family: '${ICON_FONT_FAMILY}';`,
    "  font-weight: normal;",
    "  font-style: normal;",
    "  font-size: 24px;",
    "  line-height: 1;",
    "  letter-spacing: normal;",
    "  text-transform: none;",
    "  display: inline-block;",
    "  white-space: nowrap;",
    "  word-wrap: normal;",
    "  direction: ltr;",
    "  font-feature-settings: 'liga';",
    "  font-variant-ligatures: common-ligatures;",
    "  -webkit-font-smoothing: antialiased;",
    "  -moz-osx-font-smoothing: grayscale;",
    "  text-rendering: optimizeLegibility;",
    "}",
  ].join("\n");
}

/** Reads icons/codepoints.json, gives every new icon the next free codepoint, and rewrites the file if that changed it. */
function assignCodepoints(packageRoot: string, names: string[], fail: (message: string) => never): Map<string, string> {
  const file = path.join(packageRoot, "icons/codepoints.json");
  const stored: Record<string, string> = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const used = new Set<string>();
  for (const [name, code] of Object.entries(stored)) {
    if (!/^e[0-9a-f]{3}$|^f[0-8][0-9a-f]{2}$/.test(code)) fail(`icons/codepoints.json: ${name} has ${code}, not a Private Use Area codepoint`);
    if (used.has(code)) fail(`icons/codepoints.json: ${code} is given to more than one icon`);
    used.add(code);
  }
  let next = Math.max(FIRST_CODEPOINT - 1, ...Object.values(stored).map((code) => parseInt(code, 16))) + 1;
  const result = new Map<string, string>();
  let added = 0;
  for (const name of names) {
    let code = stored[name];
    if (!code) {
      code = (next++).toString(16);
      stored[name] = code;
      added++;
    }
    result.set(name, code);
  }
  if (added) {
    fs.writeFileSync(file, JSON.stringify(stored, null, 2) + "\n", "utf8");
    console.log(`build-icon-font: gave ${added} new icons a codepoint in icons/codepoints.json (commit it)`);
  }
  return result;
}

/**
 * Whether two 24x24 outlines cover the same points, sampled on a 1/2px grid (off the pixel lines, where edges
 * usually sit). A few samples may differ where the merge moved an edge by a hair.
 */
function sameCoverage(expected: any, actual: any): boolean {
  let differences = 0;
  for (let y = 0.13; y < 24; y += 0.5) {
    for (let x = 0.11; x < 24; x += 0.5) {
      if (expected.contains(x, y) !== actual.contains(x, y) && ++differences > 2) return false;
    }
  }
  return true;
}
