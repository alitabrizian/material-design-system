# Contract: Design tokens (CSS custom properties)

Consumers link, in order:

```html
<link rel="stylesheet" href="_content/PartoBita.DesignSystem.Blazor/css/fonts.css" />   <!-- Roboto + icon fonts -->
<link rel="stylesheet" href="_content/PartoBita.DesignSystem.Blazor/css/tokens.css" />  <!-- all --md-sys-* -->
<link rel="stylesheet" href="_content/PartoBita.DesignSystem.Blazor/design-system.css" />
<script type="module" src="_content/PartoBita.DesignSystem.Blazor/design-system.js"></script>
```

`roboto.css`, `icons.css` and `material-tokens.css` remain as individual files for compatibility.
`tokens.css` includes the content of `material-tokens.css`.

## Theme selection

- `<html data-theme="rose-red|azure-blue|magenta-violet|cyan-orange">`. With no attribute, `:root`
  gets rose-red.
- Any element may carry `data-theme` to re-scope all color roles for its subtree (used by the picker
  swatches).
- Each theme block sets `color-scheme`.

## Color roles (`--md-sys-color-<role>`)

background, on-background, surface, surface-dim, surface-bright, surface-container-lowest,
surface-container-low, surface-container, surface-container-high, surface-container-highest,
surface-variant, on-surface, on-surface-variant, surface-tint, inverse-surface, inverse-on-surface,
inverse-primary, primary, on-primary, primary-container, on-primary-container, primary-fixed,
primary-fixed-dim, on-primary-fixed, on-primary-fixed-variant, secondary, on-secondary,
secondary-container, on-secondary-container, secondary-fixed, secondary-fixed-dim, on-secondary-fixed,
on-secondary-fixed-variant, tertiary, on-tertiary, tertiary-container, on-tertiary-container,
tertiary-fixed, tertiary-fixed-dim, on-tertiary-fixed, on-tertiary-fixed-variant, error, on-error,
error-container, on-error-container, outline, outline-variant, scrim, shadow, neutral10,
neutral-variant20.

Hand-authored per theme (not in the prebuilt themes): `--md-ref-palette-neutral99`, neutral tone 99 of
the theme's primary palette (`core/theming/_palettes.scss`). The theme picker previews use it as the
light themes' background, like Angular Material's docs theme picker.

## Other system tokens

- `--md-sys-typescale-font-family`, and per role `R` in {display,headline,title,body,label}×{large,medium,small}:
  `--md-sys-typescale-R` (font shorthand), `-font`, `-size`, `-line-height`, `-weight`, `-tracking`
- `--md-sys-shape-corner-{none,extra-small,extra-small-top,small,medium,large,large-top,large-start,large-end,extra-large,extra-large-top,full}`
- `--md-sys-elevation-level-{0..5}`
- `--md-sys-state-{hover,focus,pressed,dragged}-state-layer-opacity`
- `--md-sys-motion-duration-*`, `--md-sys-motion-easing-*` (M3 spec), `--md-sys-spacing-*`

Names that existed before this feature are preserved.
