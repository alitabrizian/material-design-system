/**
 * Color audit (constitution principle II): no literal colors outside the generated design tokens.
 *
 *   node tools/scripts/audit-colors.mts            -> exit 1 and print file:line on any violation
 *   node tools/scripts/audit-colors.mts --report   -> print, but always exit 0
 *
 * Scans both framework libraries and both docs apps (plus the landing page) for:
 *   - hex colors (#rgb, #rgba, #rrggbb, #rrggbbaa) in CSS or markup
 *   - rgb()/rgba()/hsl()/hsla()/hwb()/lab()/lch()/oklab()/oklch() literals
 *   - CSS named colors used as values of color-bearing properties or SVG fill/stroke attributes
 * Allowed: var(--md-sys-*), color-mix() over tokens, currentColor, transparent, inherit, none.
 * Generated token files (wwwroot/css/*, copied from libs/material-design-system/tokens/dist) are the only
 * place literal color values may live, so they are excluded. Generated docs assets are excluded too.
 * Comments are ignored.
 *
 * The rules are exported so tests/ can pin them (tools/scripts/audit-colors.test.mts); importing this
 * module does not run the audit.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOTS = [
  "libs/material-design-system/blazor/Components",
  "libs/material-design-system/blazor/wwwroot",
  "libs/material-design-system/angular/src",
  "apps/blazor-design-system-docs/Pages",
  "apps/blazor-design-system-docs/Shared",
  "apps/blazor-design-system-docs/Layout",
  "apps/blazor-design-system-docs/wwwroot",
  "apps/blazor-design-system-docs/App.razor",
  "apps/angular-design-system-docs/src",
  "apps/design-system-landing/src",
];

// Generated/copied token files: the one sanctioned home of literal color values.
export const EXCLUDED_DIRS = [
  "libs/material-design-system/blazor/wwwroot/css",
  "libs/material-design-system/blazor/wwwroot/fonts",
  "libs/material-design-system/blazor/wwwroot/data",
  // Copied from the tokens package at build time; same values, same exemption.
  "apps/angular-design-system-docs/src/generated-assets",
];

export const EXTENSIONS = new Set([".css", ".razor", ".cs", ".js", ".html", ".ts"]);

const NAMED_COLORS = [
  "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black", "blanchedalmond", "blue",
  "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk",
  "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki",
  "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen",
  "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise", "darkviolet", "deeppink", "deepskyblue",
  "dimgray", "dimgrey", "dodgerblue", "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro",
  "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow", "grey", "honeydew", "hotpink", "indianred",
  "indigo", "ivory", "khaki", "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral",
  "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey", "lightpink", "lightsalmon",
  "lightseagreen", "lightskyblue", "lightslategray", "lightslategrey", "lightsteelblue", "lightyellow", "lime",
  "limegreen", "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple",
  "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue",
  "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange",
  "orangered", "orchid", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff",
  "peru", "pink", "plum", "powderblue", "purple", "rebeccapurple", "red", "rosybrown", "royalblue", "saddlebrown",
  "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray",
  "slategrey", "snow", "springgreen", "steelblue", "tan", "teal", "thistle", "tomato", "turquoise", "violet",
  "wheat", "white", "whitesmoke", "yellow", "yellowgreen",
];

const COLOR_PROPERTIES =
  "color|background|background-color|background-image|border|border-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?(?:-color)?|border-color|outline|outline-color|fill|stroke|box-shadow|text-shadow|caret-color|accent-color|column-rule(?:-color)?|text-decoration(?:-color)?|scrollbar-color|stop-color|flood-color|lighting-color";

/** Tag names a component library owns: `color="primary"` there is an input, not an SVG paint. */
const COMPONENT_TAG_PREFIXES = ["pb-", "mat-", "app-"];

