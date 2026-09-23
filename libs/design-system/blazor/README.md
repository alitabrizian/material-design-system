# PartoBita.DesignSystem.Blazor

Material 3 Blazor component library. Components use the `PB` prefix (e.g. `PBButton`, `PBMenu`, `PBAutoComplete`).

## Consuming this package

Add a `PackageReference` to `PartoBita.DesignSystem.Blazor` from any Blazor app (Server or WebAssembly), then
reference the components' CSS/JS from your `_Host`/`App` root:

```html
<html data-theme="rose-red">
...
<link rel="stylesheet" href="_content/Design/css/tokens.css" />
<link rel="stylesheet" href="_content/Design/css/material-tokens.css" />
<link rel="stylesheet" href="_content/Design/design-system.css" />
<script type="module" src="_content/Design/design-system.js"></script>
```

The path segment is `_content/Design/` (pinned by `StaticWebAssetBasePath` in `Design.csproj`), not the
package id. `data-theme` picks one of `rose-red`, `azure-blue`, `magenta-violet`, `cyan-orange`.

Design tokens (`css/tokens.css`, `css/material-tokens.css`) come from the framework-neutral
[`libs/design-system/tokens`](../tokens/README.md) package: `Design.csproj` copies its `dist/` into
`wwwroot/` on every build, so they ship inside this NuGet package — consumers never need Node/npm.

## Versioning

This package's version is owned here, not by consuming apps. Bump `<Version>` in
[`Design.csproj`](./Design.csproj) when releasing a new version; consuming apps upgrade by bumping their own
`PackageReference` version, same as any NuGet package.
