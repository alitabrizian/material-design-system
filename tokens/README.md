# design-system tokens (Nx project: `tokens`)

Generates the Material 3 color-role tokens (`--md-sys-color-*`) for all 6 seed
palettes, in both light and dark mode, from real seed colors using the HCT
tonal-palette algorithm in [`@material/material-color-utilities`](https://www.npmjs.com/package/@material/material-color-utilities)
(Google, Apache-2.0).

This directory has no source of its own — it exists only to register the
`generate-palettes` Nx target (see [`project.json`](./project.json)), which
runs [`tools/scripts/generate-palettes.mts`](../../../tools/scripts/generate-palettes.mts).

## What it produces

- `libs/design-system/blazor/wwwroot/css/tokens.css` — `--md-sys-color-*`
  custom properties for all 6 palettes × light/dark, selected via
  `[data-palette]` / `[data-theme]` attributes on `<html>`.
- `libs/design-system/blazor/wwwroot/data/palettes.json` — the same role
  values as JSON (seed hex, per-palette light/dark role maps), for anything
  that needs the raw values outside CSS.

Both files live inside the **design-system library's own** `wwwroot`, not any
app's — they ship as static web assets inside the `PartoBita.DesignSystem.Blazor`
NuGet package (see [`libs/design-system/blazor/project.json`](../blazor/project.json)),
so every consuming app gets them automatically via `_content/Design/...`
without knowing this generator exists.

Both files are **generated and gitignored** — never edit them by hand, and
don't commit them. Run the Nx target to (re)produce them:

```bash
npx nx run tokens:generate-palettes
```

## How consumers get these files

The `libs/design-system/blazor` project's `build`/`pack` Nx targets declare
`dependsOn: ["tokens:generate-palettes"]`, so Nx always regenerates the two
files before building or packing the library. Once packed into the NuGet
package, any consuming Blazor app (Server or WebAssembly) gets
`_content/Design/css/tokens.css` for free via a plain `PackageReference` —
**it has no runtime or build-time dependency on Node, npm, `package.json`,
or `material-color-utilities`.** If you build the library's `.csproj`
directly with `dotnet build`/`dotnet pack` (bypassing Nx), make sure the two
generated files already exist on disk first (run the Nx target once, or
restore them from a previous Nx build) — the library's own `pack` target
also fails loudly if they're missing or stale, as a guard against silently
shipping an empty/outdated package.

## Palette-independent tokens

Everything that isn't a color role — typography, shape, elevation, motion,
state-layer opacities — is static and hand-authored, and lives in
[`libs/design-system/blazor/wwwroot/css/material-tokens.css`](../blazor/wwwroot/css/material-tokens.css)
instead. That file is not touched by this generator.

## Why the direct-file-import workaround in the script

`@material/material-color-utilities@0.4.0`'s own barrel export (`"."` entry
point) transitively imports a file with a missing `.js` extension in a
relative import, which Node's ESM resolver rejects — and the package's
`exports` map only declares `"."`, so a normal deep import
(`@material/material-color-utilities/palettes/core_palette.js`) is blocked
too. The script works around both by importing the compiled file directly
off disk via a `file://` URL (a filesystem import, not package-specifier
resolution), which bypasses the `exports` map entirely.