export const RULES: { name: string; re: RegExp; accepts?: (line: string, match: RegExpExecArray) => boolean }[] = [
  { name: "hex color", re: /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b(?![\w-])/g },
  { name: "color function", re: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[\d.]/gi },
  {
    name: "named color",
    // Not inside a hyphenated name: var(--alpha-black-600) is a token, not the named color black.
    re: new RegExp(`(?:^|[;{\\s"'])(?:${COLOR_PROPERTIES})\\s*:[^;{}"]*(?<![\\w-])(?:${NAMED_COLORS.join("|")})(?![\\w-])`, "gi"),
  },
  {
    name: "SVG color attribute",
    // Case-sensitive: HTML/SVG attributes are lowercase; Razor component parameters (Color=...) are not.
    re: new RegExp(`(?<![\\w-])(?:fill|stroke|stop-color|color)\\s*=\\s*["'](?!none|currentColor|transparent|inherit|@)[^"']+["']`, "g"),
    // A component's own color input (<pb-icon color="primary">, <mat-icon color="...">) is not a paint.
    accepts(line, match) {
      const tag = /<([a-zA-Z][\w:-]*)[^<>]*$/.exec(line.slice(0, match.index));
      if (!tag) return true;
      const name = tag[1].toLowerCase();
      return !COMPONENT_TAG_PREFIXES.some((prefix) => name.startsWith(prefix));
    },
  },
];

/** Blanks out comments (keeping line numbers) so documentation may mention colors. */
export function stripComments(text: string, ext: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  let out = text.replace(/\/\*[\s\S]*?\*\//g, blank);
  if (ext === ".razor") out = out.replace(/@\*[\s\S]*?\*@/g, blank).replace(/<!--[\s\S]*?-->/g, blank);
  if (ext === ".cs" || ext === ".js" || ext === ".razor") out = out.replace(/(^|[^:"'])\/\/.*$/gm, (m, p1) => p1 + blank(m.slice(p1.length)));
  return out;
}

function* walk(repoRoot: string, target: string): Generator<string> {
  const abs = path.join(repoRoot, target);
  if (!fs.existsSync(abs)) return;
  if (EXCLUDED_DIRS.some((dir) => abs.startsWith(path.join(repoRoot, dir)))) return;
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    if (EXTENSIONS.has(path.extname(abs))) yield abs;
    return;
  }
  for (const entry of fs.readdirSync(abs)) {
    if (entry === "bin" || entry === "obj" || entry === "node_modules") continue;
    yield* walk(repoRoot, path.join(target, entry));
  }
}

/** Audits one file and returns `path:line: rule: line` entries. */
export function auditFile(file: string, repoRoot: string): string[] {
  const found: string[] = [];
  const ext = path.extname(file);
  const lines = stripComments(fs.readFileSync(file, "utf8"), ext).split("\n");
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      const match = rule.re.exec(line);
      if (match && (!rule.accepts || rule.accepts(line, match))) {
        found.push(`${path.relative(repoRoot, file)}:${i + 1}: ${rule.name}: ${line.trim().slice(0, 140)}`);
        break;
      }
    }
  });
  return found;
}

/** Audits every root below `repoRoot` (defaults to this repository) and returns all violations. */
export function auditRoots(roots: string[] = ROOTS, { repoRoot }: { repoRoot?: string } = {}): string[] {
  const base = repoRoot ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const violations: string[] = [];
  for (const root of roots) {
    for (const file of walk(base, root)) {
      violations.push(...auditFile(file, base));
    }
  }
  return violations;
}

export function report(violations: string[]): void {
  if (violations.length === 0) {
    console.log("audit-colors: 0 violations (every color comes from --md-sys-* tokens).");
    return;
  }
  console.error(`audit-colors: ${violations.length} violation(s) -- use a --md-sys-color-* token instead:`);
  for (const v of violations) console.error("  " + v);
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
const isMain = entry === fileURLToPath(import.meta.url) || entry.endsWith(path.join("tools", "scripts", "audit-colors.mts"));

if (isMain) {
  const reportOnly = process.argv.includes("--report");
  const violations = auditRoots();
  report(violations);
  process.exit(violations.length === 0 || reportOnly ? 0 : 1);
}
