# Data Model: Angular Material M3 Parity

## Theme

| Field | Type | Rules |
|-------|------|-------|
| `key` | `rose-red` \| `azure-blue` \| `magenta-violet` \| `cyan-orange` | Unique; used as `data-theme` value and storage value |
| `name` | string | "Rose & Red", "Azure & Blue", "Magenta & Violet", "Cyan & Orange" |
| `mode` | `light` \| `dark` | rose-red/azure-blue light; magenta-violet/cyan-orange dark; emitted as `color-scheme` |
| `colors` | map role → hex | Exactly the `--mat-sys-*` color roles of the prebuilt theme with the same key (50 roles, see contracts/tokens.md) |

- Default: `rose-red`. Any unknown stored value falls back to it.
- State transitions: `current → selected` on picker click (applied immediately, persisted). There is no
  other state.

## System token (theme-independent)

| Category | Source (`--mat-sys-*`) | Emitted as |
|----------|------------------------|------------|
| Typescale | `display/headline/title/body/label-{large,medium,small}{,-font,-size,-line-height,-weight,-tracking}` | `--md-sys-typescale-<role>-<prop>` + shorthand `--md-sys-typescale-<role>` |
| Shape | `corner-*` | `--md-sys-shape-corner-*` |
| Elevation | `level0..5` | `--md-sys-elevation-level-0..5` |
| State | `{hover,focus,pressed,dragged}-state-layer-opacity` | `--md-sys-state-*-state-layer-opacity` |
| Motion, spacing | not in prebuilt (hand-authored, M3 spec) | `--md-sys-motion-*`, `--md-sys-spacing-*` |

Validation: the build fails if theme-independent values differ between the four prebuilt files, or if
any role expected by `contracts/tokens.md` is missing.

## Component

A catalog entry (`ComponentCatalog.Items`) with a route, a demo page, one CSS file
(`styles/components/<name>.css`) and one or more Razor components. Its states (enabled, hover,
focus-visible, pressed, disabled, selected/checked, error, open/expanded) are documented per component in
`contracts/components.md`.
