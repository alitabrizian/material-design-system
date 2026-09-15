# Workspace

Framework-neutral design tokens and workspace-owned component contracts for
Angular and Blazor consumers, built on the official Material 3 Web Components
package.

## Structure

- `apps`: Angular applications and the Blazor design-system documentation app.
- `libraries/design-system/foundations`: framework-neutral Material 3 tokens and themes.
- `libraries/design-system/components`: canonical component specifications.
- `libraries/design-system/angular`: Angular-facing public API boundary.
- `libraries/design-system/blazor`: Blazor-facing implementation boundary.
- `backend`: isolated .NET application boundaries.
- `tools`: generators, scripts, and CI helpers.
- `docs`: architecture, development, and migration documentation.

Applications consume the design-system libraries. Material Web is the
framework-neutral Material 3 foundation; custom tokens, wrappers, and
composition belong in the design-system libraries.

The Blazor implementation is available at `C:\libs\design-system\blazor`, with
the interactive showcase in `apps/design-system-demo`. Open
`DesignSystem.sln` in Visual Studio or run:

```powershell
dotnet run --project apps/design-system-demo/Design.Demo.csproj
```

Each Blazor component uses the standard two-file structure: `.razor` for
component markup and `.razor.cs` for C# parameters and behavior.

## Tooling

The repository is configured as an Nx integrated workspace. Install Node.js and npm before running the workspace scripts.

```text
npm install
npm run lint
npm run test
npm run build
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
