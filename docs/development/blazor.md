# Blazor development

The Blazor component library (`libs/design-system/blazor`, NuGet id `PartoBita.DesignSystem.Blazor`)
reproduces Angular Material's Material 3 components. The showcase app (`apps/pb-design-system-docs`)
documents every component.

## Run the demo (edit → refresh loop)

```bash
npm ci                                   # once: token/font build dependencies
npx nx run pb-design-system-docs:serve      # = node tools/scripts/dev-pb-design-system-docs.mts
```

Open http://127.0.0.1:5080.

- **CSS and JS in the library** (`libs/design-system/blazor/wwwroot/**`) are served straight from
  source. Save the file and refresh the browser. There is no repack, no cache clearing and no restart.
- **`.razor` / `.cs` in the library or the demo** are picked up by `dotnet watch` (hot reload, or an
  automatic rebuild and restart).
- **Token sources** (`libs/design-system/tokens/src`, `reference/`) are rebuilt automatically by the
  next `dotnet build` / watch rebuild.

Why this works: the demo references the library by `ProjectReference`. It used to consume the packed
NuGet package, and NuGet caches a version (0.1.0) as immutable. That was the reason edits "did not
show up after refresh".

### Verifying the packaged library

```bash
npx nx run pb-design-system-docs:serve-package   # packs (evicting the cached 0.1.0), runs the demo on the nupkg
```

Use this only to check what external consumers get. Never develop in this mode.

## Quality gates

| Command | What it checks |
| --- | --- |
| `dotnet build DesignSystem.sln` | 0 warnings (warnings are errors) + the color audit |
| `node tools/scripts/audit-colors.mts` | No literal colors anywhere in library/demo styles or markup |
| `node tools/scripts/verify-demo.mts` | With the demo running: all 51 color roles × 4 themes equal Angular Material's, theme switch < 100 ms, 38 pages × 4 themes render without errors, no overflow at 360px, icon fonts render; screenshots in `.verify/` |

## GitHub link in the demo toolbar

The toolbar shows a GitHub link only when the checkout was cloned from GitHub. At build time,
`PartoBita.DesignSystem.Docs.csproj` (target `ResolveGitHubRepositoryUrl`) reads `git config remote.origin.url`. For a
`github.com` remote it embeds `https://github.com/<owner>/<repo>` (never the raw remote, which may
carry credentials); for any other origin (such as the GitLab mirror), or without git, it embeds
nothing and the link is hidden. To force a result, pass the remote explicitly:
`dotnet build -p:RepositoryOriginUrl=<url>`.

## Rules for component work

The project constitution (`.specify/memory/constitution.md`) is binding:

1. **Angular Material is the reference.** Take values from
   `@angular/material/<component>/_m3-<component>.scss` and its compiled structural styles, and cite
   the source in the CSS file header.
2. **Tokens only.** Every color is a `var(--md-sys-color-*)` role (or `color-mix()` of roles). The build
   fails otherwise.
3. **One CSS file per component** under `libs/design-system/blazor/wwwroot/styles/components/`,
   registered in `wwwroot/design-system.css`.
4. **State layers** use `.pb-state-layer` + `.pb-interactive` (base.css) with
   `--pb-state-layer-color`; ripples come from `.pb-ripple-host`.

Spec Kit drives larger changes: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
`/speckit-analyze` → `/speckit-implement` (see `specs/`).
