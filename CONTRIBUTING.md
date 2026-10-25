# Contributing

This guide covers the conventions every change to the design system follows: how `pb-` CSS classes are
named, how a documentation page is built, and the checklist for adding a new component. The binding
rules behind it are in [`.specify/memory/constitution.md`](.specify/memory/constitution.md); the
layout of the workspace is in [`docs/architecture/design-system.md`](docs/architecture/design-system.md)
and the day-to-day Blazor loop in [`docs/development/blazor.md`](docs/development/blazor.md).

## Where changes go

| What you change | Where it lives | Repository |
| --- | --- | --- |
| Tokens, themes, fonts, icons | `libs/material-design-system/tokens` | `material-design-system` submodule |
| Blazor components | `libs/material-design-system/blazor` | same submodule |
| Angular components | `libs/material-design-system/angular` | same submodule |
| Blazor docs pages | `apps/blazor-design-system-docs` | `blazor-design-system-docs` submodule |
| Angular docs pages | `apps/angular-design-system-docs` | `angular-design-system-docs` submodule |
| Scripts, specs, workspace docs | `tools/`, `specs/`, `docs/`, root files | this workspace |

A change inside a submodule is committed and pushed there first, then the workspace commits the new
submodule pointer (see [Commits and branches](#commits-and-branches)).

## Tokens are internal, classes are public

Design tokens (`--md-sys-*`, `--md-ref-*` and the PartoBita foundation tokens such as `--space-*`,
`--radius-*`, `--typography-*`, `--background-*`, `--basic-shadow-*`, `--icon-size-*`) belong to the
tokens project. Library CSS consumes them; application developers do not.

- **Docs examples show classes, components and attributes, never token names.** A developer using the
  system sees `pb-*` classes, `PB*` / `pb-*` components and the `data-theme` / `data-product`
  attributes. If an example needs a value that only a token provides, the fix is a class (or a
  component parameter) in the library, not a `var(--…)` in the example.
- Foundation pages may describe the scale they show (sizes, weights, colors), but the snippet a reader
  copies is a class or a component.
- `--pb-<component>-<property>` custom properties are component internals (see below). They are not a
  public styling API and are not documented as one.

## `pb-` CSS class naming

The library uses BEM with double separators. Every class starts with `pb-`.

| Part | Pattern | Examples |
| --- | --- | --- |
| Block (component) | `pb-<component>`, kebab case | `pb-button`, `pb-card`, `pb-form-field`, `pb-list-item`, `pb-chip-set` |
| Sub-block | `pb-<component>-<part>` (a part that is a block of its own, styled and positioned separately) | `pb-bottom-sheet-backdrop`, `pb-snackbar-container`, `pb-step-header` |
| Element | `pb-<block>__<element>` | `pb-button__label`, `pb-card__header-text`, `pb-form-field__infix`, `pb-chip__remove` |
| Modifier: variant | `pb-<block>--<variant>` | `pb-button--filled`, `pb-button--fab-mini`, `pb-card--elevated`, `pb-icon--primary` |
| Modifier: state | `pb-<block>--<state>` | `pb-button--disabled`, `pb-select--open`, `pb-option--selected`, `pb-tab--active`, `pb-expansion-panel--expanded` |
| Element modifier | `pb-<block>__<element>--<modifier>` | `pb-button__icon--start`, `pb-form-field__label--required`, `pb-grid__cell--editing` |
| Shared utility | `pb-<purpose>`, in `blazor/wwwroot/styles/base.css` | `pb-state-layer`, `pb-interactive`, `pb-touch-target`, `pb-focus-visible`, `pb-visually-hidden`, `pb-icon-slot`, `pb-overlay`, `pb-backdrop`, `pb-font-mainfont`; the motion patterns `pb-motion-state`, `pb-motion-expand`, `pb-motion-move-in`, `pb-motion-instant` and `pb-scrim` live in `styles/motion.css` (same file in both libraries) |

Rules:

1. **Block name = component name.** `PBFormField` / `pb-form-field` styles `.pb-form-field`. Use the
   full name, not an abbreviation (`pb-form-field`, not `pb-field`).
2. **Elements use `__`, never a single hyphen.** A single hyphen after the block is reserved for a
   sub-block. If you are unsure, it is an element: `pb-chips__panel`, not `pb-chips-panel`.
3. **Variants and states use `--`.** Do not use `is-*` / `has-*` classes or single-hyphen variants
   (`pb-button-filled`).
4. **Prefer real attributes for state.** When a native attribute or ARIA state exists, set it and
   style it: `disabled`, `[aria-checked="true"]`, `[aria-expanded="true"]`, `[aria-disabled="true"]`.
   Add a `--state` modifier only for state that has no attribute (for example `pb-select--open` on the
   wrapper). Never use a class instead of the ARIA state assistive tech needs.
5. **`data-*` attributes are for theming only:** `data-theme="rose-red|azure-blue|magenta-violet|cyan-orange"`
   and `data-product="…"`. Do not add new `data-*` styling hooks for component state.
6. **Kebab case, lowercase, English.** No camelCase, no framework names (`pb-mat-…`) and no new
   selectors on `.mat-mdc-*` / `.mdc-*` internals; style the `pb-` class on the host instead.
7. **Reuse the shared utilities.** Interactive surfaces use `pb-interactive` + a `pb-state-layer`
   child (colored with `--pb-state-layer-color`), ripples use `pb-ripple-host`, and small hit targets
   get a `pb-touch-target` child. Do not re-implement hover, focus or pressed overlays per component.
8. **Same class names in Blazor and Angular.** The Angular wrapper sets the block class on its host
   (`host: { class: 'pb-button' }`) and uses the same elements and modifiers as the Blazor markup, so
   one stylesheet describes both.

### Component custom properties

A component-level custom property is named `--pb-<component>-<property>`
(`--pb-button-icon-offset`, `--pb-form-field-height`, `--pb-slider-active`, `--pb-tree-level`).
Shared ones drop the component: `--pb-state-layer-color`, `--pb-state-layer-hover-opacity`,
`--pb-ripple-color`. Add one only when a value is reused across states or parts of the component, or
when it mirrors an Angular Material `mat.<component>-overrides` knob. Its value must come from a token.

### Colors

Every `color`, `background`, `border-color`, `outline-color`, `fill`, `stroke`, shadow color and
`caret-color` comes from a token, directly or through `color-mix()` of tokens. Literal colors
(hex, `rgb()`, `hsl()`, named colors other than `transparent`, `currentColor`, `inherit`) are allowed
only in generated token files. `tools/scripts/audit-colors.mts` enforces this and fails the build.

### Known deviations

These exist in the code today. Do not copy them; fix them when you touch the file.

- `pb-chips-panel` next to `pb-chips__panel` (and the matching `--editor-width` modifiers): use the
  element form.
- `pb-field--block` next to `pb-form-field--block`: use the full block name.
- A few Blazor styles still target `.mat-mdc-*`, `.mdc-list-item--activated` or `.mat-typography`.
- `data-product="sarafid"` while the token family is `--brand-sarafeed-*`.
- The Typography page's section is titled "Tokens and text styles" and lists token names; under the
  class rule it should list the classes a developer applies.
- The Angular button page has no Accessibility section, while the Blazor pages have one.
- Blazor components are prefixed `PB` (`PBButton`) and Angular classes `Pb` (`PbButton`). Keep each
  library's own prefix; do not rename one to match the other in an unrelated change.

## Documentation pages

Both docs apps show the same pages with the same section order. The Blazor page is written first and
the Angular page mirrors it. There are no tabs; a page is one scrolling column.

### Section order

**Component page**

1. **Page header**: title and a short intro naming the component (`PBButton` / `pb-button`) and what
   it is for.
2. **Examples**: one `doc-section` per example. Each starts with a `field-hint` paragraph saying what
   the example shows, followed by one example card with the live demo and its code.
3. **API reference**: `<h2>API reference</h2>` and a `doc-table` of parameters (Blazor) or inputs
   (Angular) with Type and Description columns.
4. **Accessibility**: an `a11y-note` with the roles, ARIA states and keyboard behavior (see
   `specs/001-m3-angular-parity/contracts/components.md`). Every component page has one, in both apps.

**Foundation page** (Typography, Colors, Scales, Shadow, Icons, …)

1. **Page header**: title and intro.
2. **Styles**: the scale or palette, each row naming the class or component a developer uses.
3. **Guideline**: when to use what.

Foundation pages follow the class rule above: the table's copyable column is the class, not the token.

### Building blocks

| | Blazor docs | Angular docs |
| --- | --- | --- |
| Page file | `Pages/<Name>Demo.razor` (+ `.razor.cs`), `@page "/<path>"`, `@rendermode InteractiveServer` | `src/app/pages/<path>/<path>-page.ts` + `-page.html`, selector `docs-<path>-page` |
| Header | `<PageHeader Title="…">` (`Shared/PageHeader.razor`) | `<docs-page-header title="…">` (`shared/page-header`) |
| Example | `<ExampleCard Title="…" RazorCode="…" CSharpCode="…" CssCode="…">` (`Shared/ExampleCard.razor`) | `<docs-example title="…" page="<path>" id="<id>">` (`shared/example-card`) |
| Example code | Passed in the `RazorCode` / `CSharpCode` / `CssCode` parameters | Generated from the page files by `scripts/prepare.mts`; mark TS for one example with `// #region <id>` … `// #endregion` |
| Route | `@page` directive | lazy route in `src/app/app.routes.ts` with `title: '<Name> · Design System'` |
| Navigation | entry in `Navigation/ComponentCatalog.cs` (`Items` or `Fundamentals`) | entry in `src/app/component-catalog.ts` |

Page layout classes (from the docs apps' own CSS): `catalog-content` wraps the page; `doc-section`,
`field-hint`, `doc-table-wrapper` / `doc-table`, `a11y-note`, `demo-row` / `demo-stack` structure it.
The sidebar lists a page's examples automatically from its example card titles, so give every card a
short, unique title.

### Skeleton

Blazor (`Pages/ButtonDemo.razor`):

```razor
@page "/button"
@rendermode InteractiveServer
<PageTitle>Button · Design System</PageTitle>

<div class="catalog-content">
  <PageHeader Title="Button">Intro naming <code>PBButton</code> …</PageHeader>

  <section class="doc-section">
    <p class="field-hint">What this example shows.</p>
    <ExampleCard Title="Button overview"
                 RazorCode="@(@"<PBButton Variant=""PBButtonVariant.Filled"">Basic</PBButton>")">
      <PBButton Variant="PBButtonVariant.Filled">Basic</PBButton>
    </ExampleCard>
  </section>

  <section class="doc-section">
    <h2>API reference</h2>
    <div class="doc-table-wrapper">
      <table class="doc-table">
        <thead><tr><th>Property</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>…</tbody>
      </table>
    </div>
  </section>

  <section class="doc-section">
    <div class="a11y-note"><strong>Accessibility</strong> …</div>
  </section>
</div>
```

Angular (`pages/button/button-page.html`):

```html
<div class="catalog-content">
  <docs-page-header title="Button">Intro naming <code>pb-button</code> …</docs-page-header>

  <section class="doc-section">
    <p class="field-hint">What this example shows.</p>
    <docs-example title="Button overview" page="button" id="overview">
      <div class="demo-row"><pb-button variant="filled">Filled</pb-button></div>
    </docs-example>
  </section>

  <section class="doc-section">
    <h2>API reference</h2>
    <div class="doc-table-wrapper">
      <table class="doc-table">
        <thead><tr><th>Input</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>…</tbody>
      </table>
    </div>
  </section>

  <section class="doc-section">
    <div class="a11y-note"><strong>Accessibility</strong> …</div>
  </section>
</div>
```

### Writing examples

- Show what a consumer writes: components, their parameters or inputs, and `pb-` classes. No
  `var(--…)`, no inline colors, no `.mat-*` classes.
- Keep the demo and its code sample identical. In Blazor, update `RazorCode` whenever the live markup
  changes; in Angular the code comes from the page file, so nothing is copied by hand.
- Example card titles are the same in both apps, so the sidebars match.
- Docs CSS follows the same color rule as the library; the color audit scans the Blazor docs too.

## Checklist: a new component

Work through Spec Kit for anything larger than a small component
(`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`,
specs in `specs/NNN-name/`).

**Reference and design**

- [ ] Find the Angular Material reference: `@angular/material/<component>/_m3-<component>.scss` and
      its structural styles. Every size, color role, shape, elevation, motion value and state-layer
      opacity is traceable to it, or the gap and the chosen fallback are written in the spec.
- [ ] Use foundation values (space, radius, stroke, typography, shadow, icon size) where the design
      calls for them; never invent a value.
- [ ] Decide the class map before writing CSS: block, elements, variant and state modifiers, per the
      naming rules above.
- [ ] Write down the roles, ARIA states and keyboard model (match Angular Material / CDK) in
      `contracts/components.md` or the feature spec.

**Blazor library** (`libs/material-design-system/blazor`)

- [ ] `Components/PB<Name>.razor` (markup) and `PB<Name>.razor.cs` (partial class with `[Parameter]`s
      and enums such as `PB<Name>Variant`). Larger components get a folder (`Components/<Name>/`).
- [ ] Inherit `WorkspaceComponentBase` (or `WorkspaceFieldComponentBase` for form fields), so
      `class` is appended and extra attributes are splatted onto the main element.
- [ ] `wwwroot/styles/components/<name>.css`, with a header comment citing the Angular Material
      source, registered with `@import` in `wwwroot/design-system.css`.
- [ ] Interactive parts use `pb-interactive` + `pb-state-layer`; ripples use `pb-ripple-host`;
      every interactive element shows a visible focus indicator; disabled uses the M3 38% / 12%
      opacities; the hit target covers the whole visual control.

**Angular library** (`libs/material-design-system/angular`)

- [ ] `src/lib/<name>/<name>.ts`, `.html`, `.css`: standalone component, `selector: 'pb-<name>'`,
      `host: { class: 'pb-<name>' }`, signal `input()`s, class `Pb<Name>`.
- [ ] Same class names and variants as Blazor, and the same parameter names where the frameworks allow.
- [ ] Exported from `src/public-api.ts`. Shared helpers go in `src/lib/core`.

**Docs** (both apps)

- [ ] Blazor page `Pages/<Name>Demo.razor` and catalog entry in `Navigation/ComponentCatalog.cs`
      (name, route, screenshot scene in `wwwroot/assets/screenshots`, summary).
- [ ] Angular page `src/app/pages/<name>/<name>-page.{ts,html}`, lazy route in `app.routes.ts`, and
      entry in `src/app/component-catalog.ts`.
- [ ] Sections in order: header, examples, API reference, accessibility. Examples show classes and
      components only, no tokens.

**Verify before done**

- [ ] `npx nx run design-tokens:build` if tokens changed.
- [ ] `dotnet build DesignSystem.sln`: 0 errors, 0 warnings (warnings are errors), color audit passes
      (`npx nx run design-system-blazor:lint`).
- [ ] `npx nx run design-system-angular:build` and `npx nx run angular-design-system-docs:build`.
- [ ] With the Blazor docs running (`npx nx run blazor-design-system-docs:serve`), run
      `npx nx run blazor-design-system-docs:verify`: every page in all four themes, no page errors,
      no horizontal overflow at 360px, icon fonts render.
- [ ] Review the screenshots in all four themes, and exercise keyboard and pointer behavior in a real
      browser, in both docs apps.

## Commits and branches

- Commit messages use Conventional Commits: `type(scope): lowercase sentence`. Types: `feat`, `fix`,
  `docs`, `refactor`, `chore`. The scope is the component or area (`button`, `datepicker`, `tokens`,
  `docs`, `typography`). Examples: `feat(datepicker): Persian calendar uses the Foundation font`,
  `docs(colors): mirror the Colors page`.
- Angular docs commits that copy a Blazor page say so: `docs(<scope>): mirror the Blazor … examples`.
- Branches are `feat/<topic>` or `docs/<topic>`, with the same name in every submodule a feature
  touches. Branches are merged into `master` with a merge commit.
- After the submodule commits are on `master`, the workspace commits the pointer move:
  `chore: point the Blazor docs at the <change> commit on master`.
- Changes to this workspace go through a pull request on GitHub.
