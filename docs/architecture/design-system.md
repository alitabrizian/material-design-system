# Design System Architecture

The workspace is an Nx monorepo that builds one Material 3 design system for two frameworks. A single
framework-neutral token package defines every visual value; a Blazor library and an Angular library
consume those tokens and expose workspace-owned component APIs; two docs apps show the same pages in
each framework. Applications use the public library APIs and never reach into framework internals
(Angular apps do not import Angular Material directly).

```text
                  Angular Material 22.2 (M3 reference values, prebuilt themes)
                                       │
                                       ▼
                     libs/material-design-system/tokens
                     Nx: design-tokens · npm @partobita/design-tokens
                     src/, reference/ ──build──▶ dist/ (tokens.css, themes, fonts)
                        │                                     │
             copied into wwwroot/css                 imported; --mat-sys-* bound
                        ▼                             via css/angular-material.css
   libs/material-design-system/blazor           libs/material-design-system/angular
   Nx: design-system-blazor                     Nx: design-system-angular
   NuGet PartoBita.DesignSystem.Blazor          npm @partobita/design-system-angular
                        │                                     │
                        ▼                                     ▼
       apps/blazor-design-system-docs              apps/angular-design-system-docs
       (PartoBita.DesignSystem.Docs)               (same layout and pages)
                        │
                        ▼
       apps/design-system-remotion-videos (records the live demo, reads built tokens.css)
```

## Repository layout

| Path | Kind | Nx project | Role |
| --- | --- | --- | --- |
| `libs/material-design-system/tokens` | submodule (part of `material-design-system`) | `design-tokens` | Design tokens, themes and self-hosted fonts. The only npm workspace package. |
| `libs/material-design-system/blazor` | submodule (same repo) | `design-system-blazor` | Blazor component library, NuGet `PartoBita.DesignSystem.Blazor`. |
| `libs/material-design-system/angular` | submodule (same repo) | `design-system-angular` | Angular component library, built with ng-packagr. |
| `apps/blazor-design-system-docs` | submodule | `blazor-design-system-docs` | Interactive Blazor showcase and docs site. |
| `apps/angular-design-system-docs` | submodule | `angular-design-system-docs` | Angular docs site mirroring the Blazor one. |
| `apps/design-system-remotion-videos` | submodule | `design-system-remotion-videos` | Remotion (React) demo videos: showreel, token tour, one per component. |
| `apps/pb.chain` | submodule | none | Product app (Angular 13 front end, ASP.NET Core on .NET 6 back end) run from the workspace via `tools/scripts/dev-pb-chain-*.mts`. |
| `apps/samamat` | submodule | none | Product app; its contents are not described in this repository. |
| `tools/scripts` | workspace | none | Dev loops, the color audit and browser verification. |
| `specs/`, `.specify/` | workspace | none | Spec Kit feature specs and the project constitution. |
| `DesignSystem.sln` | workspace | none | Solution with the Blazor library and the Blazor docs app. |

## Design tokens

`libs/material-design-system/tokens` is the single source of visual truth. Values are traced to
Angular Material 22.2's `_m3-*.scss` token maps, and the four themes (Rose & Red and Azure & Blue,
light; Magenta & Violet and Cyan & Orange, dark) are generated from Angular Material's prebuilt theme
CSS. A theme is selected with `<html data-theme="…">`. The build emits `dist/`, which carries the
`--md-sys-*` custom properties plus Roboto, Material Icons and Material Symbols, so nothing loads from
a CDN.

Literal colors may exist only in the generated token output. Everywhere else a color is a
`var(--md-sys-color-*)` role or a `color-mix()` of roles, and `tools/scripts/audit-colors.mts`
fails the build on any violation.

## Component libraries

Both libraries live in the `material-design-system` submodule and inherit everything visual from the
token package. They differ only in how the tokens reach them:

- **Blazor** copies `tokens/dist` into `wwwroot/css` and ships it inside the NuGet package. Each
  component is a `.razor` / `.razor.cs` pair with one CSS file under `wwwroot/styles/components/`,
  registered in `wwwroot/design-system.css`. State layers and ripples use the shared `.pb-state-layer`,
  `.pb-interactive` and `.pb-ripple-host` classes from `base.css`. Building the library runs the
  token build with Node, so a fresh clone needs `npm ci` before `dotnet build`.
- **Angular** imports `@partobita/design-tokens` and binds Angular Material's `--mat-sys-*` variables
  to the tokens through `css/angular-material.css`, then wraps the components in its own public API.

Material Web (`@material/web` 2.5.0) custom elements are available to both: Angular consumers enable
`CUSTOM_ELEMENTS_SCHEMA`, and Blazor consumers load the Material Web script entry point first.

## Docs apps and videos

The two docs apps present the same layout and pages, so a component's behavior can be compared across
frameworks. They reference the libraries by path (`../../libs/material-design-system`), and the Blazor
docs app uses a `ProjectReference`, so library CSS and JS edits show up on a browser refresh
(`npx nx run blazor-design-system-docs:serve`). `serve-package` runs the docs app against the packed
NuGet package instead, to check what external consumers receive.

The Remotion project records the running docs app for its per-component videos and reads the built
`tokens.css` for the token tour, so the videos follow the token package.

## Submodules and the workspace

This repository is the monorepo that builds and runs everything together. Each project folder is a
git submodule with its own repository on the GitLab server (86.106.142.146). Clone with
`--recurse-submodules`, or run `git submodule update --init --recursive` in an existing clone.

A change inside a project is committed and pushed in its submodule first; the workspace then commits
the new submodule pointer. Because the apps reference the libraries by relative path, they build only
inside the workspace; a standalone clone of an app needs the published packages instead.

## Build and quality gates

- Nx (`nx.json`) caches `build`, `lint` and `test`, and `build` depends on upstream builds (`^build`),
  so `npx nx run-many -t build` builds tokens before the libraries and apps.
- .NET projects build with the .NET 8 SDK (`global.json`). `Directory.Build.props` turns every warning
  into an error, and `dotnet build DesignSystem.sln` also runs the color audit. pb.chain opts out of
  these props with `-p:ImportDirectoryBuildProps=false`.
- `tools/scripts/verify-demo.mts` checks the running Blazor demo against Angular Material: all color
  roles in every theme, theme-switch speed, every page in every theme, 360px layouts and icon fonts.

The binding rules for component work live in `.specify/memory/constitution.md`; see
[../development/blazor.md](../development/blazor.md) for the day-to-day workflow.
