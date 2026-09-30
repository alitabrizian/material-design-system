/**
 * Builds the framework-neutral design tokens package (dist/) from Angular Material's own prebuilt
 * M3 themes, so every --md-sys-* value is exactly what Angular Material ships -- no seed colors, no
 * hand-picked tones (constitution principles I and III).
 *
 * Source of truth: reference/angular-material/{rose-red,azure-blue,magenta-violet,cyan-orange}.css,
 * vendored from @angular/material/prebuilt-themes (refresh with scripts/sync-angular-themes.mts).
 * Each file is one `html { --mat-sys-*: ...; }` block holding:
 *   - ~50 color roles             -> --md-sys-color-<role>, per [data-theme] (theme-specific)
 *   - level0..5 box-shadows       -> --md-sys-elevation-level-N          } identical in all four
 *   - typescale roles             -> --md-sys-typescale-<role>[-<prop>]  } themes (asserted), so
 *   - corner-* shape scale        -> --md-sys-shape-corner-*             } emitted once on :root
 *   - *-state-layer-opacity       -> --md-sys-state-*-state-layer-opacity}
 *
 * Output (dist/, gitignored; the Blazor library copies it into wwwroot at build time):
 *   - css/tokens.css            color roles per theme + all system tokens + src/material-tokens.css
 *   - css/material-tokens.css   copy of src/material-tokens.css (motion, spacing, font stack)
 *   - css/angular-material.css  every --mat-sys-* Angular Material reads, bound to its --md-sys-* token,
 *                               so Angular Material components follow these tokens (and data-theme)
 *   - css/roboto.css            self-hosted Roboto @font-face rules (from @fontsource-variable/roboto)
 *   - css/icons.css             self-hosted Material Icons + Material Symbols Outlined + class rules
 *   - css/fonts.css             roboto.css + icons.css in one file
 *   - fonts/*.woff2, OFL.txt, Apache-2.0.txt
 *   - data/palettes.json        theme metadata (name, mode, key colors) for non-CSS consumers
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../../..");
const referenceDir = path.join(packageRoot, "reference/angular-material");
const distRoot = path.join(packageRoot, "dist");

const DEFAULT_THEME = "rose-red";
const THEMES: Record<string, { name: string }> = {
  "rose-red": { name: "Rose & Red" },
  "azure-blue": { name: "Azure & Blue" },
  "magenta-violet": { name: "Magenta & Violet" },
  "cyan-orange": { name: "Cyan & Orange" },
};

// Every color role the design system relies on (contracts/tokens.md). The build fails if Angular
// Material ever stops shipping one, instead of silently emitting a theme with holes in it.
const COLOR_ROLES = [
  "background", "on-background",
  "surface", "surface-dim", "surface-bright", "surface-container-lowest", "surface-container-low",
  "surface-container", "surface-container-high", "surface-container-highest", "surface-variant",
  "on-surface", "on-surface-variant", "surface-tint",
  "inverse-surface", "inverse-on-surface", "inverse-primary",
  "primary", "on-primary", "primary-container", "on-primary-container",
  "primary-fixed", "primary-fixed-dim", "on-primary-fixed", "on-primary-fixed-variant",
  "secondary", "on-secondary", "secondary-container", "on-secondary-container",
  "secondary-fixed", "secondary-fixed-dim", "on-secondary-fixed", "on-secondary-fixed-variant",
  "tertiary", "on-tertiary", "tertiary-container", "on-tertiary-container",
  "tertiary-fixed", "tertiary-fixed-dim", "on-tertiary-fixed", "on-tertiary-fixed-variant",
  "error", "on-error", "error-container", "on-error-container",
  "outline", "outline-variant", "scrim", "shadow", "neutral10", "neutral-variant20",
] as const;

const FONT_STACK_VAR = "var(--md-sys-typescale-font-family)";

function fail(message: string): never {
  console.error(`build-tokens: ${message}`);
  process.exit(1);
}

function parseTheme(file: string): Map<string, string> {
  const css = fs.readFileSync(file, "utf8");
  const tokens = new Map<string, string>();
  for (const match of css.matchAll(/--mat-sys-([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(match[1], match[2].trim());
  }
  if (tokens.size === 0) fail(`no --mat-sys-* tokens found in ${file}`);
  return tokens;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Maps one theme-independent --mat-sys-* token to its --md-sys-* name and value (null = not a system token). */
function systemToken(name: string, value: string): [string, string] | null {
  let m: RegExpMatchArray | null;
  if ((m = name.match(/^level(\d)$/))) return [`--md-sys-elevation-level-${m[1]}`, value];
  if (name.startsWith("corner-")) return [`--md-sys-shape-${name}`, value];
  if (name.endsWith("-state-layer-opacity")) return [`--md-sys-state-${name}`, value];
  if ((m = name.match(/^(display|headline|title|body|label)-(large|medium|small)(-.+)?$/))) {
    const role = `${m[1]}-${m[2]}`;
    const prop = m[3] ?? "";
    if (prop === "") return [`--md-sys-typescale-${role}`, value.replace(/ Roboto$/, ` ${FONT_STACK_VAR}`)];
    if (prop === "-font") return [`--md-sys-typescale-${role}-font`, FONT_STACK_VAR];
    return [`--md-sys-typescale-${role}${prop}`, value];
  }
  return null;
}

