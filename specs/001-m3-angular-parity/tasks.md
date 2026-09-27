---

description: "Task list for Angular Material M3 parity"
---

# Tasks: Angular Material M3 Parity

**Input**: Design documents from `specs/001-m3-angular-parity/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: No unit-test suite was requested. Verification uses the color audit (T008) and the Playwright
verification script (T010), per Constitution Principle VI.

**Organization**: Tasks are grouped by user story (US1–US5 from spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 dev loop · US2 themes · US3 components · US4 color audit · US5 offline fonts

---

## Phase 1: Setup

- [ ] T001 Vendor Angular Material 22.2.0 prebuilt themes (rose-red, azure-blue, magenta-violet, cyan-orange) into libs/design-system/tokens/reference/angular-material/ with a VERSION file, and add libs/design-system/tokens/scripts/sync-angular-themes.mts to refresh them via `npm pack`
- [ ] T002 [P] Add devDependencies `@fontsource/material-icons` and `@fontsource-variable/material-symbols-outlined` in package.json / package-lock.json

---

## Phase 2: Foundational (blocks all stories)

- [ ] T003 Rewrite libs/design-system/tokens/scripts/build-tokens.mts: parse the vendored prebuilt CSS; emit `--md-sys-color-*` (all 50 roles in contracts/tokens.md) per `[data-theme]` with `color-scheme`, `:root` = rose-red; emit theme-independent typescale/shape/elevation/state tokens once, and fail if they differ across the four files or if a role is missing; write dist/data/palettes.json
- [ ] T004 Reduce libs/design-system/tokens/src/material-tokens.css to motion, spacing and the font stack (everything else is now generated), keeping the existing token names working
- [ ] T005 [P] Create libs/design-system/blazor/wwwroot/styles/base.css (state-layer `::before` helper, focus-visible handling, ripple styles, `.pb-visually-hidden`) and turn libs/design-system/blazor/wwwroot/design-system.css into the `@import` index
- [ ] T006 [P] Extend libs/design-system/blazor/wwwroot/design-system.js with overlay positioning (`pb.position(panel, anchor, opts)`), dialog helpers (`showModal`/`close`), focus helpers and Angular ripple timings
- [ ] T007 Update .gitignore and libs/design-system/blazor/Design.csproj SyncDesignTokens for the new dist files (fonts.css, icons.css, icon woff2)
- [ ] T008 Create tools/scripts/audit-colors.mts (hex, rgb/hsl/hwb/lab/lch/oklab/oklch literals, named colors in color properties, SVG fill/stroke; ignores comments and generated token files; prints file:line; exit 1 on violations)
- [ ] T009 Wire the audit into libs/design-system/blazor/Design.csproj (`AuditColors` target, BeforeBuild; fails with a clear message when node is unavailable, like SyncDesignTokens) and into the Nx `lint` target in libs/design-system/blazor/project.json
- [ ] T010 Create tools/scripts/verify-demo.mts (Playwright + system Chromium: every catalog route × 4 themes screenshots to .verify/, page-error check, 360px overflow check, unrendered-icon check, `--tokens` computed-role comparison against the vendored prebuilt CSS, theme-switch timing < 100 ms for SC-006)

**Checkpoint**: tokens are exact, the base CSS and JS exist, and the verification tooling exists.

---

## Phase 3: User Story 1 — Style edits show up on refresh (P1) 🎯 MVP

**Goal**: A library CSS/Razor edit is visible on refresh with no repack.
**Independent test**: quickstart §1.

- [ ] T011 [US1] Switch apps/design-system-demo/Design.Demo.csproj to `ProjectReference` ../../libs/design-system/blazor/Design.csproj by default; use `PackageReference` only when `UseDesignSystemPackage=true`; keep the dev `Cache-Control: no-cache` static-file header (FR-005)
- [ ] T012 [US1] Make NuGet restore work on a fresh clone: create `local-nuget-feed/` from Directory.Build.props (`MakeDir` before restore) or keep the source conditional; verify with `git clean -xfd` + `dotnet build`
- [ ] T013 [US1] Update tools/scripts/dev-design-system-demo.mts (tokens build → `dotnet watch`, no pack) and apps/design-system-demo/project.json (`serve` = ProjectReference; `serve-package` = pack + `-p:UseDesignSystemPackage=true`)
- [ ] T014 [US1] Document the loop and the package mode in README.md and docs/development/blazor.md

**Checkpoint**: edit → refresh works (SC-001).

---

## Phase 4: User Story 2 — Four themes with a live picker (P1)

**Goal**: Exact Angular Material themes; picker with radio + token-rendered swatch + name; no FOUC.
**Independent test**: quickstart §2.

- [ ] T015 [US2] Remove seed hex fields from apps/design-system-demo/Services/ThemeState.cs (`ThemeOption(Key, Name, IsDark)`)
- [ ] T016 [US2] Rewrite the theme picker in apps/design-system-demo/Shared/TopAppBar.razor with PBMenu/PBMenuItem (Role=menuitemradio), a radio indicator and a `data-theme`-scoped swatch showing primary/secondary/tertiary
- [ ] T017 [US2] Harden the boot script in apps/design-system-demo/App.razor (try/catch around storage; validate the key) and apps/design-system-demo/wwwroot/js/theme.js (single `select(theme)` call that applies and persists)
- [ ] T018 [US2] Restyle the demo shell in apps/design-system-demo/wwwroot/app.css and apps/design-system-demo/Layout/MainLayout.razor: tokens only; full-height sticky sidebar; drawer navigation ≤ 840px with a menu button; remove the `h1:focus` outline artifact; code samples use token colors

**Checkpoint**: 4 themes match exactly (SC-002) and switch live (SC-006).

---

## Phase 5: User Story 3 — Components match Angular Material (P1)

**Goal**: Every catalog component matches its Angular Material reference (contracts/components.md).
**Independent test**: quickstart §4; screenshots per page × 4 themes.

Each task covers the component's `.razor`/`.razor.cs`, its CSS file in
libs/design-system/blazor/wwwroot/styles/components/, and its demo page in
apps/design-system-demo/Pages/.

### Buttons

- [ ] T019 [P] [US3] PBButton (text/filled/tonal/outlined/elevated(protected)/icon/FAB/mini/extended; state layers; 40px height, 24/12/16px padding; touch target) in button.css, per button/_m3-button.scss, _m3-icon-button.scss, _m3-fab.scss
- [ ] T020 [P] [US3] PBButtonToggle/Group (40px, outline, secondary-container selected, checkmark, state layers; keep aria-pressed/aria-checked) in button-toggle.css, per _m3-button-toggle.scss

### Selection controls

- [ ] T021 [P] [US3] PBCheckbox (18px box, 40px state layer, checkmark/indeterminate SVG in currentColor, error/disabled) + Indeterminate in checkbox.css, per _m3-checkbox.scss
- [ ] T022 [P] [US3] PBRadioButton/PBRadioGroup (20px ring, 10px dot, 40px state layer) in radio.css, per _m3-radio.scss
- [ ] T023 [P] [US3] PBSlideToggle (52×32 track, 16/24/28px handle, check/close icons, full-track hit area) + HideIcon in slide-toggle.css, per _m3-slide-toggle.scss
- [ ] T024 [P] [US3] PBSlider (4px track, 20px handle, active fill via `--pb-slider-fill`, focus/hover halo) in slider.css, per _m3-slider.scss

### Form field family

- [ ] T025 [US3] PBFormField + PBInput (fill and outline appearances, floating label, 56px, activation indicator, hint/error, prefix/suffix) in form-field.css, per form-field/_m3-form-field.scss
- [ ] T026 [US3] New PBSelect<TValue>/PBOption<TValue> (trigger with arrow, listbox panel, keyboard, typeahead) in select.css + option.css; rewrite SelectDemo.razor and FormFieldDemo.razor
- [ ] T027 [US3] PBAutoComplete restyle onto the form field + shared option panel (removes the `rgb(65 95 145 / .08)` literal) in autocomplete.css
- [ ] T028 [P] [US3] PBDatepicker/PBTimepicker field shell with a trailing toggle icon button (`showPicker()`) in datepicker.css

### Containment

- [ ] T029 [P] [US3] PBCard + PBCardHeader/Content/Actions (elevated default, filled, outlined; 12px radius; 16px padding) in card.css, per _m3-card.scss
- [ ] T030 [P] [US3] PBDivider (Vertical, Inset) in divider.css
- [ ] T031 [P] [US3] PBExpansionPanel + PBAccordion (48/64px header, title-medium, indicator rotation, spacing when expanded) in expansion.css, per _m3-expansion.scss
- [ ] T032 [P] [US3] PBGridList + PBGridTile (Cols, RowHeight, Gutter, header/footer) in grid-list.css
- [ ] T033 [P] [US3] PBList + PBListItem (1/2/3-line 56/72/88px, leading/trailing, interactive state layers, no border) in list.css, per _m3-list.scss
- [ ] T034 [P] [US3] PBToolbar (64px, surface, title-large) in toolbar.css
- [ ] T035 [P] [US3] PBSidenav (Start/End, Over with scrim; surface-container-low container, extra-large end radius in over mode; Escape) in sidenav.css, per _m3-sidenav.scss

### Navigation

- [ ] T036 [P] [US3] PBTabs + PBTab (48px, title-small, 2px primary indicator, state layers, keyboard) in tabs.css, per _m3-tabs.scss
- [ ] T037 [P] [US3] PBStepper + PBStep (24px icons, primary selected/completed, connector lines, horizontal/vertical, keyboard) in stepper.css, per _m3-stepper.scss
- [ ] T038 [US3] PBMenu + PBMenuItem (surface-container, 4px radius, level-2 elevation, 48px items, arrow-key navigation, overlay positioning) in menu.css, per _m3-menu.scss
- [ ] T039 [P] [US3] PBPaginator (range label, page-size select, first/prev/next/last icon buttons) in paginator.css, per _m3-paginator.scss
- [ ] T040 [P] [US3] PBTree + PBTreeNode (48px nodes, 40px indent, toggle icon button, keyboard) in tree.css, per _m3-tree.scss

### Data

- [ ] T041 [P] [US3] PBTable (no forced tbody; 56px header / 52px rows, title-small header, body-medium cells, outline-variant dividers) in table.css, per _m3-table.scss
- [ ] T042 [P] [US3] PBSortHeader (Direction, animated arrow, hover preview) in sort.css, per _m3-sort.scss

### Communication

- [ ] T043 [P] [US3] PBBadge (M3 sizes: small 6px, medium/large 16px; error / on-error; overlay offsets) in badge.css, per _m3-badge.scss
- [ ] T044 [P] [US3] PBChips + PBChip (assist, filter, input; 32px, 8px radius, outline-variant, secondary-container selected, check and remove icons) in chips.css, per _m3-chips.scss
- [ ] T045 [P] [US3] PBProgressBar (4px, secondary-container track, M3 indeterminate animation, buffer dots) in progress-bar.css, per _m3-progress-bar.scss
- [ ] T046 [P] [US3] PBProgressSpinner (SVG arc, determinate/indeterminate, 4px stroke default) in progress-spinner.css, per _m3-progress-spinner.scss
- [ ] T047 [P] [US3] PBTooltip (inverse-surface, 4px radius, body-small, 4×8px padding, Position) in tooltip.css, per _m3-tooltip.scss
- [ ] T048 [P] [US3] PBSnackbar (Open, Duration, ActionLabel; inverse-surface, 4px radius, inverse-primary action; bottom center) in snackbar.css, per _m3-snack-bar.scss
- [ ] T049 [US3] PBDialog (Open, native modal dialog, 28px radius, surface-container-high, headline-small title, actions end) in dialog.css, per _m3-dialog.scss
- [ ] T050 [P] [US3] PBBottomSheet (surface-container-low, 28px top radius, drag handle) in bottom-sheet.css, per _m3-bottom-sheet.scss

### Foundation

- [ ] T051 [P] [US3] PBIcon (FontSet, 24px, aria-hidden or role=img), PBRipples (Centered/Unbounded/Disabled), PBCore in icon.css, ripple.css, core.css

**Checkpoint**: all 37 pages render and match in 4 themes.

---

## Phase 6: User Story 4 — No hardcoded colors, guaranteed (P2)

- [ ] T052 [US4] Run the audit, fix any remaining violations in libs/design-system/blazor and apps/design-system-demo, then switch the audit to build-failing mode in libs/design-system/blazor/Design.csproj
- [ ] T053 [US4] Prove the gate: add a literal color, confirm the build fails with file:line, then remove it

---

## Phase 7: User Story 5 — Offline and proxy-safe (P3)

- [ ] T054 [US5] Emit dist/css/icons.css + fonts and dist/css/fonts.css (roboto + icons) from libs/design-system/tokens/scripts/build-tokens.mts; remove the Google Fonts links from apps/design-system-demo/App.razor; update libs/design-system/blazor/README.md

---

## Phase 8: Polish & Cross-Cutting

- [ ] T055 Turn on `TreatWarningsAsErrors` in Directory.Build.props; fix all warnings (including AutocompleteDemo.razor CS8602)
- [ ] T056 Update the API reference and accessibility notes on each demo page to match contracts/components.md
- [ ] T057 Run quickstart.md end to end (build 0/0, audit 0, verify-demo 37×4) and review the screenshots
- [ ] T058 Remove the Sync Impact Report comment from .specify/memory/constitution.md; commit per family; push to feat/components

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → {US1, US2, US5} → US3 → US4 → Polish
- US1 has no dependency on the token work and can start right after Phase 1.
- US3 depends on T003–T006 (tokens, base CSS, JS) and on US1 (to see the results).
- US4's gate flip (T052) depends on US3 removing the legacy literals.
- US5 (T054) shares build-tokens.mts with T003. Do it right after T003.

## Parallel Opportunities

- T019–T024, T029–T037, T039–T048 and T050–T051 each touch separate component files and CSS files.
- T005 and T006 are parallel. T008 and T010 are parallel.

## Implementation Strategy

1. MVP = Phase 1 + 2 + US1: the user can finally see their edits.
2. Add US2: correct themes are visible everywhere at once.
3. Work through US3 family by family, committing and verifying each (screenshots ×4 themes).
4. Close with the US4 gate flip and polish.
