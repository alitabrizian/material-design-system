# Feature Specification: Angular Material M3 Parity

**Feature Branch**: `feat/components`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "Angular Material M3 parity for the PartoBita Blazor design system. Make all 37
catalog components look and behave like Angular Material v22 M3; implement the four Angular Material
themes (Rose & Red default light, Azure & Blue light, Magenta & Violet dark, Cyan & Orange dark) with exact
prebuilt-theme colors and a live theme picker (radio + swatch + label); eliminate every hardcoded color in
library and demo, enforced by an audit; permanently fix 'CSS change does not appear after refresh'; self-host
icon fonts; keep known fixes (slide toggle full-track hit area, button toggle pressed state, NuGet cache
eviction); accessible and responsive."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Style edits show up on refresh (Priority: P1)

A design-system developer changes a component's stylesheet or markup in the library, refreshes the
browser showing the demo, and immediately sees the change: no repacking, no cache clearing, no restarting
stale servers.

**Why this priority**: Every other story depends on being able to see changes. This problem blocked all
previous attempts.

**Independent Test**: Start the demo with the documented command, change one color token reference in a
component stylesheet, refresh, and confirm that the computed style changed. Undo it and confirm it
reverts.

**Acceptance Scenarios**:

1. **Given** the demo is running with the documented dev command, **When** a library stylesheet is edited
   and saved, **Then** a normal browser refresh shows the new style.
2. **Given** a library component's markup or code is edited, **When** the dev command's hot reload or an
   automatic rebuild completes, **Then** the new markup is rendered without manual cache clearing.
3. **Given** a fresh clone, **When** the documented setup commands run, **Then** the solution restores and
   builds without manual folder creation.
4. **Given** a developer explicitly wants to verify the packaged library, **When** they use the package
   verification mode, **Then** the demo consumes a freshly packed copy, never a stale cached one.

---

### User Story 2 - Four Angular Material themes with a live picker (Priority: P1)

An app user opens the theme picker in the top bar, sees the four themes (each with a radio indicator, a
color swatch and a name), picks one, and the whole app recolors instantly. The choice persists across
reloads with no flash of the default theme.

**Why this priority**: Themes are the visible proof that all colors derive from the palette.

**Independent Test**: Choose each of the four themes and compare the primary, surface and outline colors
against Angular Material's published values for that theme; reload and confirm persistence.

**Acceptance Scenarios**:

1. **Given** a first visit with no saved choice, **When** the app loads, **Then** Rose & Red is active.
2. **Given** the picker is open, **When** a theme is chosen, **Then** every component and the app shell
   recolor without a reload and the picker marks that theme as selected.
3. **Given** a saved theme, **When** the page reloads, **Then** that theme is applied before the first paint.
4. **Given** any theme, **When** the page's color roles are inspected, **Then** they equal the values of
   Angular Material's prebuilt theme with the same name.

---

### User Story 3 - Components match Angular Material (Priority: P1)

A product team replacing Angular Material screens with Blazor places each of the 37 catalog components
next to its Angular Material counterpart and cannot tell them apart in size, shape, color, typography,
state feedback (hover, focus, pressed, disabled, selected, error) or behavior.

**Why this priority**: This is the product goal. Stories 1 and 2 enable it.

**Independent Test**: For each component page, compare screenshots in all four themes against Angular
Material's reference dimensions and colors, and exercise keyboard and pointer interaction.

**Acceptance Scenarios**:

1. **Given** any component, **When** it is rendered in its default configuration, **Then** its height,
   padding, corner radius, typography role and color roles equal Angular Material's M3 defaults.
2. **Given** an interactive component, **When** it is hovered, focused or pressed, **Then** it shows the M3
   state layer in the correct color at 8%, 12% or 12% opacity respectively.
3. **Given** a disabled component, **When** it is rendered, **Then** content uses 38% and containers use 12%
   of the on-surface color, and it cannot be activated.
4. **Given** a slide toggle, **When** any point on its track is clicked, **Then** it toggles.
5. **Given** a button toggle, **When** it is selected, **Then** its pressed/checked state is exposed to
   assistive technology and shown with the tonal fill.
6. **Given** a component page at 360px wide, **When** it is viewed, **Then** nothing overflows horizontally.

---

### User Story 4 - No hardcoded colors, guaranteed (Priority: P2)

A maintainer adds or edits styles. If they type a literal color anywhere outside the generated token files,
the build fails and tells them the file and line.

**Why this priority**: Prevents regressions like the beige autocomplete panel. It depends on stories 2 and 3
having removed the existing violations.

**Independent Test**: Insert a literal color into a component stylesheet, run the build, and see it fail
naming the location. Remove it and the build passes.

**Acceptance Scenarios**:

1. **Given** the current codebase, **When** the color audit runs, **Then** it reports zero violations.
2. **Given** a new literal color in library or demo styles or markup, **When** the build runs, **Then** it
   fails and names the file and line.

---

### User Story 5 - Work runs offline and behind corporate proxies (Priority: P3)

The demo and consuming apps render icons and text correctly without reaching any external font CDN.

**Independent Test**: Load a page with external network access blocked. Icons render as glyphs, not as
ligature words such as "more_vert".

**Acceptance Scenarios**:

1. **Given** no access to external font hosts, **When** a page with icons loads, **Then** icons render as
   glyphs.

### Edge Cases

- A stored theme key that no longer exists (or corrupted storage) falls back to Rose & Red.
- Storage that is unavailable (private mode) still allows switching. Only persistence is lost.
- Long labels in buttons, chips, tabs and menu items truncate or wrap like Angular Material, with no
  overflow at 360px.
