# @partobita/design-tokens (Nx project: `design-tokens`)

Framework-neutral Material 3 design tokens — plain CSS custom properties
(`--md-sys-*`) — and the single source of truth for every PartoBita design
system package. It knows nothing about Blazor or Angular; each framework
package consumes its `dist/` output.

```
libs/design-system/tokens  ──► libs/design-system/blazor   (NuGet: PartoBita.DesignSystem.Blazor)
                           └─► libs/design-system/angular  (npm: @partobita/design-system-angular)
```

## Layout

| Path | What | Committed? |
| --- | --- | --- |
| `reference/angular-material/*.css` | Angular Material's prebuilt M3 themes (rose-red, azure-blue, magenta-violet, cyan-orange), vendored with `VERSION` and `LICENSE`. Refresh with `node scripts/sync-angular-themes.mts [version]` | yes |
| `scripts/build-tokens.mts` | Parses the vendored themes: 51 `--md-sys-color-*` roles per theme + typescale, shape, elevation and state tokens, and fails on missing or inconsistent values | yes |
| `src/material-tokens.css` | Hand-authored tokens Angular Material doesn't ship: font stack, motion, spacing, legacy z2/z16 shadows, on-scrim, and per-theme `--md-ref-palette-neutral99` (neutral tone 99 from `_palettes.scss`, used by the theme picker previews) | yes |
| `dist/css/tokens.css` | Everything above: color roles per `[data-theme]` (with `color-scheme`) and system tokens on `:root` | no |
| `dist/css/icons.css`, `dist/css/fonts.css` | Self-hosted Material Icons + Material Symbols Outlined (and Roboto in `fonts.css`) | no |
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

## Build

```bash
npx nx run design-tokens:build
```

You rarely need to run it by hand: `design-system-blazor:build`/`pack` depend
on it through the Nx graph (`implicitDependencies` + `dependsOn: ["^build"]`).

## Consumers

- **Blazor** — `libs/design-system/blazor/PartoBita.DesignSystem.Blazor.csproj` copies `dist/` into its
  `wwwroot/` on every build (`SyncDesignTokens` target), so the files ship inside
  the NuGet package as `_content/PartoBita.DesignSystem.Blazor/css/tokens.css`, `_content/PartoBita.DesignSystem.Blazor/fonts/...` etc. Apps using the
  NuGet package need no Node/npm at all.
- **Angular** — `libs/design-system/angular` (`@partobita/design-system-angular`) depends on this
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
