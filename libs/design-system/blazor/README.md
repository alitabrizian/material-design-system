# PartoBita.DesignSystem.Blazor

Material 3 Blazor component library. Components use the `PB` prefix (e.g. `PBButton`, `PBMenu`, `PBAutoComplete`).

## Consuming this package

Add a `PackageReference` to `PartoBita.DesignSystem.Blazor` from any Blazor app (Server or WebAssembly),
then reference the assets from your `App.razor` / host page:

```html
<html data-theme="rose-red">
...
<link rel="stylesheet" href="_content/Design/css/fonts.css" />   <!-- Roboto + Material Icons/Symbols -->
<link rel="stylesheet" href="_content/Design/css/tokens.css" />  <!-- every --md-sys-* token -->
<link rel="stylesheet" href="_content/Design/design-system.css" />
<script type="module" src="_content/Design/design-system.js"></script>
```

- The path segment is `_content/Design/` (pinned by `StaticWebAssetBasePath` in `Design.csproj`), not
  the package id.
- `data-theme` selects one of Angular Material's four prebuilt M3 themes: `rose-red` (default),
  `azure-blue`, `magenta-violet` or `cyan-orange`. Any element can carry `data-theme` to re-theme
  its subtree.
- Fonts are self-hosted, so no Google Fonts `<link>` is needed and it works offline. Roboto is under
  SIL OFL 1.1 (`fonts/OFL.txt`), Material Icons/Symbols under Apache 2.0 (`fonts/Apache-2.0.txt`).
- The individual `css/roboto.css`, `css/icons.css` and `css/material-tokens.css` files are still shipped
  for existing consumers.

Design tokens and fonts come from the framework-neutral
[`libs/design-system/tokens`](../tokens/README.md) package. `Design.csproj` regenerates it when its
sources change and copies its `dist/` into `wwwroot/`, so consumers never need Node/npm.

## Components

All components follow Angular Material 22 (M3): see `specs/001-m3-angular-parity/contracts/components.md`
for the public API of each one and the demo app for live examples.

## Versioning

This package's version is owned here, not by consuming apps. Bump `<Version>` in
[`Design.csproj`](./Design.csproj) when releasing a new version; consuming apps upgrade by bumping their own
`PackageReference` version, same as any NuGet package.