- Overlays (menu, select, autocomplete, tooltip) opened near the viewport edge remain visible.
- Components nested inside a differently themed container still read tokens from their nearest theme scope.
- Disabled plus selected states (checkbox, radio, toggle, chip) use the disabled colors, not the selected
  colors.

## Requirements *(mandatory)*

### Functional Requirements

**Dev loop**

- **FR-001**: The demo MUST reference the library from source during development, so saved library
  stylesheet edits are served on the next refresh.
- **FR-002**: The documented dev command MUST rebuild or hot-reload library markup and code changes without
  manual cache clearing.
- **FR-003**: A fresh clone MUST restore and build with the documented commands only.
- **FR-004**: A package-verification mode MUST exist that always consumes a freshly packed library.
  Stale-cache eviction MUST live in the pack step itself.
- **FR-005**: In development, static assets MUST be served with revalidation headers, so browsers never
  serve stale styles.

**Themes**

- **FR-010**: Exactly four themes MUST exist: rose-red (default, light), azure-blue (light), magenta-violet
  (dark), cyan-orange (dark).
- **FR-011**: Each theme's color roles MUST equal those of Angular Material's prebuilt theme of the same
  name. This includes the fixed, fixed-dim, surface-dim, surface-bright and surface-tint roles.
- **FR-012**: Typography, shape, elevation and state-layer tokens MUST equal Angular Material's system
  tokens.
- **FR-013**: The theme picker MUST list each theme with a radio indicator, a swatch rendered from that
  theme's own tokens, and its name. Selecting a theme MUST apply it immediately and persist it.
- **FR-014**: The saved theme MUST be applied before the first paint. Invalid saved values MUST fall back to
  the default.
- **FR-015**: Dark themes MUST set the page's color scheme to dark, so native scrollbars and form controls
  match.

**Components**

- **FR-020**: Each of the 37 catalog components MUST match Angular Material's M3 default dimensions, shape,
  typography, color roles and state layers, as defined in Angular Material's component token maps.
- **FR-021**: Interactive states (hover 8%, focus 12%, pressed 12%, dragged 16%) MUST be rendered as state
  layers using the component's state-layer color role.
- **FR-022**: Disabled states MUST use 38% content and 12% container opacity of on-surface.
- **FR-023**: Keyboard interaction MUST match Angular Material / CDK for each component type (roving focus in
  groups, Escape closes overlays, arrow keys in menus, lists, tabs, radio groups and sliders).
- **FR-024**: The slide toggle MUST toggle on a click anywhere on its track or label.
- **FR-025**: The button toggle MUST expose its selected state (`aria-pressed` or `aria-checked`) and show the
  secondary-container fill with a checkmark indicator.
- **FR-026**: Every interactive element MUST show a visible focus indicator on keyboard focus.
- **FR-027**: Existing public component parameters used by the demo MUST keep working, or the demo MUST be
  updated in the same change.

**Colors**

- **FR-030**: No color literal MAY appear in library or demo stylesheets or markup outside the generated
  token files.
- **FR-031**: An automated color audit MUST run with the library build and fail it on violations, reporting
  file and line.
- **FR-032**: The demo shell (sidebar, top bar, docs pages, code samples) MUST also be themed from tokens.

**Assets**

- **FR-040**: Roboto, Material Icons and Material Symbols Outlined MUST ship with the tokens package. No
  runtime external font requests MAY be made.

**Responsiveness**

- **FR-050**: The demo shell and all component pages MUST be usable from 360px wide, with a collapsible
  navigation on narrow screens.

### Key Entities

- **Theme**: key, display name, light/dark mode, full set of color-role values.
- **System token**: named design value (color role, typescale role, shape, elevation, motion, state
  opacity) shared by all components.
- **Component**: catalog entry with markup, styles, parameters, states and a demo page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A library stylesheet edit is visible in the browser within 5 seconds of saving, on a plain
  refresh, in 10 out of 10 attempts.
- **SC-002**: For all 4 themes, 100% of the color roles match Angular Material's prebuilt theme values
  exactly.
- **SC-003**: The color audit reports 0 violations across library and demo.
- **SC-004**: The solution builds with 0 errors and 0 warnings.
- **SC-005**: All 37 component pages render in all 4 themes (148 screenshots) with no script errors and no
  horizontal overflow at 360px.
- **SC-006**: Theme switching recolors the page in under 100 ms, with no reload.
- **SC-007**: All interactive components can be operated with the keyboard alone.

## Assumptions

- "Angular Material" means the latest published release at implementation time (22.2.0). Its prebuilt
  theme CSS and M3 component token maps are the reference.
- The theme picker follows Angular Material's documentation site pattern: a palette icon button opens a
  menu of radio items, each with a swatch and a label. The reference image mentioned by the user was not
  available in this session, so this pattern is the default.
- The token prefix stays `--md-sys-*` (existing convention, compatible with Material Web). Values mirror
  Angular Material's `--mat-sys-*`.
- Components that Angular Material implements with overlays (menu, select, autocomplete, datepicker,
  timepicker, tooltip, dialog, bottom sheet, snackbar) may keep native or simplified overlay mechanics in
  Blazor, as long as the visual result and keyboard behavior match.
- The Datepicker and Timepicker keep native date and time inputs inside an M3 form field. Full custom
  calendar and clock popups are out of scope for this feature.
- Ripples keep the existing pointer-positioned implementation, restyled to Angular Material's ripple color
  and timing.
