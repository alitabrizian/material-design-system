# Research: Angular Material M3 Parity

## R1: Why CSS edits did not appear after refresh

- **Finding**: `apps/pb-design-system/Design.Demo.csproj` consumed `PartoBita.DesignSystem.Blazor` 0.1.0
  via `PackageReference` from `local-nuget-feed/`. NuGet extracts a package version once into the
  global-packages folder and treats it as immutable. A running demo served
  `.nuget/packages/partobita.designsystem.blazor/0.1.0/staticwebassets/design-system.css`, not the
  file being edited. `pack.mts` evicted the cache, but only when explicitly re-run, and `dotnet watch`
  on the demo never re-packed. `tools/scripts/dev-pb-design-system.mts` even documented the
  limitation ("Editing a component/.razor file inside libs/design-system/blazor will NOT hot-reload").
  A fresh clone also failed to restore (`NU1301: local source … doesn't exist`).
- **Decision**: The demo uses `ProjectReference` to `Design.csproj` by default. Package verification
  is opt-in with `-p:UseDesignSystemPackage=true`, which the Nx `serve:package` target sets after
  packing. In Development, ASP.NET Core's static-web-assets manifest maps `_content/Design/*` to
  the library's source `wwwroot/`, so a saved CSS file is served on the next request. The existing
  `Cache-Control: no-cache` header forces revalidation. `dotnet watch` watches referenced projects,
  so `.razor` and `.cs` changes rebuild and hot-reload.
- **Alternatives rejected**: bumping the package version on every pack (pollutes the cache and still
  needs a restore and restart); `?v=` query strings (they don't fix a stale extracted package).

## R2: Source of truth for theme colors

- **Finding**: `@angular/material@22.2.0` ships `prebuilt-themes/{rose-red,azure-blue,magenta-violet,
  cyan-orange}.css`. Each declares ~50 `--mat-sys-*` color roles, 6 elevation levels, 15 typescale
  roles, a shape scale and state opacities. The existing generator used
  `CorePalette.fromColors` with guessed seeds, which produced different hues. For example, Rose & Red
  primary should be `#ba005c` and on-primary-container `#8f0045` (tone 30, per the 2024 M3 spec,
  which the generator got as tone 10). Dark surfaces were hand-set to `#2d2d2d`.
- **Decision**: Vendor the four CSS files under `libs/design-system/tokens/reference/angular-material/`
  (with `VERSION`), and parse them in `build-tokens.mts`:
  - color roles → `--md-sys-color-*` per `[data-theme]`
  - theme-independent roles (typescale, shape, elevation, state) → `--md-sys-*` once on `:root`.
    The build asserts that they are identical across the 4 files.

  `sync-angular-themes.mts <version>` refreshes the vendored copy with `npm pack`.
- **Alternatives rejected**: `@angular/material` as a devDependency (pulls in Angular core, CDK and rxjs
  as peers, ~30 MB, just to read 4 small CSS files); keep the HCT generation (cannot reproduce Angular's
  predefined palettes).

## R3: Theme switching and first paint

- **Decision**: Keep the inline boot script in `App.razor`, which sets `data-theme` before styles load.
  Store the key only after it validates against the known four. Each theme block sets
  `color-scheme: light|dark`. The picker calls `applyTheme` and `setStoredTheme` in one JS call.
  Swatches use `<span data-theme="azure-blue" class="pb-theme-swatch">`, so the swatch reads its
  own theme's `--md-sys-color-primary`/`-secondary`/`-tertiary`. There are no seed hexes in C#.
- The initial selected state in the picker comes from the DOM on the first interactive render
  (unchanged). ThemeState seed hex fields are removed.

## R4: Enforcing "no hardcoded colors"

- **Decision**: `tools/scripts/audit-colors.mts` scans `libs/design-system/blazor/{Components,wwwroot}`
  and `apps/pb-design-system/{Pages,Shared,Layout,wwwroot}` for these patterns, ignoring comments
  and generated token files:
  - hex colors
  - `rgb[a]()` / `hsl[a]()` / `hwb()` / `lab()` / `lch()` / `oklab()` / `oklch()` literals
  - CSS named colors in color-bearing properties
  - `fill=` / `stroke=` attributes that are not `currentColor` or `none`

  It exits non-zero and prints `file:line`. `Design.csproj` runs it in a `BeforeBuild` target when
  Node is available. It is skipped with a message in NuGet-consumer contexts and runs in the Nx
  `lint` target.
- The demo's code-sample syntax colors move to tokens (primary, tertiary, secondary, error,
  on-surface-variant). The code panel uses `surface-container-highest`.

## R5: Component reference values

- **Decision**: For each component, read `@angular/material/<c>/_m3-<c>.scss` (token → system role
  mapping, sizes, shapes) and the structural CSS embedded in `fesm2022/<c>.mjs`. Translate them into
  plain CSS against `--md-sys-*`. Component-level custom properties (`--pb-<c>-*`) exist only where
  a value is reused across states or where consumers need a knob (mirrors `mat.<c>-overrides`).
- State layers: a `::before` overlay with `background: <state-layer-color>` and
  `opacity: var(--md-sys-state-hover-state-layer-opacity)` etc., as MDC does. This replaces
  `color-mix()` fills, so the container color and the state layer compose exactly like Angular.
- Ripple: the existing pointer-positioned JS ripple is kept. Its color is the state-layer color at the
  pressed opacity, and it uses Angular's timings (enter 450 ms, exit 400 ms).

## R6: Overlays (menu, select, autocomplete, tooltip)

- **Decision**: Panels render inside the component. `design-system.js` positions them with
  `position: fixed` against the trigger's `getBoundingClientRect()` (below/above flip, start/end
  alignment, viewport clamping, like the CDK `FlexibleConnectedPositionStrategy` defaults). This way
  ancestor `overflow: hidden` cannot clip them. Dialog uses native `<dialog>.showModal()` (top layer,
  inert background, Escape). Bottom sheet and snackbar are fixed-position.
- **Alternatives rejected**: CSS anchor positioning (not in every target browser); a Blazor portal
  service (large API surface for the benefit).

## R7: Icon fonts

- **Decision**: `build-tokens.mts` copies `@fontsource/material-icons` (woff2, 128 KB) and
  `@fontsource-variable/material-symbols-outlined` (wght axis, 740 KB) into `dist/fonts`. It emits
  `dist/css/icons.css` with `@font-face` for "Material Icons" and "Material Symbols Outlined", plus the
  standard `.material-icons` / `.material-symbols-outlined` class rules (24px, ligatures). The
  Google Fonts `<link>`s are removed from `App.razor`.

## R8: Select implementation

- **Finding**: `mat-select` is a custom trigger plus a listbox panel (M3: surface-container, 4px
  radius, level-2 elevation, 48px options with the secondary-container selected fill), not a native
  `<select>`. A native select cannot be styled to match.
- **Decision**: `PBSelect<TValue>` with `@bind-Value` and `PBOption<TValue>` children. It uses the CDK
  listbox keyboard model (arrows, Home/End, Enter/Space, Escape, typeahead). The demo is updated.

## R9: Date and time pickers

- **Decision**: In scope: an M3 form-field shell with a trailing calendar/clock icon button, using
  native `type=date|time` inputs (the native picker indicator is hidden and re-triggered through
  `showPicker()`). Custom calendar and clock popups are out of scope (spec assumption).