// ---------------------------------------------------------------- read + validate the references

const angularVersion = fs.readFileSync(path.join(referenceDir, "VERSION"), "utf8").trim();
const themes = Object.fromEntries(
  Object.keys(THEMES).map((key) => [key, parseTheme(path.join(referenceDir, `${key}.css`))])
) as Record<string, Map<string, string>>;

for (const [key, tokens] of Object.entries(themes)) {
  const missing = COLOR_ROLES.filter((role) => !tokens.has(role));
  if (missing.length) fail(`${key}.css is missing color roles: ${missing.join(", ")}`);
}

const reference = themes[DEFAULT_THEME];
const system: [string, string][] = [];
// [--mat-sys-* name, --md-sys-* name] for css/angular-material.css (the mapping above, reversed).
const matSysColors: [string, string][] = COLOR_ROLES.map((role) => [`--mat-sys-${role}`, `--md-sys-color-${role}`]);
const matSysSystem: [string, string][] = [];
for (const [name, value] of reference) {
  if ((COLOR_ROLES as readonly string[]).includes(name)) continue;
  const mapped = systemToken(name, value);
  if (!mapped) fail(`unmapped Angular Material token --mat-sys-${name}; extend systemToken()`);
  for (const [key, tokens] of Object.entries(themes)) {
    if (tokens.get(name) !== value) {
      fail(`--mat-sys-${name} differs between ${DEFAULT_THEME} (${value}) and ${key} (${tokens.get(name)})`);
    }
  }
  system.push(mapped);
  matSysSystem.push([`--mat-sys-${name}`, mapped[0]]);
}

const modes = Object.fromEntries(
  Object.entries(themes).map(([key, tokens]) => [key, relativeLuminance(tokens.get("surface")!) < 0.5 ? "dark" : "light"])
) as Record<string, "light" | "dark">;

// ---------------------------------------------------------------- tokens.css

const header = (lines: string[]) => ["/**", " * GENERATED FILE -- do not edit by hand.", ...lines.map((l) => ` * ${l}`.trimEnd()), " */", ""].join("\n");

const tokensCss: string[] = [
  header([
    "Produced by libs/design-system/tokens/scripts/build-tokens.mts (nx run design-tokens:build) from",
    `Angular Material ${angularVersion}'s prebuilt M3 themes (reference/angular-material/*.css).`,
    "",
    "Theme color roles are scoped by [data-theme]; any element may carry data-theme to re-scope",
    "its subtree. :root gets the default theme. System tokens are theme-independent.",
  ]),
];

for (const key of Object.keys(THEMES)) {
  const tokens = themes[key];
  const selector = key === DEFAULT_THEME ? `:root,\n[data-theme="${key}"]` : `[data-theme="${key}"]`;
  tokensCss.push(`/* ${THEMES[key].name} (${modes[key]}) */`, `${selector} {`, `  color-scheme: ${modes[key]};`);
  for (const role of COLOR_ROLES) tokensCss.push(`  --md-sys-color-${role}: ${tokens.get(role)};`);
  tokensCss.push("}", "");
}

tokensCss.push("/* System tokens: typescale, shape, elevation, state layers (identical in every theme) */", ":root {");
for (const [name, value] of system) tokensCss.push(`  ${name}: ${value};`);
tokensCss.push("}", "");

const handAuthored = fs.readFileSync(path.join(packageRoot, "src/material-tokens.css"), "utf8");
tokensCss.push("/* ---- src/material-tokens.css (motion, spacing, font stack) ---- */", handAuthored.trim(), "");

// ---------------------------------------------------------------- fonts (Roboto + icon fonts)

function requirePackage(name: string): string {
  const dir = path.join(repoRoot, "node_modules", name);
  if (!fs.existsSync(dir)) fail(`could not find ${dir}. Run 'npm install' at the workspace root first.`);
  return dir;
}

fs.rmSync(distRoot, { recursive: true, force: true });
for (const dir of ["css", "fonts", "data"]) fs.mkdirSync(path.join(distRoot, dir), { recursive: true });

const fontFiles = new Set<string>();
/** Rewrites Fontsource's ./files/ URLs to ../fonts/ and copies each referenced file from whichever package has it. */
function copyFonts(css: string, ...packageDirs: string[]): string {
  const rewritten = css.replaceAll("url(./files/", "url(../fonts/");
  for (const m of rewritten.matchAll(/url\(\.\.\/fonts\/([^)]+)\)/g)) {
    const source = packageDirs.map((dir) => path.join(dir, "files", m[1])).find((file) => fs.existsSync(file));
    if (!source) fail(`font file ${m[1]} not found in ${packageDirs.join(", ")}`);
    fs.copyFileSync(source, path.join(distRoot, "fonts", m[1]));
    fontFiles.add(m[1]);
  }
  return rewritten;
}

