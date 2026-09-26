# @partobita/design-tokens (Nx project: `tokens`)

Framework-neutral Material 3 design tokens — plain CSS custom properties
(`--md-sys-*`) — and the single source of truth for every PartoBita design
system package. It knows nothing about Blazor or Angular; each framework
package consumes its `dist/` output.

```
libs/design-system/tokens  ──► libs/design-system/blazor  (NuGet: PartoBita.DesignSystem.Blazor)
                           └─► Angular theme package      (npm, later)
```

## Layout

| Path | What | Committed? |
| --- | --- | --- |
| `scripts/build-tokens.mts` | Generates the color roles for the 4 themes with the HCT algorithm from `@material/material-color-utilities` | yes |
| `src/material-tokens.css` | Hand-authored, theme-independent tokens: typescale, shape, elevation, motion, state layers | yes |
| `dist/css/tokens.css` | Generated `--md-sys-color-*` per theme, selected by `<html data-theme="...">` (`rose-red`, `azure-blue`, `magenta-violet`, `cyan-orange`) | no |
| `dist/css/material-tokens.css` | Copy of `src/material-tokens.css` | no |
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
npx nx run tokens:build
```

You rarely need to run it by hand: `design-system-blazor:build`/`pack` depend
on it through the Nx graph (`implicitDependencies` + `dependsOn: ["^build"]`).

## Consumers

- **Blazor** — `libs/design-system/blazor/Design.csproj` copies `dist/` into its
  `wwwroot/` on every build (`SyncDesignTokens` target), so the files ship inside
  the NuGet package as `_content/Design/css/tokens.css`, `_content/Design/fonts/...` etc. Apps using the
  NuGet package need no Node/npm at all.
- **Angular (later)** — this folder is already an npm package (`package.json`,
  `files: ["dist"]`). Publish it with `npm publish` from here after
  `nx run tokens:build`, then import the CSS in the Angular app (including
  `@partobita/design-tokens/css/roboto.css` in place of the Google Fonts
  `<link>` from Angular Material's setup guide) and theme Angular Material
  from the same variables.
- **Remotion / other bundlers** — `import "@partobita/design-tokens/css/roboto.css"`
  (or the `dist/css/roboto.css` path inside the workspace). The bundler picks
  up the `../fonts/*.woff2` URLs like any other CSS asset.

## Versioning

The version lives in `package.json`. Bump it whenever token values change, and
bump the Blazor package too, since it embeds a copy of these files.

## Why the direct-file-import workaround in the script

`@material/material-color-utilities@0.4.0`'s own barrel export (`"."` entry
point) transitively imports a file with a missing `.js` extension in a
relative import, which Node's ESM resolver rejects — and the package's
`exports` map only declares `"."`, so a normal deep import is blocked too.
The script imports the compiled file directly off disk via a `file://` URL,
which bypasses the `exports` map entirely.
