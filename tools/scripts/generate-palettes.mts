/**
 * Generates the Material 3 color-role tokens (--md-sys-color-*) for the 4
 * fixed Angular-Material-style two-hue themes (each theme has its own
 * primary + tertiary seed color and a single fixed light/dark mode -- there
 * is no independent light/dark toggle, matching Angular Material's own
 * prebuilt theme set), using the real HCT tonal-palette algorithm from
 * @material/material-color-utilities.
 *
 * Output (written into the design-system library's OWN wwwroot, so it ships
 * as a static web asset inside the PartoBita.DesignSystem.Blazor NuGet
 * package -- consuming apps get it automatically via `_content/Design/...`,
 * with zero Node/npm/package.json awareness of their own):
 *   - libs/design-system/blazor/wwwroot/css/tokens.css
 *   - libs/design-system/blazor/wwwroot/data/palettes.json
 *
 * Palette-independent tokens (typescale/shape/elevation/motion/state) live
 * in the static libs/design-system/blazor/wwwroot/css/material-tokens.css
 * instead, which this script does not touch.
 *
 * Note: @material/material-color-utilities@0.4.0's own barrel export
 * (the "." entry point) transitively imports a file with a missing ".js"
 * extension in a relative import, which Node's ESM resolver rejects, and
 * the package's `exports` map only allows importing ".", so a normal
 * `@material/material-color-utilities/palettes/core_palette.js` deep
 * import is also blocked. We work around both by importing the compiled
 * file directly off disk via a file:// URL, which bypasses the exports
 * map (this is a filesystem import, not package-specifier resolution).
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const corePaletteModule = path.join(
  repoRoot,
  "node_modules/@material/material-color-utilities/palettes/core_palette.js"
);

if (!fs.existsSync(corePaletteModule)) {
  console.error(
    `Could not find ${corePaletteModule}.\n` +
      "Run 'npm install' at the workspace root first " +
      "(@material/material-color-utilities is a devDependency there)."
  );
  process.exit(1);
}

const { CorePalette } = await import(pathToFileURL(corePaletteModule).href);

interface TonalPalette {
  tone(tone: number): number; // returns an ARGB int
}

interface CorePaletteInstance {
  a1: TonalPalette; // primary
  a2: TonalPalette; // secondary
  a3: TonalPalette; // tertiary
  error: TonalPalette;
  n1: TonalPalette; // neutral (surface)
  n2: TonalPalette; // neutral-variant (outline)
}

interface ThemeDef {
  name: string;
  mode: "light" | "dark";
  primary: number;
  tertiary: number;
}

// The 4 fixed themes (Angular Material's own prebuilt-theme naming/pairing):
// each is its own two-hue palette (primary + tertiary seed) locked to a
// single light or dark mode -- not independently togglable.
const THEMES: Record<string, ThemeDef> = {
  "rose-red": { name: "Rose & Red", mode: "light", primary: 0xe3184f, tertiary: 0xb3261e },
  "azure-blue": { name: "Azure & Blue", mode: "light", primary: 0x0091ea, tertiary: 0x0b57d0 },
  "magenta-violet": { name: "Magenta & Violet", mode: "dark", primary: 0xd500f9, tertiary: 0x673ab7 },
  "cyan-orange": { name: "Cyan & Orange", mode: "dark", primary: 0x00bcd4, tertiary: 0xf57c00 },
};

function toHex(argb: number): string {
  const r = (argb >> 16) & 0xff;
  const g = (argb >> 8) & 0xff;
  const b = argb & 0xff;
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

interface ColorRoles {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  background: string;
  onBackground: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  scrim: string;
  shadow: string;
}

function rolesForMode(cp: CorePaletteInstance, mode: "light" | "dark"): ColorRoles {
  const t = (palette: TonalPalette, tone: number) => toHex(palette.tone(tone));
  const isDark = mode === "dark";

  return {
    primary: t(cp.a1, isDark ? 80 : 40),
    onPrimary: t(cp.a1, isDark ? 20 : 100),
    primaryContainer: t(cp.a1, isDark ? 30 : 90),
    onPrimaryContainer: t(cp.a1, isDark ? 90 : 10),

    secondary: t(cp.a2, isDark ? 80 : 40),
    onSecondary: t(cp.a2, isDark ? 20 : 100),
    secondaryContainer: t(cp.a2, isDark ? 30 : 90),
    onSecondaryContainer: t(cp.a2, isDark ? 90 : 10),

    tertiary: t(cp.a3, isDark ? 80 : 40),
    onTertiary: t(cp.a3, isDark ? 20 : 100),
    tertiaryContainer: t(cp.a3, isDark ? 30 : 90),
    onTertiaryContainer: t(cp.a3, isDark ? 90 : 10),

    error: t(cp.error, isDark ? 80 : 40),
    onError: t(cp.error, isDark ? 20 : 100),
    errorContainer: t(cp.error, isDark ? 30 : 90),
    onErrorContainer: t(cp.error, isDark ? 90 : 10),

    surface: isDark ? "#2d2d2d" : t(cp.n1, 98),
    onSurface: t(cp.n1, isDark ? 90 : 10),
    surfaceVariant: t(cp.n2, isDark ? 30 : 90),
    onSurfaceVariant: t(cp.n2, isDark ? 80 : 30),

    surfaceContainerLowest: t(cp.n1, isDark ? 4 : 100),
    surfaceContainerLow: t(cp.n1, isDark ? 6 : 96),
    surfaceContainer: t(cp.n1, isDark ? 12 : 94),
    surfaceContainerHigh: t(cp.n1, isDark ? 17 : 92),
    surfaceContainerHighest: t(cp.n1, isDark ? 22 : 90),

    background: t(cp.n1, isDark ? 10 : 99),
    onBackground: t(cp.n1, isDark ? 90 : 10),

    outline: t(cp.n2, isDark ? 60 : 50),
    outlineVariant: t(cp.n2, isDark ? 30 : 80),

    inverseSurface: t(cp.n1, isDark ? 90 : 20),
    inverseOnSurface: t(cp.n1, isDark ? 20 : 95),
    inversePrimary: t(cp.a1, isDark ? 40 : 80),

    scrim: t(cp.n1, 0),
    shadow: t(cp.n1, 0),
  };
}

const ROLE_TO_VAR: [keyof ColorRoles, string][] = [
  ["primary", "--md-sys-color-primary"],
  ["onPrimary", "--md-sys-color-on-primary"],
  ["primaryContainer", "--md-sys-color-primary-container"],
  ["onPrimaryContainer", "--md-sys-color-on-primary-container"],
  ["secondary", "--md-sys-color-secondary"],
  ["onSecondary", "--md-sys-color-on-secondary"],
  ["secondaryContainer", "--md-sys-color-secondary-container"],
  ["onSecondaryContainer", "--md-sys-color-on-secondary-container"],
  ["tertiary", "--md-sys-color-tertiary"],
  ["onTertiary", "--md-sys-color-on-tertiary"],
  ["tertiaryContainer", "--md-sys-color-tertiary-container"],
  ["onTertiaryContainer", "--md-sys-color-on-tertiary-container"],
  ["error", "--md-sys-color-error"],
  ["onError", "--md-sys-color-on-error"],
  ["errorContainer", "--md-sys-color-error-container"],
  ["onErrorContainer", "--md-sys-color-on-error-container"],
  ["surface", "--md-sys-color-surface"],
  ["onSurface", "--md-sys-color-on-surface"],
  ["surfaceVariant", "--md-sys-color-surface-variant"],
  ["onSurfaceVariant", "--md-sys-color-on-surface-variant"],
  ["surfaceContainerLowest", "--md-sys-color-surface-container-lowest"],
  ["surfaceContainerLow", "--md-sys-color-surface-container-low"],
  ["surfaceContainer", "--md-sys-color-surface-container"],
  ["surfaceContainerHigh", "--md-sys-color-surface-container-high"],
  ["surfaceContainerHighest", "--md-sys-color-surface-container-highest"],
  ["background", "--md-sys-color-background"],
  ["onBackground", "--md-sys-color-on-background"],
  ["outline", "--md-sys-color-outline"],
  ["outlineVariant", "--md-sys-color-outline-variant"],
  ["inverseSurface", "--md-sys-color-inverse-surface"],
  ["inverseOnSurface", "--md-sys-color-inverse-on-surface"],
  ["inversePrimary", "--md-sys-color-inverse-primary"],
  ["scrim", "--md-sys-color-scrim"],
  ["shadow", "--md-sys-color-shadow"],
];

// Roles that start a new visual group in the generated CSS (a blank line is
// inserted before each, purely cosmetic to mirror the hand-written original).
const GROUP_STARTS: ReadonlySet<keyof ColorRoles> = new Set([
  "secondary",
  "tertiary",
  "error",
  "surface",
  "surfaceContainerLowest",
  "background",
  "outline",
  "inverseSurface",
  "scrim",
]);

function cssBlock(selector: string, roles: ColorRoles): string {
  const lines = [`${selector} {`];
  for (const [role, cssVar] of ROLE_TO_VAR) {
    if (GROUP_STARTS.has(role)) lines.push("");
    lines.push(`  ${cssVar}: ${roles[role]};`);
  }
  lines.push("}");
  return lines.join("\n");
}

const DEFAULT_THEME = "rose-red";

const themes: Record<string, { def: ThemeDef; roles: ColorRoles }> = {};

for (const [key, def] of Object.entries(THEMES)) {
  const cp: CorePaletteInstance = CorePalette.fromColors({ primary: def.primary, tertiary: def.tertiary });
  themes[key] = { def, roles: rolesForMode(cp, def.mode) };
}

const cssParts: string[] = [
  "/**",
  " * GENERATED FILE -- do not edit by hand.",
  " * Produced by tools/scripts/generate-palettes.mts (nx run tokens:generate-palettes)",
  " * from @material/material-color-utilities. Re-run the Nx target to regenerate.",
  " *",
  " * --md-sys-color-* roles for the 4 fixed themes (each its own two-hue",
  " * primary+tertiary palette, locked to one light/dark mode). Palette-",
  " * independent tokens (typescale/shape/elevation/motion/state) live in the",
  " * static libs/design-system/blazor/wwwroot/css/material-tokens.css instead.",
  " */",
  "",
];