const roboto = requirePackage("@fontsource-variable/roboto");
const robotoCss = copyFonts(
  ["wght.css", "wght-italic.css"]
    .map((f) => fs.readFileSync(path.join(roboto, f), "utf8"))
    .join("\n")
    .replaceAll("font-family: 'Roboto Variable';", "font-family: 'Roboto';"),
  roboto
);
if (robotoCss.includes("Roboto Variable")) fail("unexpected @fontsource-variable/roboto CSS layout");
fs.copyFileSync(path.join(roboto, "LICENSE"), path.join(distRoot, "fonts/OFL.txt"));

// Material Icons (the font mat-icon uses by default) and Material Symbols Outlined (variable weight).
// Only the woff2 is kept for Material Icons; every supported browser reads woff2.
const materialIcons = requirePackage("@fontsource/material-icons");
const materialSymbols = requirePackage("@fontsource-variable/material-symbols-outlined");
fs.copyFileSync(path.join(materialIcons, "LICENSE"), path.join(distRoot, "fonts/Apache-2.0.txt"));

const iconsCss = copyFonts(
  [
    "@font-face {",
    "  font-family: 'Material Icons';",
    "  font-style: normal;",
    "  font-display: block;",
    "  font-weight: 400;",
    "  src: url(./files/material-icons-latin-400-normal.woff2) format('woff2');",
    "}",
    "",
    "@font-face {",
    "  font-family: 'Material Symbols Outlined';",
    "  font-style: normal;",
    "  font-display: block;",
    "  font-weight: 100 700;",
    "  src: url(./files/material-symbols-outlined-latin-wght-normal.woff2) format('woff2');",
    "}",
    "",
    // Same class contract as Google Fonts' icon CSS, which mat-icon and existing markup rely on.
    ".material-icons,",
    ".material-symbols-outlined {",
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
    "  -webkit-font-smoothing: antialiased;",
    "  -moz-osx-font-smoothing: grayscale;",
    "  text-rendering: optimizeLegibility;",
    "}",
    "",
    ".material-icons {",
    "  font-family: 'Material Icons';",
    "}",
    "",
    ".material-symbols-outlined {",
    "  font-family: 'Material Symbols Outlined';",
    "}",
  ].join("\n"),
  materialIcons,
  materialSymbols
);

// ---------------------------------------------------------------- write dist/

const write = (rel: string, content: string) => {
  fs.writeFileSync(path.join(distRoot, rel), content.trimEnd() + "\n", "utf8");
  console.log(`Wrote ${path.relative(repoRoot, path.join(distRoot, rel))}`);
};

write("css/tokens.css", tokensCss.join("\n"));
write("css/material-tokens.css", handAuthored);
write(
  "css/angular-material.css",
  [
    header([
      `Angular Material ${angularVersion} system variables (--mat-sys-*) bound to this package's --md-sys-* tokens.`,
      "Load after tokens.css in an Angular Material app instead of a prebuilt theme: every mat-* component",
      "then reads these tokens. Colors are re-declared on [data-theme] so a nested data-theme re-themes its",
      "subtree, exactly as it does for tokens.css.",
    ]),
    ":root,",
    "[data-theme] {",
    ...matSysColors.map(([mat, md]) => `  ${mat}: var(${md});`),
    "}",
    "",
    ":root {",
    ...matSysSystem.map(([mat, md]) => `  ${mat}: var(${md});`),
    "}",
  ].join("\n")
);
const robotoOut = header(["Self-hosted Roboto (variable 100-900, normal + italic), SIL OFL 1.1 (../fonts/OFL.txt)."]) + "\n" + robotoCss.trim();
const iconsOut = header(["Self-hosted Material Icons + Material Symbols Outlined, Apache 2.0 (../fonts/Apache-2.0.txt)."]) + "\n" + iconsCss.trim();
write("css/roboto.css", robotoOut);
write("css/icons.css", iconsOut);
write("css/fonts.css", robotoOut + "\n\n" + iconsOut);
write(
  "data/palettes.json",
  JSON.stringify(
    {
      source: `@angular/material@${angularVersion} prebuilt-themes`,
      default: DEFAULT_THEME,
      themes: Object.fromEntries(
        Object.keys(THEMES).map((key) => [
          key,
          {
            name: THEMES[key].name,
            mode: modes[key],
            primary: themes[key].get("primary"),
            secondary: themes[key].get("secondary"),
            tertiary: themes[key].get("tertiary"),
          },
        ])
      ),
    },
    null,
    2
  )
);

console.log(
  `Generated ${Object.keys(THEMES).length} themes x ${COLOR_ROLES.length} color roles + ${system.length} system tokens ` +
    `from Angular Material ${angularVersion}; ${fontFiles.size} font files.`
);
