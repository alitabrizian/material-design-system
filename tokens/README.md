# @partobita/design-tokens (Nx project: `design-tokens`)

Framework-neutral Material 3 design tokens — plain CSS custom properties
(`--md-sys-*`) — and the single source of truth for every PartoBita design
system package. It knows nothing about Blazor or Angular; each framework
package consumes its `dist/` output.

```
libs/material-design-system/tokens  ──► libs/material-design-system/blazor   (NuGet: PartoBita.DesignSystem.Blazor)
                           └─► libs/material-design-system/angular  (npm: @partobita/design-system-angular)
```

## Layout

| Path | What | Committed? |
| --- | --- | --- |
| `reference/angular-material/*.css` | Angular Material's prebuilt M3 themes (rose-red, azure-blue, magenta-violet, cyan-orange), vendored with `VERSION` and `LICENSE`. Refresh with `node scripts/sync-angular-themes.mts [version]` | yes |
| `scripts/build-tokens.mts` | Parses the vendored themes: 51 `--md-sys-color-*` roles per theme + typescale, shape, elevation and state tokens, and fails on missing or inconsistent values | yes |
| `src/material-tokens.css` | Hand-authored tokens Angular Material doesn't ship: font stack, motion, spacing, legacy z2/z16 shadows, on-scrim, and per-theme `--md-ref-palette-neutral99` (neutral tone 99 from `_palettes.scss`, used by the theme picker previews) | yes |
| `src/typography-tokens.css` | Hand-authored PartoBita type scale from the design team's Figma frame: `--font-family-mainfont`, `--font-size-100..900`, `--line-height-50..900`, `--font-weight-100..500` and 20 text styles (`--typography-display-1` ... `--typography-caption-6`, each also split into `-font-family`/`-font-size`/`-font-weight`/`-line-height`). Use a style (`font: var(--typography-body-1)`), not the primitives on their own | yes |
| `src/color-tokens.css` | Hand-authored PartoBita colors from the design team's Figma "Color System" page, named as in Figma Dev Mode: 189 base colors (`--gray-50`, `--brand-partobita-500`, `--semantic-red-600`, `--accent-coral-500`, `--alpha-black-400`, ...) and 188 alias colors bound to them (`--background-*`, `--text-*`, `--icon-*`, `--border-*`). Use the alias tokens, not the base colors on their own | yes |
| `src/scale-tokens.css` | Hand-authored PartoBita scales from the design team's Figma frame: `--space-0..650` (0-96px), `--stroke-0..600` (0-8px), `--radius-0..600` (0-32px, then 999px for pills) and `--opacity-0..900` (0-100%) | yes |
| `src/shadow-tokens.css` | Hand-authored PartoBita basic shadows from the design team's Figma frame: `--basic-shadow-1..3` (each also split into `-offset-x`/`-offset-y`/`-blur`/`-spread`/`-color`). Use the whole shadow (`box-shadow: var(--basic-shadow-2)`). Copied to `dist/css/shadow-tokens.css` and included in `tokens.css` | yes |
| `src/motion-tokens.css` | Hand-authored PartoBita motion from the design team's Figma Motion page: durations `--motion-duration-instant/300/500/700`, the easing `--motion-easing-ease-in-out-back` (Figma's cubic-bezier(0.7, -0.4, 0.4, 1.4)), one duration per pattern (`--motion-state-duration`, `--motion-expand-duration`, `--motion-snackbar-duration`, `--motion-menu-duration`, `--motion-overlay-duration`, all instant under `prefers-reduced-motion`) and the placements `--motion-snackbar-inset`, `--motion-menu-offset`, `--motion-tooltip-gap`. Components and apps use the `pb-motion-*` classes, not these tokens. Copied to `dist/css/motion-tokens.css` and included in `tokens.css` | yes |
| `src/layout-tokens.css` | Hand-authored PartoBita layout from the design team's Figma Layout page: breakpoints `--layout-breakpoint-compact/medium/expanded/large/xlarge` (0, 600, 840, 1200, 1600px), the design widths `--layout-width-phone/portrait-tablet/landscape-tablet/desktop` (402, 768, 1024, 1440px), page margins per size class `--layout-margin-inline-*` / `--layout-margin-block-*`, and the sidebar layout `--layout-margin-sidebar`, `--layout-gap` (16px), `--layout-sidebar-collapsed` (72px), `--layout-sidebar-expanded` (240px). Components and apps use the `pb-layout` classes, not these tokens. Copied to `dist/css/layout-tokens.css` and included in `tokens.css` | yes |
| `src/layer-tokens.css` | Hand-authored PartoBita layers from the design team's Figma Layering page, bottom to top: `--layer-page-content` (0), `--layer-app-header` (100), `--layer-dragged` (200), `--layer-menu` (300), `--layer-modal` (400), `--layer-dialog` (500), `--layer-popover` (600), `--layer-tooltip` (700), `--layer-snackbar` (800), `--layer-spotlight` (900). Figma gives the order; the 100 steps are ours. Components and apps use the `pb-layer--*` classes, not these tokens. Copied to `dist/css/layer-tokens.css` and included in `tokens.css` | yes |
| `fonts/yekan-bakh/*.woff2` | Yekan Bakh FaNum Light, Regular, SemiBold, Bold and ExtraBold (fontiran.com, commercial license) | yes |
| `src/icon-tokens.css` | Hand-authored icon tokens from the Figma Icons page: `--icon-size-16..32`, `--icon-stroke-width`, and the product icon-button states (`--icon-button-*`; Selected follows `data-product`) | yes |
| `src/products.json` | The product (project) brands: per product its `id` (the `data-product` value), `name`, optional `aliases`, its base `palette` in `src/color-tokens.css` and the seed colors `primary` (and optional `secondary`, `tertiary`, `dark`), as base color names or hex. One product is the `default`. See [Product brands](#product-brands) | yes |
| `scripts/build-products.mts` | Turns `src/products.json` into one `[data-product="<id>"]` block per product: the Material primary, secondary and tertiary roles from Angular Material's own theme generator (as `light-dark()` pairs) and the PartoBita brand aliases bound to the product's palette | yes |
| `dist/css/product-tokens.css` | The generated `[data-product]` blocks (also at the end of `tokens.css`) | no |
| `icons/icons.json`, `icons/svg/*.svg` | The icon set: categories and names from the Figma Icons page (Untitled UI line icons + the PartoBita icons), one `currentColor` 24x24 SVG per name (Untitled UI SVGs generated from `@untitled-ui/icons-react`, MIT; see `icons/README.md`). Built by `scripts/build-icons.mts`; listed icons without an SVG yet are left out with a warning | yes |
| `dist/icons/*.svg`, `dist/data/icons.json`, `dist/css/icon-tokens.css` | Every icon, the icon set with inline SVG markup (for the docs' Icons page), and a copy of `src/icon-tokens.css` (also in `tokens.css`) | no |
| `dist/css/tokens.css` | Everything above: color roles per `[data-theme]` (with `color-scheme`) and system tokens on `:root` | no |
| `dist/css/icons.css`, `dist/css/fonts.css` | Self-hosted Material Icons + Material Symbols Outlined (and Roboto + Yekan Bakh in `fonts.css`) | no |
| `dist/css/yekan-bakh.css`, `dist/css/typography-tokens.css` | `@font-face` rules for the five Yekan Bakh weights, and a copy of `src/typography-tokens.css` (also included in `tokens.css`) | no |
| `dist/css/color-tokens.css` | Copy of `src/color-tokens.css` (also included in `tokens.css`) | no |
| `dist/css/scale-tokens.css` | Copy of `src/scale-tokens.css` (also included in `tokens.css`) | no |
| `dist/css/material-tokens.css` | Copy of `src/material-tokens.css` | no |
| `dist/css/angular-material.css` | Every `--mat-sys-*` variable Angular Material reads, bound to its `--md-sys-*` token (the build's mapping, reversed). Loaded instead of a prebuilt Angular Material theme, so `mat-*` components follow these tokens and `data-theme` | no |
| `dist/data/palettes.json` | Theme metadata (name, mode, seed colors) for non-CSS consumers | no |
| `dist/css/roboto.css` | Self-hosted `@font-face` rules for Roboto (variable weight 100–900, normal + italic, one rule per unicode-range subset), generated from the `@fontsource-variable/roboto` devDependency | no |
| `dist/fonts/*.woff2`, `dist/fonts/OFL.txt` | The Roboto files `roboto.css` references via `../fonts/`, plus their SIL Open Font License | no |

### Roboto

`--md-sys-typescale-font-family` names Roboto first, so the package also ships the font rather than
relying on it being installed or on a Google Fonts `<link>` (it's absent on most Windows machines and
in headless render browsers, where text would otherwise fall back to Arial). The build rewrites
Fontsource's family name `Roboto Variable` to plain `Roboto`, so the token resolves to these files.
A same-named `@font-face` also takes priority over any locally installed Roboto, so every machine
renders the same file. Consumers load `css/roboto.css` next to the token stylesheets. `roboto.css` and
`fonts/` must stay siblings under the same parent, because the CSS uses relative `../fonts/` URLs.

## Product brands

Every consuming project (product) has its own brand colors (design team decision, 2026-10-31). A project
selects its brand with `data-product="<id>"` on `<html>`; any element may carry it to re-brand its subtree.
The brand sets:

- the Material 3 **primary, secondary and tertiary** roles, all of them (`on-*`, `*-container`,
  `on-*-container`, `*-fixed`, `*-fixed-dim`, `on-*-fixed`, `on-*-fixed-variant`, `inverse-primary`,
  `surface-tint`). They are generated with Angular Material's own theme generator (the
  `ng generate @angular/material:theme-color` schematic, which bundles `@material/material-color-utilities`),
  so the tones, and with them the contrast of `on-*` against its role, are Angular Material's. Each value is a
  `light-dark()` pair, so the same product works with the light and the dark themes: `data-theme` still picks
  the mode and the neutral, surface and error roles.
- the product-neutral PartoBita aliases (`--background-brand-*`, `--background-subtle-brand-*`, `--text-brand`,
  `--icon-brand`, `--icon-state-brand-selected`, `--border-brand-*`, `--border-state-brand-selected`) and the
  icon-button Selected state, bound to steps 50, 100, 200, 500, 600 and 700 of the product's palette.

Without `data-product`, the Material roles are the theme's and the aliases are the default product's (Partobita).
A `data-theme` nested inside a `data-product` keeps the product's brand.

To add a product: add its base palette (`--brand-<name>-50` ... `-900`, from the Figma Color System page) to
`src/color-tokens.css`, add an entry to `src/products.json`, and run the build. The build fails on a missing
palette step, an unknown seed, a duplicate id or a missing default.

```json
{ "id": "satima", "name": "Satima", "palette": "brand-satima", "primary": "brand-satima-500" }
```

## Build

```bash
npx nx run design-tokens:build
```

You rarely need to run it by hand: `design-system-blazor:build`/`pack` depend
on it through the Nx graph (`implicitDependencies` + `dependsOn: ["^build"]`).

## Consumers

- **Blazor** — `libs/material-design-system/blazor/PartoBita.DesignSystem.Blazor.csproj` copies `dist/` into its
  `wwwroot/` on every build (`SyncDesignTokens` target), so the files ship inside
  the NuGet package as `_content/PartoBita.DesignSystem.Blazor/css/tokens.css`, `_content/PartoBita.DesignSystem.Blazor/fonts/...` etc. Apps using the
  NuGet package need no Node/npm at all.
- **Angular** — `libs/material-design-system/angular` (`@partobita/design-system-angular`) depends on this
  package. Its `styles/design-system.css` imports `css/fonts.css`, `css/tokens.css` and
  `css/angular-material.css`, so Angular Material is themed from the same variables, with no prebuilt
  Angular Material theme and no Google Fonts `<link>`. Inside the workspace the package is linked
  through npm workspaces (`node_modules/@partobita/design-tokens`). To publish it, run `npm publish`
  from here after `nx run design-tokens:build`.
- **Remotion / other bundlers** — `import "@partobita/design-tokens/css/roboto.css"`
  (or the `dist/css/roboto.css` path inside the workspace). The bundler picks
  up the `../fonts/*.woff2` URLs like any other CSS asset.

## Versioning

The version lives in `package.json`. Bump it whenever token values change, and
bump the Blazor package too, since it embeds a copy of these files.

## Why the themes are vendored CSS instead of generated from seed colors

Angular Material's prebuilt themes are built from predefined tonal palettes (`mat.$rose-palette`, …),
not from a single seed color. Earlier versions of this package guessed seed colors and ran the HCT
algorithm, which produced visibly different colors (measured primaries: Rose & Red `#be003e` vs Angular's `#ba005c`, Azure & Blue
`#0062a0` vs `#005cbb`, Magenta & Violet `#f8acff` vs `#ffabf3`, Cyan & Orange `#44d8f1` vs `#00dddd`). Parsing Angular Material's own output makes every role
match exactly. `tools/scripts/verify-demo.mts` checks all 51 roles in a real browser.
