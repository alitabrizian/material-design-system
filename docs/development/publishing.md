# Publishing the packages

The design system ships three packages:

| Package | Registry | Built by |
| --- | --- | --- |
| `@partobita/design-tokens` | npm | `nx run design-tokens:build` |
| `@partobita/design-system-angular` | npm | `nx run design-system-angular:build` (ng-packagr) |
| `PartoBita.DesignSystem.Blazor` | NuGet | `dotnet pack` |

`npm run set-version` writes one version into every project, and `tools/scripts/release.mts` builds,
packs and publishes that version.
`tools/registry/docker-compose.yml` runs a local npm registry (Verdaccio) and a local NuGet server
(BaGetter), so the pipeline can be rehearsed end to end on one machine before a real registry exists.

## 1. Start the local registries

Requires Docker Desktop.

```bash
npm run registry:up        # Verdaccio on http://localhost:4873, BaGetter on http://localhost:5555
npm run registry:down      # stop; published packages stay in the Docker volumes
```

Both have a web UI at those addresses. Verdaccio serves `@partobita/*` itself and proxies every other
package to npmjs; BaGetter accepts pushes with the API key `local-dev-key` (override with the
`NUGET_API_KEY` environment variable before `registry:up`).

Create an npm user once (Verdaccio requires a login to publish):

```bash
npm adduser --registry http://localhost:4873
```

## 2. Set the version

All four projects (workspace, tokens, Angular, Blazor) share one version: they are released together
and Angular and Blazor are built on the tokens, so `0.3.0` means the same thing everywhere.

```bash
npm run set-version -- minor             # 0.1.0 -> 0.2.0: new components or tokens
npm run set-version -- patch             # 0.2.0 -> 0.2.1: bug fixes
npm run set-version -- major             # 0.2.1 -> 1.0.0: breaking changes
npm run set-version -- 0.3.0-beta.1      # any explicit version
npm run set-version -- minor --commit    # also commit the changed files and tag v<version>
```

It writes the version into `package.json`, `package-lock.json`, the tokens and Angular
`package.json` (plus Angular's dependency on the tokens), the Blazor `.csproj`, and the docs app's
`PackageReference` to the Blazor package. With `--commit` it commits only those files and tags
`v<version>` in the `libs/material-design-system` and `apps/blazor-design-system-docs` submodules, then
in the workspace (which records the new submodule commits). Nothing is pushed; the script prints the
push commands.

## 3. Release

```bash
npm run release:dry-run      # build and pack into dist/release/packages, publish nothing
npm run release:local        # build, pack and publish the version from step 2
```

What the release script does:

1. **Version.** The workspace `package.json` version from step 2. `--version 0.3.0-test.1` publishes
   a different one for a single run (written only into the packed copies), handy while rehearsing.
   A published version can never be published again, on npm or NuGet. Prereleases (`-beta.1`) get
   the npm dist-tag `next`, so `npm install` keeps resolving the last stable release.
2. **Build.** The tokens and the Angular library through Nx (`--skip-build` reuses the output).
3. **Pack.** `npm pack` for the tokens and the Angular build output, `dotnet pack` for Blazor. The
   Angular package's dependency on the tokens is pinned to the exact version. Everything lands in
   `dist/release/packages`.
4. **Publish.** Tokens first (the Angular package depends on them), then Angular, then the NuGet
   package, to `NPM_REGISTRY` / `NUGET_SOURCE` (defaults: the local registries).

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
(Actions, "Release packages", "Run workflow"). It publishes the version committed on the branch;
the optional version input overrides it for that run. It needs a
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
