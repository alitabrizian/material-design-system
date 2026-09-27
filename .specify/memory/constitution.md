# PartoBita Design System Constitution

## Core Principles

### I. Angular Material Is the Reference

The Blazor component library MUST look and behave like Angular Material (v22, Material 3).

- Every dimension, color role, typography role, shape, elevation, motion value and state-layer
  opacity MUST be traceable to Angular Material's own sources: the component token maps
  (`@angular/material/<component>/_m3-*.scss`), the component structural styles, or the
  prebuilt theme CSS (`@angular/material/prebuilt-themes/*.css`).
- Invented or "close enough" values are defects. When a value cannot be traced, the spec MUST
  record the gap and the chosen fallback before the value ships.
- Behavior (keyboard handling, selection rules, open/close semantics, focus management) MUST
  follow Angular Material / Angular CDK, not native browser defaults, whenever the two differ.

Rationale: four earlier refactors drifted because values were eyeballed; a single, citable
source makes "matches Angular Material" objectively checkable.

### II. Tokens Only — No Hardcoded Colors (NON-NEGOTIABLE)

- Every `color`, `background`, `border-color`, `outline-color`, `fill`, `stroke`, `box-shadow`
  color and `caret-color` in library CSS, demo CSS and Razor markup MUST come from a
  `--md-sys-*` custom property (directly, or via `color-mix()` over tokens).
- Hex, `rgb()`/`hsl()` literals and named colors (other than `transparent`, `currentColor`,
  `inherit`) are allowed ONLY in the generated token files.
- Inline SVG/data URIs MUST use `currentColor` or CSS masks, never embedded colors.
- An automated color audit (`tools/scripts/audit-colors.mts`) MUST pass; it runs as part of the
  library build and fails it on any violation.

Rationale: hardcoded values (e.g. the beige autocomplete panel) break every theme except the one
they were picked in.

### III. Four Fixed Angular Material Themes

- Exactly four themes exist: `rose-red` (Rose & Red, light, DEFAULT), `azure-blue`
  (Azure & Blue, light), `magenta-violet` (Magenta & Violet, dark), `cyan-orange`
  (Cyan & Orange, dark).
- Theme color values MUST be generated from Angular Material's prebuilt theme CSS, never from
  guessed seed colors.
- The active theme is selected by `<html data-theme="…">`. Switching MUST apply immediately,
  without a page reload, and MUST persist across reloads without a flash of the wrong theme.
- The theme picker MUST show a radio indicator, a swatch rendered from that theme's own tokens,
  and the theme name.

### IV. Reliable Development Loop

- Editing any library `.css`, `.razor` or `.cs` file MUST be visible in the running demo after a
  browser refresh (or hot reload), with no manual repack, cache clearing or process killing.
- The demo references the library by `ProjectReference` during development. Consuming the packed
  NuGet package is an explicit, opt-in verification mode.
- A fresh clone MUST restore and build with the documented commands only.

Rationale: "my CSS change doesn't show up" blocked all progress; it was caused by the demo
consuming an immutable, cached NuGet package of the library.

### V. Accessible by Default

- Components MUST use native semantics where possible, otherwise correct ARIA roles, states and
  properties (e.g. `aria-checked`, `aria-pressed`, `aria-expanded`, `aria-selected`).
- Keyboard interaction MUST match Angular Material / CDK (arrow-key roving focus in groups,
  Escape closes overlays, Enter/Space activate).
- Every interactive element MUST show a visible focus indicator; disabled states use M3's
  38% content / 12% container opacities.
- Hit targets MUST cover the whole visual control (e.g. the full slide-toggle track).

### VI. Verify Before Done

A change is done only when all of the following hold:

- `dotnet build DesignSystem.sln` reports 0 errors and 0 warnings.
- The color audit passes.
- Playwright screenshots of every component page are captured in all four themes and reviewed.
- Interactive behavior touched by the change is exercised in a real browser.

## Technical Constraints

- .NET 8 (Blazor Web App, interactive server render mode in the demo; the library MUST stay
  consumable from Blazor Server and WebAssembly).
- Pure CSS in the library: no Bootstrap, Tailwind, SCSS or other CSS frameworks.
- No runtime CDN dependencies: Roboto and the Material icon fonts ship with the tokens package.
- Layouts MUST work from 360px wide (mobile) to desktop, with no horizontal page scroll.
- Framework-neutral tokens live in `libs/design-system/tokens`; framework packages consume its
  `dist/` output.

## Development Workflow & Quality Gates

- Work is driven through Spec Kit: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-analyze` → `/speckit-implement`. Specs live in `specs/NNN-name/`.
- Commits are made per logical unit (tokens, dev loop, one component family, …) with
  descriptive messages.
- Reviews MUST check every changed value against Principle I's sources and every color against
  Principle II.

## Governance

- This constitution supersedes ad-hoc conventions in the repository. Conflicting code or docs
  are defects to be fixed, not precedents.
- Amendments are made through `/speckit-constitution`, recorded with a version bump:
  MAJOR for removed/redefined principles, MINOR for added principles or materially expanded
  guidance, PATCH for clarifications.
- Every plan's "Constitution Check" gate MUST evaluate all six principles; violations require a
  written justification in the plan's Complexity Tracking table.

**Version**: 1.0.0 | **Ratified**: 2026-09-27 | **Last Amended**: 2026-09-27
