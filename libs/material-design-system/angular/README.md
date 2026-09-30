# @partobita/design-system-angular (Nx project: `design-system-angular`)

The PartoBita Material 3 design system for Angular 22: `pb-*` components with the same API as the
Blazor library (`PartoBita.DesignSystem.Blazor`), built on Angular Material 22.2 and themed entirely by
[`@partobita/design-tokens`](../tokens/README.md). Packaged with ng-packagr.

```
@partobita/design-tokens ──► styles/design-system.css ──► Angular Material (--mat-sys-*) ──► pb-* components
```

## Install

```bash
npm install @partobita/design-system-angular @angular/material @angular/cdk
```

`@partobita/design-tokens` comes with it as a dependency. Then add the global stylesheet once in
`angular.json`:

```json
"styles": ["@partobita/design-system-angular/styles/design-system.css", "src/styles.css"]
```

That stylesheet loads the self-hosted Roboto and icon fonts, the design tokens (four themes) and
`angular-material.css`, which binds every `--mat-sys-*` variable to a token. Don't add a prebuilt
Angular Material theme or Google Fonts links.

## Themes

Set `data-theme` on `<html>` (`rose-red` is the default, then `azure-blue`, `magenta-violet` and
`cyan-orange`), or switch at runtime:

```ts
inject(PbThemeService).set('azure-blue');
```

Any element can carry its own `data-theme` to re-theme just its subtree.

## Components

Every component is standalone: import the ones you use.

| Blazor | Angular | Notes |
| --- | --- | --- |
| `PBButton` | `pb-button` | `variant`: text, filled, tonal, outlined, elevated, icon, fab, mini-fab, extended-fab; `href`, `iconStart`/`iconEnd`, `disabledInteractive`, `showProgress` |
| `PBButtonToggleGroup` / `PBButtonToggle` | `pb-button-toggle-group` / `pb-button-toggle` | `[(value)]`, or `multiple` + `[(values)]` |
| `PBBadge` | `[pbBadge]` | directive on any element |
| `PBCard` (+ Header, Content, Actions) | `pb-card`, `pb-card-header`, `pb-card-content`, `pb-card-actions` | `variant`: elevated, filled, outlined; `[pbCardAvatar]` in the header |
| `PBCheckbox`, `PBSlideToggle` | `pb-checkbox`, `pb-slide-toggle` | `[(checked)]` |
| `PBChips` / `PBChip` | `pb-chips` / `pb-chip` | `variant`: assist, filter (`[(selected)]`), input (`(removed)`) |
| `PBDatepicker`, `PBTimepicker` | `pb-datepicker`, `pb-timepicker` | `[(value)]: Date \| null`, native Date adapter |
| `PBDialog` | `pb-dialog` | `[(open)]`, `title`, `[pbDialogActions]` content |
| `PBDivider` | `pb-divider` | `vertical`, `inset` |
| `PBAccordion` / `PBExpansionPanel` | `pb-accordion` / `pb-expansion-panel` | `[(expanded)]`, `[pbPanelActions]` with `hasActions` |
| `PBGridList` / `PBGridTile` | `pb-grid-list` / `pb-grid-tile` | |
| `PBIcon` | `pb-icon` | `fontSet`: icons, symbols; `color` |
| `PBInput` | `pb-input` | `[pbPrefix]` / `[pbSuffix]` content |
| `PBAutoComplete` | `pb-autocomplete` | suggests the `pb-option` children the `filter` accepts; `autoActiveFirstOption`, `requireSelection` |
| `PBSelect` / `PBOption` | `pb-select` / `pb-option` | |
| `PBList` / `PBListItem` | `pb-list` / `pb-list-item` | a nav list when an item has `href` |
| `PBMenu` / `PBMenuItem` | `pb-menu` / `pb-menu-item` | own trigger: `triggerVariant`, `triggerLabel`, `triggerIcon` |
| `PBPaginator` | `pb-paginator` | `[(pageIndex)]`, `[(pageSize)]`, label inputs |
| `PBProgressBar`, `PBProgressSpinner` | `pb-progress-bar`, `pb-progress-spinner` | |
| `PBRadioGroup` / `PBRadioButton` | `pb-radio-group` / `pb-radio-button` | `vertical` |
| `PBRipples` | `[pbRipple]` | directive |
| `PBSidenav` | `pb-sidenav` | `[pbSidenavPanel]` content is the drawer |
| `PBSlider` | `pb-slider` | `discrete`, `showTickMarks` |
| `PBSnackbar` | `pb-snackbar` | `[(open)]`, `actionLabel`, `(action)` |
| `PBBottomSheet` | `pb-bottom-sheet` | `[(open)]`, `(dismissed)` |
| `PBStepper` | `pb-stepper` / `pb-step` | `pbStepperNext` / `pbStepperPrevious` / `pbStepperReset` buttons |
| `PBTable` / `PBSortHeader` | `pb-table` | `columns` (`sortable`), `data`, `pageSize`, `<ng-template pbCell="key" let-row>` |
| `PBTabs` | `pb-tabs` / `pb-tab` | `[(selectedIndex)]`, `stretch`, `align`; tab `icon` |
| `PBToolbar` | `pb-toolbar` | |
| `PBTooltip` | `[pbTooltip]` | directive |
| `PBTree` / `PBTreeNode` | `pb-tree` | data-driven: `[nodes]` of `PbTreeNode` |

Form controls (`pb-input`, `pb-select`, `pb-autocomplete`, `pb-datepicker`, `pb-timepicker`,
`pb-checkbox`, `pb-slide-toggle`, `pb-radio-group`, `pb-button-toggle-group`, `pb-slider`) support both
two-way signal binding (`[(value)]`, like Blazor's `Value`/`ValueChanged`) and Angular forms
(`ngModel`, `formControl`). Field controls also take `label`, `supportingText`, `errorText` (shown in
place of the supporting text, and puts the field in its error state), `appearance` (fill, outline),
`required` and `block` (full width).

### Why containers take `pb-*` children

Angular Material containers (`mat-select`, `mat-tab-group`, `mat-radio-group`, ...) find their children
with content queries, which can't see through a wrapper's `<ng-content>`. So each PB container collects
its PB children (`pb-option`, `pb-tab`, ...) and renders the matching `mat-*` child itself. That's why
`<pb-select>` needs `<pb-option>` rather than `<mat-option>`.

## Build

```bash
npx nx run design-system-angular:build   # ng-packagr -> dist/libs/material-design-system/angular
```

`apps/angular-design-system-docs` is the Angular docs site: the same layout, pages and examples as the
Blazor docs (`apps/blazor-design-system-docs`), one page component per library component, each example with
a "show code" view of its real markup and code:

```bash
npx nx run angular-design-system-docs:serve   # http://localhost:4200
```

## Source layout

One folder per component under `src/lib/`, named like the Blazor component, with the class in `.ts`,
the template in `.html` and styles in `.css` (shared ones in `src/lib/core/`).
