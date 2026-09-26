# PartoBita.DesignSystem.Blazor

Material 3 Blazor component library. Components use the `PB` prefix (e.g. `PBButton`, `PBMenu`, `PBAutoComplete`).

## Consuming this package

Add a `PackageReference` to `PartoBita.DesignSystem.Blazor` from any Blazor app (Server or WebAssembly), then
reference the components' CSS/JS from your `_Host`/`App` root:

```html
<html data-theme="rose-red">
...
<link rel="stylesheet" href="_content/Design/css/roboto.css" />
<link rel="stylesheet" href="_content/Design/css/tokens.css" />
<link rel="stylesheet" href="_content/Design/css/material-tokens.css" />
<link rel="stylesheet" href="_content/Design/design-system.css" />
<script type="module" src="_content/Design/design-system.js"></script>
```

The path segment is `_content/Design/` (pinned by `StaticWebAssetBasePath` in `Design.csproj`), not the
package id. `data-theme` picks one of `rose-red`, `azure-blue`, `magenta-violet`, `cyan-orange`.

`css/roboto.css` loads Roboto, the typeface the typescale tokens name first, from the package itself
(`_content/Design/fonts/*.woff2`, variable weight 100–900, normal and italic). No Google Fonts
`<link>` is needed, and it works offline. Leave it out and text silently falls back to Arial on any machine
that doesn't happen to have Roboto installed. Browsers only download the unicode-range subsets a page
actually uses (usually just Latin, about 43 KB). Roboto is licensed under the SIL Open Font License 1.1;
the license ships next to the fonts as `fonts/OFL.txt`.

Design tokens (`css/tokens.css`, `css/material-tokens.css`) and the Roboto files (`css/roboto.css`,
`fonts/`) come from the framework-neutral
[`libs/design-system/tokens`](../tokens/README.md) package: `Design.csproj` copies its `dist/` into
`wwwroot/` on every build, so they ship inside this NuGet package — consumers never need Node/npm.

## Versioning

This package's version is owned here, not by consuming apps. Bump `<Version>` in
[`Design.csproj`](./Design.csproj) when releasing a new version; consuming apps upgrade by bumping their own
`PackageReference` version, same as any NuGet package.
