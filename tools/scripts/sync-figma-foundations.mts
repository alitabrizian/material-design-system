/**
 * Rebuilds tests/ui/figma/foundations.json, the Figma values the foundation token tests
 * (tests/ui/tokens.spec.mts) expect, from the raw exports in tests/ui/figma/raw/:
 *
 *   base.json, alias.json, rest.json   the output of tools/figma/export-foundations.js (Figma variables,
 *                                      text styles and effect styles), one file per PART
 *   pages.json                         values that only exist as annotations or component frames
 *                                      (Motion page, Layout page, icon buttons on the Icons page), kept
 *                                      by hand
 *
 *   node tools/scripts/sync-figma-foundations.mts
 *
 * Figma names become the CSS names the tokens package uses (Dev Mode's: "gray/50" is --gray-50).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = path.join(repoRoot, "tests/ui/figma");
const read = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, "raw", name), "utf8"));

/** Figma names the tokens package spells differently (see the comments in src/color-tokens.css). */
const RENAMED: Record<string, string> = {
  "font-family/Main Font": "--font-family-mainfont",
  "background/subtle/sarafid-press": "--background-subtle-sarafeed-press",
};
const cssName = (figma: string) => RENAMED[figma] ?? "--" + figma.toLowerCase().replace(/[/\s]+/g, "-");

/** Yekan Bakh's style names, as CSS weights. */
const WEIGHTS: Record<string, number> = { Light: 300, Regular: 400, SemiBold: 600, Bold: 700, ExtraBold: 800 };

type Kind = "color" | "px" | "percent" | "number" | "font-weight" | "font-family" | "duration" | "easing" | "shadow";
interface Token {
  foundation: string;
  figma: string;
  css: string;
  kind: Kind;
  value: string;
  /** The base token an alias color points to in Figma. */
  alias?: string;
}

const tokens: Token[] = [];
const byName = <T,>(o: Record<string, T>) => Object.entries(o).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }));

const { "1. Base Colors": base } = read("base.json");
const { "2. Alias Colors": alias } = read("alias.json");
const rest = read("rest.json");

for (const [figma, [hex]] of byName<[string]>(base)) tokens.push({ foundation: "Color System", figma, css: cssName(figma), kind: "color", value: hex });
for (const [figma, [hex, target]] of byName<[string, string]>(alias))
  tokens.push({ foundation: "Color System", figma, css: cssName(figma), kind: "color", value: hex, alias: cssName(target) });

for (const [figma, [value]] of byName<[number]>(rest["3. Numeric Tokens"])) {
  const kind: Kind = figma.startsWith("opacity/") ? "percent" : "px";
  tokens.push({ foundation: "Numeric Tokens", figma, css: cssName(figma), kind, value: kind === "percent" ? `${value}%` : `${value}px` });
}
for (const [figma, [value]] of byName<[number | string]>(rest["4. Typo Tokens"])) {
  const css = cssName(figma);
  if (figma.startsWith("font-weight/")) tokens.push({ foundation: "Typography", figma: `${figma} (${value})`, css, kind: "font-weight", value: String(WEIGHTS[value as string]) });
  else if (figma.startsWith("font-family/")) tokens.push({ foundation: "Typography", figma, css, kind: "font-family", value: String(value) });
  else tokens.push({ foundation: "Typography", figma, css, kind: "px", value: `${value}px` });
}

for (const [name, s] of byName<any>(rest.textStyles)) {
  const css = `--typography-${name}`;
  const figma = `text style ${name}`;
  tokens.push(
    { foundation: "Typography", figma: `${figma} family`, css: `${css}-font-family`, kind: "font-family", value: s.fontFamily },
    { foundation: "Typography", figma: `${figma} size (${s.bound.fontSize})`, css: `${css}-font-size`, kind: "px", value: `${s.fontSize}px` },
    { foundation: "Typography", figma: `${figma} weight (${s.fontStyle})`, css: `${css}-font-weight`, kind: "font-weight", value: String(WEIGHTS[s.fontStyle]) },
    { foundation: "Typography", figma: `${figma} line height (${s.bound.lineHeight})`, css: `${css}-line-height`, kind: "px", value: s.lineHeight }
  );
}

for (const [name, effects] of byName<any[]>(rest.effectStyles)) {
  const css = `--basic-shadow-${name.split("/").pop()}`;
  const value = effects
    .map((e) => {
      const a = parseInt(e.color.slice(7, 9) || "ff", 16) / 255;
      const rgb = [1, 3, 5].map((i) => parseInt(e.color.slice(i, i + 2), 16));
      return `${e.type === "INNER_SHADOW" ? "inset " : ""}${e.x}px ${e.y}px ${e.blur}px ${e.spread}px rgba(${rgb.join(", ")}, ${Math.round(a * 100) / 100})`;
    })
    .join(", ");
  tokens.push({ foundation: "Shadow", figma: `effect style ${name}`, css, kind: "shadow", value });
}

const pages = read("pages.json");
for (const foundation of ["Motion", "Layout", "Icons"]) for (const t of pages[foundation]) tokens.push({ foundation, ...t });

const textStyles = byName<any>(rest.textStyles).map(([name, s]) => ({
  name,
  fontFamily: s.fontFamily,
  fontWeight: String(WEIGHTS[s.fontStyle]),
  fontSize: `${s.fontSize}px`,
  lineHeight: s.lineHeight,
}));

const out = {
  about: "Generated by tools/scripts/sync-figma-foundations.mts from tests/ui/figma/raw/. Do not edit by hand.",
  figmaFile: "vQU7lIKOIAZ63SnS9kOUzy",
  tokens,
  textStyles,
};
fs.writeFileSync(path.join(dir, "foundations.json"), JSON.stringify(out, null, 1) + "\n");
const count = (f: string) => tokens.filter((t) => t.foundation === f).length;
console.log(
  `foundations.json: ${tokens.length} tokens (${["Color System", "Numeric Tokens", "Typography", "Shadow", "Motion", "Layout", "Icons"].map((f) => `${f} ${count(f)}`).join(", ")}), ${textStyles.length} text styles`
);
