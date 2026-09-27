# Implementation Plan: Angular Material M3 Parity

**Branch**: `feat/components` (spec dir `001-m3-angular-parity`) | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-m3-angular-parity/spec.md`

## Summary

Four earlier attempts at M3 parity failed for three structural reasons found in the audit:

1. **Invisible edits.** The demo consumed the library as a packed NuGet package (`0.1.0`, cached as
   immutable), so no library CSS edit could appear on refresh.
2. **Guessed colors.** Theme colors came from guessed seed colors (Rose & Red seed `#e3184f` →
   generated primary `#be003e`, versus Angular's real `#ba005c`). Dark surfaces used a hand-picked `#2d2d2d`, and
   several surface-container tones were wrong.
3. **Shells, not components.** Most components were one-line wrappers around raw HTML. The demo pages
   hand-built tabs, chips, list items and steps, so no component could enforce Angular Material's
   structure or states.

The approach:

- Demo → library `ProjectReference` in dev, with an opt-in package mode.
- Generate every system token from Angular Material 22.2.0's prebuilt theme CSS (vendored and
  refreshable).
- Self-host the icon fonts.
- Split the library CSS into one file per component, each translated from Angular Material's
  `_m3-<component>.scss` token map and structural styles.
- Add the sub-components Angular Material has (tab, list item, chip, option, step, menu item, tree
  node, …).
- Enforce Principle II with a color-audit script wired into the library build.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (SDK 8.0.1xx), Razor components; Node 22 for build scripts (`.mts`,
run with type stripping)

**Primary Dependencies**: Microsoft.AspNetCore.Components(.Web) 8.0.x; build-time only:
`@fontsource-variable/roboto`, `@fontsource/material-icons`,
`@fontsource-variable/material-symbols-outlined`; reference only (vendored CSS):
`@angular/material@22.2.0` prebuilt themes

**Storage**: `localStorage["theme"]` (theme key) in the demo

**Testing**: `dotnet build` (warnings as errors for library + demo), `tools/scripts/audit-colors.mts`,
Playwright (`playwright-core` + system Chromium) screenshot/computed-style script
`tools/scripts/verify-demo.mts`

**Target Platform**: Evergreen browsers (Chromium, Firefox, Safari 17+), Blazor Server and WASM hosts

**Project Type**: Component library (RCL) + demo web app + framework-neutral tokens package

**Performance Goals**: Theme switch < 100 ms (attribute swap only); no layout shift on switch

**Constraints**: No CSS frameworks, no SCSS in the library, no runtime CDN, no hardcoded colors,
360px minimum width

**Scale/Scope**: 37 catalog components, 4 themes, ~40 CSS files, 37 demo pages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-design | Post-design |
|-----------|------|-----------|-------------|
| I. Angular Material is the reference | Every token and component value cites `_m3-*.scss`, structural CSS or the prebuilt theme | PASS (sources vendored; see research R2, R5) | PASS: each component CSS file header cites its source file |
| II. No hardcoded colors | Audit script, build-blocking | PASS (R4) | PASS: audit runs in `Design.csproj` `BeforeBuild` |
| III. Four fixed themes | Values from prebuilt themes; live switch; no FOUC | PASS (R2, R3) | PASS: swatches rendered via `data-theme` scoping, not seed hex |
| IV. Reliable dev loop | ProjectReference; fresh clone builds | PASS (R1) | PASS |
| V. Accessible | Roles/states/keyboard per CDK | PASS (contracts list ARIA per component) | PASS |
| VI. Verify before done | 0/0 build, audit, screenshots ×4 themes | PASS (quickstart) | PASS |

No violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-m3-angular-parity/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── tokens.md          # CSS custom-property contract (names, theme selector)
│   └── components.md      # Public Razor API per component (params, ARIA, keyboard)
├── checklists/requirements.md
└── tasks.md               # /speckit-tasks
```

### Source Code (repository root)

```text
libs/design-system/tokens/
├── reference/angular-material/        # vendored prebuilt-themes/*.css (22.2.0) + VERSION
├── scripts/
│   ├── build-tokens.mts               # prebuilt CSS → dist/css/tokens.css (+ system tokens), fonts, icons
│   └── sync-angular-themes.mts        # refresh reference/ from npm (npm pack @angular/material@X)
└── src/material-tokens.css            # motion + spacing + font stacks only (not in prebuilt)

libs/design-system/blazor/
├── Components/                        # PB*.razor + .razor.cs (+ new sub-components)
├── wwwroot/
│   ├── design-system.css              # @import index (order-stable)
│   ├── styles/base.css                # state layer, focus, ripple, typography helpers
│   ├── styles/components/*.css        # one file per component
│   └── design-system.js               # ripple + overlay positioning + dialog/focus helpers
└── Design.csproj                      # SyncDesignTokens + AuditColors targets

apps/design-system-demo/
├── Design.Demo.csproj                 # ProjectReference (default) | PackageReference (-p:UseDesignSystemPackage=true)
├── App.razor                          # no CDN links; FOUC-safe theme boot script
├── Shared/TopAppBar.razor             # theme picker (radio + token-rendered swatch + name)
├── wwwroot/app.css                    # shell styles, tokens only
└── Pages/*.razor                      # updated to the new sub-component APIs

tools/scripts/
├── audit-colors.mts                   # Principle II gate
├── verify-demo.mts                    # Playwright: 37 pages × 4 themes screenshots + checks
└── dev-design-system-demo.mts         # tokens build → dotnet watch (no pack)
```

**Structure Decision**: Keep the existing three-package layout (tokens → blazor RCL → demo). Only the
reference direction between demo and library changes in dev. The library keeps global, non-isolated CSS,
because Angular Material itself uses `ViewEncapsulation.None` and consumers must be able to style
`ChildContent`. The file is split per component and loaded through a stable `@import` index, so
consumers still add a single `<link>`.

## Implementation Phases

1. **Foundation** (blocks everything): dev loop (US1), token generation (US2), icon/roboto
   self-hosting (US5), base CSS (state layer, focus ring, ripple), audit script (US4, initially in
   report-only mode).
2. **Theme picker + shell** (US2): theme boot script, picker, token-scoped swatches, demo shell
   restyle (sidebar full-height, responsive drawer ≤ 840px, no hardcoded colors).
3. **Components** (US3), in families, each family committed separately:
   - Buttons: button, icon button, FABs, button toggle
   - Selection controls: checkbox, radio (+ group), slide toggle, slider
   - Form field family: form field, input, select (custom listbox), autocomplete, datepicker, timepicker
   - Containment: card, divider, expansion panel, grid list, list, toolbar, sidenav
   - Navigation: tabs, stepper, menu, paginator, tree
   - Data: table, sort header
   - Communication: badge, chips, progress bar, progress spinner, tooltip, snackbar, dialog, bottom sheet
   - Foundation: icon, ripples, core
4. **Gate flip**: the audit switches to failing mode; warnings become errors; full verification run.

## Complexity Tracking

No constitution violations to justify.
