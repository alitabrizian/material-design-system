# Workspace

Framework-neutral design tokens and workspace-owned component contracts for
Angular and Blazor consumers, built on the official Material 3 Web Components
package and managed as an Nx workspace.

## Structure

| Folder | Nx project | Published as |
| --- | --- | --- |
| `libs/design-system/tokens` | `design-tokens` | npm `@partobita/design-tokens` |
| `libs/design-system/blazor` | `design-system-blazor` | NuGet `PartoBita.DesignSystem.Blazor` |
| `libs/design-system/angular` | `design-system-angular` | npm `@partobita/design-system-angular` (ng-packagr) |
| `apps/pb-design-system-docs` | `pb-design-system-docs` | Blazor docs site (`PartoBita.DesignSystem.Docs`) |
| `apps/pb-design-system-angular-docs` | `pb-design-system-angular-docs` | Angular docs site, same layout and pages as the Blazor docs |
| `apps/remotion-videos` | `remotion-videos` | demo videos |

Both component libraries inherit everything visual from `@partobita/design-tokens`: Blazor copies its
`dist/` into the NuGet package, and Angular imports it, binding Angular Material's `--mat-sys-*`
variables to the tokens through `css/angular-material.css`.

- `DesignSystem.sln`: solution for the Blazor library and docs app.
- `tools`: scripts (dev loop, color audit, browser verification, repo mirrors).
- `docs`: architecture, development, and migration documentation.

## Monorepo and mirror repos

This repository is the source of truth: a change to the tokens, a library and an app is one commit.
Each project is also published, with its history, to its own read-only repo by
`tools/scripts/mirror-repos.mts` (configured in `tools/mirror-repos.json`):

```bash
npm run mirror                              # every mirror that has a url
node tools/scripts/mirror-repos.mts --dry-run
```

Run it on master after merging. Don't commit to a mirror directly: the next mirror push overwrites it.

The Blazor implementation is available at `libs/design-system/blazor`, with the
interactive showcase in `apps/pb-design-system-docs`. Open `DesignSystem.sln` in
Visual Studio or run:

```powershell
dotnet run --project apps/pb-design-system-docs/PartoBita.DesignSystem.Docs.csproj
```

Each Blazor component uses the standard two-file structure: `.razor` for
component markup and `.razor.cs` for C# parameters and behavior.

## Remotion Videos

`apps/remotion-videos` renders demo videos of the design system using
[Remotion](https://www.remotion.dev/) (React + TypeScript). Compositions,
registered in `src/Root.tsx`:

- `showreel`: the whole system in one video. It has a title card, the token
  tour, each component's recorded example played full-size in turn, and a
  closing card with the counts.
- `design-tokens`: an animated tour of `libs/design-system/tokens`. It covers
  themes, color roles, typescale, shape, elevation, motion, spacing and state
  layers. Values are read from the built `tokens.css`, so the video follows the
  tokens package.
- one composition per component (`button`, `dialog`, ...), made from
  recordings of the live demo app.

```bash
npm install
npx nx run remotion-videos:studio   # interactive preview/editor
npx nx run remotion-videos:record   # re-record component demos (demo app must be running)
npx nx run remotion-videos:render   # renders every composition to out/<id>.mp4
npx nx run remotion-videos:render -- showreel design-tokens   # just these
```

The first render downloads a headless Chrome build, so it can take a while. If
that download is blocked on your network (e.g. a corporate proxy), point
Remotion at an existing Chrome/Edge install instead:

```bash
npx nx run remotion-videos:render -- --browser-executable="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

## Nx and Tooling

The repository is configured as an Nx integrated workspace. Install Node.js and
npm before running Nx commands.

```bash
npm install
npx nx show projects
npx nx graph
```

The .NET projects use the native .NET SDK commands (a fresh clone needs only `npm ci` first,
because the library build generates the design tokens with Node):

```bash
npm ci
dotnet build DesignSystem.sln          # 0 warnings required; also runs the color audit
npx nx run pb-design-system-docs:serve    # dev loop: library CSS edits show up on browser refresh
```

See [docs/development/blazor.md](docs/development/blazor.md) for the dev loop, the package
verification mode and the quality gates (`tools/scripts/audit-colors.mts`,
`tools/scripts/verify-demo.mts`).

## Design system at a glance

- **Reference:** Angular Material 22.2 (Material 3). Every component value is traced to Angular
  Material's `_m3-*.scss` token maps and structural styles.
- **Themes:** Rose & Red (default, light), Azure & Blue (light), Magenta & Violet (dark),
  Cyan & Orange (dark). They are generated from Angular Material's prebuilt theme CSS and selected with
  `<html data-theme="…">`.
- **No hardcoded colors:** enforced by the build.
- **Self-hosted fonts:** Roboto, Material Icons and Material Symbols ship in the package. There is
  no CDN dependency.
- **Spec Kit:** the constitution lives in `.specify/memory/constitution.md` and feature specs in
  `specs/`.

## Material Web

The workspace uses the latest published `@material/web` release at the time of
setup:

```text
@material/web@2.5.0
```

Install dependencies from the workspace root:

```bash
npm install
```

Import only the Material Web components needed by an application or design
system library:

```ts
import "@material/web/button/filled-button.js";
```

The same custom elements can then be used by Angular templates and Blazor
Razor markup:

```html
<md-filled-button>Save changes</md-filled-button>
```

Angular consumers should enable `CUSTOM_ELEMENTS_SCHEMA` for components using
Material Web custom elements. Blazor consumers should load the generated
Material Web JavaScript entry point before rendering those elements.
