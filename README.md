# Workspace

Framework-neutral design tokens and workspace-owned component contracts for
Angular and Blazor consumers, built on the official Material 3 Web Components
package and managed as an Nx workspace.

## Structure

- `apps/design-system-demo`: standalone Blazor showcase for the design system.
- `apps/samamat`: Samamat application as a Git submodule on
	`chore/structure-initiations`.
- `apps/remotion-videos`: Remotion (React) project that renders short demo
	videos of the design-system components.
- `libs/design-system/blazor`: reusable Blazor components and shared Material Web
	resources.
- `DesignSystem.sln`: solution for the workspace-level Blazor design-system code.
- `tools`: generators, scripts, and CI helpers.
- `docs`: architecture, development, and migration documentation.

Applications consume the design-system libraries. Material Web is the
framework-neutral Material 3 foundation; custom tokens, wrappers, and
composition belong in the design-system libraries.

The Blazor implementation is available at `libs/design-system/blazor`, with the
interactive showcase in `apps/design-system-demo`. Open `DesignSystem.sln` in
Visual Studio or run:

```powershell
dotnet run --project apps/design-system-demo/Design.Demo.csproj
```

Each Blazor component uses the standard two-file structure: `.razor` for
component markup and `.razor.cs` for C# parameters and behavior.

## Remotion Videos

`apps/remotion-videos` renders short demo videos of the design-system
components using [Remotion](https://www.remotion.dev/) (React + TypeScript).
Each component gets its own composition under `src/compositions`, registered
in `src/Root.tsx`.

```bash
npm install
npx nx run remotion-videos:studio   # interactive preview/editor
npx nx run remotion-videos:render   # renders AutocompleteDemo to out/autocomplete-demo.mp4
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

The .NET projects continue to use the native .NET SDK commands:

```powershell
dotnet restore DesignSystem.sln
dotnet build DesignSystem.sln
dotnet run --project apps/design-system-demo/Design.Demo.csproj
```

For Blazor hot reload during design-system development, use `dotnet watch`:

```powershell
dotnet watch --project apps/design-system-demo/Design.Demo.csproj run --no-launch-profile --urls http://127.0.0.1:5080
```

This watches Razor markup, C# code-behind, and CSS changes. Keep the browser at
`http://127.0.0.1:5080`; supported edits update without a full manual restart.

Initialize the Samamat submodule after cloning the workspace:

```bash
git submodule update --init --recursive
```

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