const keys = Object.keys(THEMES);
for (const key of keys) {
  const selector = key === DEFAULT_THEME ? `:root,\n[data-theme="${key}"]` : `[data-theme="${key}"]`;
  cssParts.push(`/* ${THEMES[key].name} — ${THEMES[key].mode} */`);
  cssParts.push(cssBlock(selector, themes[key].roles));
  cssParts.push("");
}

const cssOutputPath = path.join(repoRoot, "libs/design-system/blazor/wwwroot/css/tokens.css");
const jsonOutputPath = path.join(repoRoot, "libs/design-system/blazor/wwwroot/data/palettes.json");

fs.mkdirSync(path.dirname(cssOutputPath), { recursive: true });
fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });

fs.writeFileSync(cssOutputPath, cssParts.join("\n").trimEnd() + "\n", "utf8");
fs.writeFileSync(
  jsonOutputPath,
  JSON.stringify(
    {
      default: DEFAULT_THEME,
      themes: Object.fromEntries(
        keys.map((key) => [
          key,
          {
            name: THEMES[key].name,
            mode: THEMES[key].mode,
            primarySeed: toHex(THEMES[key].primary),
            tertiarySeed: toHex(THEMES[key].tertiary),
          },
        ])
      ),
    },
    null,
    2
  ) + "\n",
  "utf8"
);

console.log(`Wrote ${path.relative(repoRoot, cssOutputPath)}`);
console.log(`Wrote ${path.relative(repoRoot, jsonOutputPath)}`);
console.log(`Generated ${keys.length} themes x ${ROLE_TO_VAR.length} tokens.`);
