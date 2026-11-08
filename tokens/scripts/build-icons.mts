/**
 * Builds the PartoBita icon set (called by build-tokens.mts) from icons/, the design team's Figma Icons page:
 *
 *   icons/icons.json       the categories in Figma order, each with its icon names (and optional keywords)
 *   icons/svg/*.svg        one 24x24 line icon per name, drawn with stroke="currentColor"
 *   icons/codepoints.json  each icon's font codepoint (new icons get one on build; see build-icon-font.mts)
 *
 * Output:
 *   - dist/icons/<name>.svg  every icon, for <img>/mask-image use or copying into an app
 *   - dist/data/icons.json   the categories with each icon's inner SVG markup and font codepoint, for the docs'
 *                            Icons page and any consumer that renders icons inline (so they take the text color)
 *   - the PartoBita Icons font, its CSS and its codepoint map (see build-icon-font.mts)
 *
 * Fails on a file no category lists, or an icon with a literal color. A listed icon without a file is left out with a
 * warning (the SVGs are added separately from the names, which come from the Figma page).
 */

import fs from "node:fs";
import path from "node:path";
import { buildIconFont, type FontIcon } from "./build-icon-font.mts";

interface IconCategory {
  name: string;
  icons: { name: string; keywords?: string[] }[];
}

export async function buildIcons(packageRoot: string, distRoot: string, fail: (message: string) => never): Promise<number> {
  const iconsRoot = path.join(packageRoot, "icons");
  const categories: IconCategory[] = JSON.parse(fs.readFileSync(path.join(iconsRoot, "icons.json"), "utf8"));
  const svgDir = path.join(iconsRoot, "svg");
  const files = new Set(fs.existsSync(svgDir) ? fs.readdirSync(svgDir).filter((file) => file.endsWith(".svg")) : []);
  const missing: string[] = [];
  const listed = new Set<string>();
  const fontIcons = new Map<string, FontIcon>();

  fs.rmSync(path.join(distRoot, "icons"), { recursive: true, force: true });
  fs.mkdirSync(path.join(distRoot, "icons"), { recursive: true });

  const data = categories.map((category) => ({
    name: category.name,
    icons: category.icons.flatMap((icon) => {
      const file = `${icon.name}.svg`;
      if (!files.has(file)) {
        missing.push(icon.name);
        return [];
      }
      listed.add(file);
      const svg = fs.readFileSync(path.join(svgDir, file), "utf8").trim();
      const match = /^<svg\b[^>]*\bviewBox="0 0 24 24"[^>]*>([\s\S]*)<\/svg>$/.exec(svg);
      if (!match) fail(`icons/svg/${file} is not a 24x24 <svg viewBox="0 0 24 24">`);
      const literal = /\b(?:fill|stroke)="(?!none|currentColor)[^"]*"/.exec(match[1]);
      if (literal) fail(`icons/svg/${file} uses a literal color (${literal[0]}); use currentColor`);
      fs.copyFileSync(path.join(svgDir, file), path.join(distRoot, "icons", file));
      if (!fontIcons.has(icon.name)) fontIcons.set(icon.name, { name: icon.name, paths: strokedPaths(file, match[1], fail) });
      return [{ name: icon.name, keywords: icon.keywords ?? [], svg: match[1].replace(/\s*\n\s*/g, "").trim(), codepoint: "" }];
    }),
  })).filter((category) => category.icons.length > 0);

  const unlisted = [...files].filter((file) => !listed.has(file));
  if (unlisted.length) fail(`icons/svg has files no category in icons/icons.json lists: ${unlisted.join(", ")}`);

  const codepoints = await buildIconFont(packageRoot, distRoot, [...fontIcons.values()], fail);
  for (const category of data) for (const icon of category.icons) icon.codepoint = codepoints.get(icon.name)!;

  if (missing.length) console.warn(`build-icons: ${missing.length} icons listed in icons/icons.json have no file in icons/svg yet (left out)`);
  fs.writeFileSync(path.join(distRoot, "data/icons.json"), JSON.stringify({ viewBox: "0 0 24 24", categories: data }) + "\n", "utf8");
  return listed.size;
}

/** Each <path>'s d and stroke width. The font needs icons drawn as round-capped, round-joined strokes only. */
function strokedPaths(file: string, markup: string, fail: (message: string) => never): FontIcon["paths"] {
  const pathElement = /<path\b([^>]*?)\/?>(?:<\/path>)?/g;
  const paths = [...markup.matchAll(pathElement)].map(([, attributes]) => {
    const attribute = (name: string) => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attributes)?.[1];
    const d = attribute("d");
    if (!d) fail(`icons/svg/${file} has a <path> without d`);
    if (attribute("stroke") !== "currentColor" || attribute("fill")) fail(`icons/svg/${file}: the font needs stroke="currentColor" paths with no fill`);
    if (attribute("stroke-linecap") !== "round" || attribute("stroke-linejoin") !== "round") fail(`icons/svg/${file}: the font needs round caps and joins`);
    return { d, strokeWidth: Number(attribute("stroke-width") ?? "1") };
  });
  if (!paths.length || markup.replace(pathElement, "").trim()) fail(`icons/svg/${file}: the font needs icons made of <path> elements only`);
  return paths;
}
