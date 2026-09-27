/**
 * Color audit (constitution principle II): no literal colors outside the generated design tokens.
 *
 *   node tools/scripts/audit-colors.mts            -> exit 1 and print file:line on any violation
 *   node tools/scripts/audit-colors.mts --report   -> print, but always exit 0
 *
 * Scans the Blazor library (components + wwwroot) and the demo app (pages, shared, layout, wwwroot)
 * for:
 *   - hex colors (#rgb, #rgba, #rrggbb, #rrggbbaa) in CSS or markup
 *   - rgb()/rgba()/hsl()/hsla()/hwb()/lab()/lch()/oklab()/oklch() literals
 *   - CSS named colors used as values of color-bearing properties or SVG fill/stroke attributes
 * Allowed: var(--md-sys-*), color-mix() over tokens, currentColor, transparent, inherit, none.
 * Generated token files (wwwroot/css/*, copied from libs/design-system/tokens/dist) are the only
 * place literal colors may live, so they are excluded. Comments are ignored.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const reportOnly = process.argv.includes("--report");

const ROOTS = [
  "libs/design-system/blazor/Components",
  "libs/design-system/blazor/wwwroot",
  "apps/design-system-demo/Pages",
  "apps/design-system-demo/Shared",
  "apps/design-system-demo/Layout",
  "apps/design-system-demo/wwwroot",
  "apps/design-system-demo/App.razor",
];

// Generated/copied token files: the one sanctioned home of literal color values.
const EXCLUDED_DIRS = ["libs/design-system/blazor/wwwroot/css", "libs/design-system/blazor/wwwroot/fonts", "libs/design-system/blazor/wwwroot/data"];
const EXTENSIONS = new Set([".css", ".razor", ".cs", ".js", ".html"]);

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

const RULES: { name: string; re: RegExp }[] = [
  { name: "hex color", re: /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b(?![\w-])/g },
  { name: "color function", re: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[\d.]/gi },
  {
    name: "named color",
    re: new RegExp(`(?:^|[;{\\s"'])(?:${COLOR_PROPERTIES})\\s*:[^;{}"]*\\b(?:${NAMED_COLORS.join("|")})\\b`, "gi"),
  },
  {
    name: "SVG color attribute",
    // Case-sensitive: HTML/SVG attributes are lowercase; Razor component parameters (Color=...) are not.
    re: new RegExp(`(?<![\\w-])(?:fill|stroke|stop-color|color)\\s*=\\s*["'](?!none|currentColor|transparent|inherit|@)[^"']+["']`, "g"),
  },
];

/** Blanks out comments (keeping line numbers) so documentation may mention colors. */
function stripComments(text: string, ext: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  let out = text.replace(/\/\*[\s\S]*?\*\//g, blank);
  if (ext === ".razor") out = out.replace(/@\*[\s\S]*?\*@/g, blank).replace(/<!--[\s\S]*?-->/g, blank);
  if (ext === ".cs" || ext === ".js" || ext === ".razor") out = out.replace(/(^|[^:"'])\/\/.*$/gm, (m, p1) => p1 + blank(m.slice(p1.length)));
  return out;
}

function* walk(target: string): Generator<string> {
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
    yield* walk(path.join(target, entry));
  }
}

const violations: string[] = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const ext = path.extname(file);
    const lines = stripComments(fs.readFileSync(file, "utf8"), ext).split("\n");
    lines.forEach((line, i) => {
      for (const rule of RULES) {
        rule.re.lastIndex = 0;
        const match = rule.re.exec(line);
        if (match) {
          violations.push(`${path.relative(repoRoot, file)}:${i + 1}: ${rule.name}: ${line.trim().slice(0, 140)}`);
          break;
        }
      }
    });
  }
}

if (violations.length === 0) {
  console.log("audit-colors: 0 violations (every color comes from --md-sys-* tokens).");
  process.exit(0);
}

console.error(`audit-colors: ${violations.length} violation(s) -- use a --md-sys-color-* token instead:`);
for (const v of violations) console.error("  " + v);
process.exit(reportOnly ? 0 : 1);
