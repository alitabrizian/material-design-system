# Publishing the packages

The design system ships three packages:

| Package | Registry | Built by |
| --- | --- | --- |
| `@partobita/design-tokens` | npm | `nx run design-tokens:build` |
| `@partobita/design-system-angular` | npm | `nx run design-system-angular:build` (ng-packagr) |
| `PartoBita.DesignSystem.Blazor` | NuGet | `dotnet pack` |

`npm run set-version` gives a project a new version, and `npm run release:local` builds, packs and
publishes each package at its own version.
`tools/registry/docker-compose.yml` runs a local npm registry (Verdaccio) and a local NuGet server
(BaGetter), so the pipeline can be rehearsed end to end on one machine before a real registry exists.

## 1. Start the local registries

Requires Docker Desktop.

```bash
npm run registry:up        # Verdaccio on http://localhost:4873, BaGetter on http://localhost:5555
npm run registry:down      # stop; published packages stay in the Docker volumes
```

Both have a web UI at those addresses. Verdaccio serves `@partobita/*` itself and proxies every other
package to npmjs; BaGetter accepts pushes with the API key `local-dev-key` and, like nuget.org, rejects a version that already exists (override with the
`NUGET_API_KEY` environment variable before `registry:up`).

Create an npm user once (Verdaccio requires a login to publish):

```bash
npm adduser --registry http://localhost:4873
```

## 2. Set a version

Each project has its own version and moves only when it changes:

| Project | Version lives in | Git tag |
| --- | --- | --- |
| `tokens` | `libs/material-design-system/tokens/package.json` | `tokens-v<version>` |
| `angular` | `libs/material-design-system/angular/package.json` | `angular-v<version>` |
| `blazor` | `libs/material-design-system/blazor/PartoBita.DesignSystem.Blazor.csproj` | `blazor-v<version>` |
| `workspace` | `package.json` (the monorepo as a whole) | `workspace-v<version>` |

```bash
npm run set-version                            # show every project's current version
npm run set-version -- tokens minor            # 0.1.0 -> 0.2.0: new tokens or components
npm run set-version -- blazor patch            # 0.1.0 -> 0.1.1: bug fixes
npm run set-version -- angular major           # 0.1.0 -> 1.0.0: breaking changes
npm run set-version -- angular 0.3.0-beta.1    # any explicit version
npm run set-version -- tokens minor --commit   # also commit the changed files and tag tokens-v0.2.0
```

What follows a version change, so the projects stay consistent:

- **tokens**: Angular's dependency range on the tokens becomes `^<version>`, so Angular accepts the new
  tokens. Angular users only get them with a new Angular release, so bump Angular too when the
  change matters to them. (Blazor copies the tokens into its package, so it needs a new release to
  ship new tokens.)
- **blazor**: the docs app's `PackageReference` to the Blazor package follows.
- **tokens / workspace**: their entries in `package-lock.json` follow.

With `--commit` the script commits only the files it changed, tags the project in the repository its
code lives in (the `material-design-system` submodule, or the workspace), and then commits the
workspace so it records the new submodule commits. Nothing is pushed; the script prints the push
commands. The tag carries the project name because tokens, Angular and Blazor share one repository.

## 3. Release

```bash
npm run release:dry-run              # build and pack into dist/release, publish nothing
npm run release:local                # release every package whose version is not published yet
npm run release:local -- angular     # only the named package(s): tokens, angular, blazor
```

Each package is published at the version in its own file. A published version can never be
published again (on npm or NuGet), so the script skips versions that are already in the registry:
after bumping only the tokens, `release:local` publishes only the tokens. Packages go out in
dependency order (tokens before Angular). Prereleases (`-beta.1`) get the npm dist-tag `next`, so
`npm install` keeps resolving the last stable release.

## 4. Consume the published packages

npm, in any project:

```ini
# .npmrc
@partobita:registry=http://localhost:4873
```

```bash
npm install @partobita/design-system-angular@next
```

NuGet, in any project's `nuget.config`:

```xml
<packageSources>
  <add key="partobita-local" value="http://localhost:5555/v3/index.json" allowInsecureConnections="true" />
</packageSources>
```

`allowInsecureConnections` is required here: NuGet warns (NU1803) on plain-HTTP sources, and with
`TreatWarningsAsErrors` (this repo's `Directory.Build.props`) that warning fails the restore. A real
server uses HTTPS and does not need it. Do not add the local source to this repository's
`NuGet.config`: restore would fail on every machine where BaGetter is not running.

```bash
dotnet add package PartoBita.DesignSystem.Blazor --prerelease --source partobita-local
```

## 5. CI pipeline

`.github/workflows/release-packages.yml` runs the same script as a manual GitHub Actions workflow
(Actions, "Release packages", "Run workflow"). It publishes the versions committed on the branch,
skipping those already published; the optional input limits it to some packages. It needs a
[self-hosted runner](https://docs.github.com/actions/hosting-your-own-runners) on the Windows machine:
the library submodules are on the GitLab server and the registries on localhost, and hosted runners
reach neither.

| Setting (repository, Actions) | Purpose |
| --- | --- |
| secret `NPM_TOKEN` | npm auth token: the `_authToken` value `npm adduser` wrote to `~/.npmrc` |
| secret `NUGET_API_KEY` | BaGetter API key (`local-dev-key` locally) |
| variable `NPM_REGISTRY` / `NUGET_SOURCE` | point at a real registry later (optional) |

Moving to real registries later changes only those settings: e.g. GitLab's package registry
(`https://<gitlab>/api/v4/projects/<id>/packages/npm/` and `.../packages/nuget/index.json`), or
npmjs.com and nuget.org.
