/**
 * Builds the PartoBita icon set (called by build-tokens.mts) from icons/, the design team's Figma Icons page:
 *
 *   icons/icons.json   the categories in Figma order, each with its icon names (and optional keywords)
 *   icons/svg/*.svg    one 24x24 line icon per name, drawn with stroke="currentColor"
 *
 * Output:
 *   - dist/icons/<name>.svg  every icon, for <img>/mask-image use or copying into an app
 *   - dist/data/icons.json   the categories with each icon's inner SVG markup, for the docs' Icons page and
 *                            any consumer that renders icons inline (so they take the text color)
 *
 * Fails on a file no category lists, or an icon with a literal color. A listed icon without a file is left out with a
 * warning (the SVGs are added separately from the names, which come from the Figma page).
 */

import fs from "node:fs";
import path from "node:path";

interface IconCategory {
  name: string;
  icons: { name: string; keywords?: string[] }[];
}

export function buildIcons(packageRoot: string, distRoot: string, fail: (message: string) => never): number {
  const iconsRoot = path.join(packageRoot, "icons");
  const categories: IconCategory[] = JSON.parse(fs.readFileSync(path.join(iconsRoot, "icons.json"), "utf8"));
  const svgDir = path.join(iconsRoot, "svg");
  const files = new Set(fs.existsSync(svgDir) ? fs.readdirSync(svgDir).filter((file) => file.endsWith(".svg")) : []);
  const missing: string[] = [];
  const listed = new Set<string>();

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
      return [{ name: icon.name, keywords: icon.keywords ?? [], svg: match[1].replace(/\s*\n\s*/g, "").trim() }];
    }),
  })).filter((category) => category.icons.length > 0);

  const unlisted = [...files].filter((file) => !listed.has(file));
  if (unlisted.length) fail(`icons/svg has files no category in icons/icons.json lists: ${unlisted.join(", ")}`);

  if (missing.length) console.warn(`build-icons: ${missing.length} icons listed in icons/icons.json have no file in icons/svg yet (left out)`);
  fs.writeFileSync(path.join(distRoot, "data/icons.json"), JSON.stringify({ viewBox: "0 0 24 24", categories: data }) + "\n", "utf8");
  return listed.size;
}
