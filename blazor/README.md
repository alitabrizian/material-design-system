# PartoBita.DesignSystem.Blazor

Material 3 Blazor component library. Components use the `PB` prefix (e.g. `PBButton`, `PBMenu`, `PBAutoComplete`).

## Consuming this package

Add a `PackageReference` to `PartoBita.DesignSystem.Blazor` from any Blazor app (Server or WebAssembly), then
reference the components' CSS/JS from your `_Host`/`App` root:

```html
<link rel="stylesheet" href="_content/PartoBita.DesignSystem.Blazor/css/material-tokens.css" />
<link rel="stylesheet" href="_content/PartoBita.DesignSystem.Blazor/design-system.css" />
<script type="module" src="_content/PartoBita.DesignSystem.Blazor/design-system.js"></script>
```

Color-role tokens (`--md-sys-color-*`) are generated at pack time by `nx run tokens:generate-palettes`
(see [`libs/design-system/tokens/README.md`](../tokens/README.md)) using the real HCT tonal-palette
algorithm from `@material/material-color-utilities` — consumers never need Node/npm, they just get the
generated `tokens.css` as a static web asset like everything else in this package.

## Versioning

This package's version is owned here, not by consuming apps. Bump `<Version>` in
[`Design.csproj`](./Design.csproj) when releasing a new version; consuming apps upgrade by bumping their own
`PackageReference` version, same as any NuGet package.
