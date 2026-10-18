# Publishing the packages

The design system ships three packages:

| Package | Registry | Built by |
| --- | --- | --- |
| `@partobita/design-tokens` | npm | `nx run design-tokens:build` |
| `@partobita/design-system-angular` | npm | `nx run design-system-angular:build` (ng-packagr) |
| `PartoBita.DesignSystem.Blazor` | NuGet | `dotnet pack` |

`tools/scripts/release.mts` does the whole release in four steps: pick a version, build, pack, publish.
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

## 2. Release

```bash
npm run release:dry-run                   # build and pack into dist/release/packages, publish nothing
npm run release:local                     # publish <base>-local.<timestamp> (e.g. 0.1.0-local.20261018090926)
npm run release:local -- --version 0.2.0  # publish an explicit version
```

What the script does:

1. **Version.** `--version` (or `RELEASE_VERSION`); otherwise the base version from
   `tokens/package.json` plus a `-local.<timestamp>` prerelease suffix. Published versions are
   immutable on both npm and NuGet, so every rehearsal needs a new one. Prereleases get the npm
   dist-tag `next`, stable versions `latest`.
2. **Build.** The tokens and the Angular library through Nx (`--skip-build` reuses the output).
3. **Pack.** The packages are copied to `dist/release/npm/*` and the version is written there,
   never into the source `package.json` / `.csproj` (those stay at `0.1.0` for local development).
   The Angular package's dependency on the tokens is pinned to the same version. The NuGet package
   gets its version from `dotnet pack -p:Version=...`. Everything lands in `dist/release/packages`.
4. **Publish.** Tokens first (the Angular package depends on them), then Angular, then the NuGet
   package, to `NPM_REGISTRY` / `NUGET_SOURCE` (defaults: the local registries).

## 3. Consume the published packages

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

## 4. CI pipeline

`.github/workflows/release-packages.yml` runs the same script as a manual GitHub Actions workflow
(Actions, "Release packages", "Run workflow", with an optional version). It needs a
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
