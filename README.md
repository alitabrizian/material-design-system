# Workspace

Framework-neutral design tokens and workspace-owned component contracts for
Angular and Blazor consumers, managed as an Nx workspace. Every token and component value is traced
to Angular Material 22.2 (Material 3); see `specs/001-m3-angular-parity`.

## Structure

| Folder (git submodule) | Nx project | Published as |
| --- | --- | --- |
| `libs/material-design-system/tokens` | `design-tokens` | npm `@partobita/design-tokens` |
| `libs/material-design-system/blazor` | `design-system-blazor` | NuGet `PartoBita.DesignSystem.Blazor` |
| `libs/material-design-system/angular` | `design-system-angular` | npm `@partobita/design-system-angular` (ng-packagr) |
| `apps/blazor-design-system-docs` | `blazor-design-system-docs` | Blazor docs site (`PartoBita.DesignSystem.Docs`) |
| `apps/angular-design-system-docs` | `angular-design-system-docs` | Angular docs site, same layout and pages as the Blazor docs |
| `apps/design-system-remotion-videos` | `design-system-remotion-videos` | demo videos |
| `apps/design-system-landing` (not a submodule) | `design-system-landing` | landing page linking to each framework's docs |

Both component libraries inherit everything visual from `@partobita/design-tokens`: Blazor copies its
`dist/` into the NuGet package, and Angular imports it, binding Angular Material's `--mat-sys-*`
variables to the tokens through `css/angular-material.css`.

- `DesignSystem.sln`: solution for the Blazor library and docs app.
- `tools`: scripts (dev loop, color audit, browser verification).
- `docs`: architecture, development, and migration documentation.

## Monorepo and submodules

The workspace is the monorepo that builds and runs everything together; each project folder is a git
submodule with its own repository on GitLab (86.106.142.146, `ali.tabrizian/...`):

| Submodule | Repository |
| --- | --- |
| `libs/material-design-system` | `material-design-system` (tokens, Blazor and Angular libraries) |
| `apps/blazor-design-system-docs` | `blazor-design-system-docs` |
| `apps/angular-design-system-docs` | `angular-design-system-docs` |
| `apps/design-system-remotion-videos` | `design-system-remotion-videos` |

```bash
git clone --recurse-submodules <workspace url>   # or, in an existing clone:
git submodule update --init --recursive
```

A change inside a project is committed and pushed in that submodule first, then the workspace commits
the new submodule pointer. The apps reference the libraries by path (`../../libs/material-design-system`),
so they build inside the workspace; a standalone clone of an app needs the libraries' published
packages instead.

The Blazor implementation is available at `libs/material-design-system/blazor`, with the
interactive showcase in `apps/blazor-design-system-docs`. Open `DesignSystem.sln` in
Visual Studio or run:

```powershell
dotnet run --project apps/blazor-design-system-docs/PartoBita.DesignSystem.Docs.csproj
```

Each Blazor component uses the standard two-file structure: `.razor` for
component markup and `.razor.cs` for C# parameters and behavior.

## Remotion Videos

`apps/design-system-remotion-videos` renders demo videos of the design system using
[Remotion](https://www.remotion.dev/) (React + TypeScript). Compositions,
registered in `src/Root.tsx`:

- `showreel`: the whole system in one video. It has a title card, the token
  tour, each component's recorded example played full-size in turn, and a
  closing card with the counts.
- `design-tokens`: an animated tour of `libs/material-design-system/tokens`. It covers
  themes, color roles, typescale, shape, elevation, motion, spacing and state
  layers. Values are read from the built `tokens.css`, so the video follows the
  tokens package.
- one composition per component (`button`, `dialog`, ...), made from
  recordings of the live demo app.

```bash
npm install
npx nx run design-system-remotion-videos:studio   # interactive preview/editor
npx nx run design-system-remotion-videos:record   # re-record component demos (demo app must be running)
npx nx run design-system-remotion-videos:render   # renders every composition to out/<id>.mp4
npx nx run design-system-remotion-videos:render -- showreel design-tokens   # just these
```

The first render downloads a headless Chrome build, so it can take a while. If
that download is blocked on your network (e.g. a corporate proxy), point
Remotion at an existing Chrome/Edge install instead:

```bash
npx nx run design-system-remotion-videos:render -- --browser-executable="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

## Nx and Tooling

The repository is configured as an Nx integrated workspace. Install Node.js and
npm before running Nx commands.

```bash
npm install
npx nx show projects
npx nx graph
```

`npm start` builds the tokens once and then runs `nx run-many -t serve`, which starts every project
that has a `serve` target at once (the Angular docs on 4200, the Blazor docs on 5080, and any other docs
or landing apps); see `tools/scripts/serve-all.mts`. `npx nx show projects --with-target serve` lists
what it starts, and extra arguments pass through to run-many (`npm start -- --exclude=design-system-landing`).

The .NET projects use the native .NET SDK commands (a fresh clone needs only `npm ci` first,
because the library build generates the design tokens with Node):

```bash
npm ci
dotnet build DesignSystem.sln          # 0 warnings required; also runs the color audit
npx nx run blazor-design-system-docs:serve    # dev loop: library CSS edits show up on browser refresh
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

## Relationship to Material Web

Material Web (`@material/web`) is not the reference for this system. Tokens and components follow
Angular Material 22.2, as described in [Design system at a glance](#design-system-at-a-glance). The
`--md-sys-*` token prefix is kept from the earlier Material Web setup so existing CSS stays compatible,
while the values mirror Angular Material's `--mat-sys-*` variables. `@material/web` is still listed in
the root `package.json`, but the components are workspace-owned and do not render Material Web custom
elements.
