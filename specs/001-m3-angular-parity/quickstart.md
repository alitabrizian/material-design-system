# Quickstart: validate the feature

## Prerequisites

.NET 8 SDK, Node 22, `npm ci` at the repository root.

## 1. Dev loop (US1)

```bash
npx nx run pb-design-system-docs:serve      # or: node tools/scripts/dev-pb-design-system-docs.mts
```

1. Open http://127.0.0.1:5080/button.
2. In `libs/design-system/blazor/wwwroot/styles/components/button.css`, change the filled button's
   `background` role to `var(--md-sys-color-tertiary)` and save.
3. Refresh the browser: filled buttons turn tertiary. Revert, refresh: primary again.

Expected: works 10/10 times, with no pack, cache clear or restart.

Package verification (opt-in):

```bash
npx nx run pb-design-system-docs:serve-package   # packs, evicts cache, runs demo against the nupkg
```

## 2. Themes (US2)

- Open the palette menu in the top bar and pick each theme. The page recolors immediately.
- Reload: the theme persists and there is no flash of Rose & Red.
- `node tools/scripts/verify-demo.mts --tokens` compares computed `--md-sys-color-*` on `<html>` for each
  theme with the vendored prebuilt CSS. Expected: 0 mismatches.

## 3. Colors (US4)

```bash
node tools/scripts/audit-colors.mts        # expected: "0 violations"
```

Add `color: #123456;` to any component CSS and run `dotnet build`. Expected: the build fails with
`file:line`.

## 4. Components (US3) and offline icons (US5)

```bash
dotnet build DesignSystem.sln -warnaserror      # 0 warnings, 0 errors
node tools/scripts/verify-demo.mts              # 37 pages × 4 themes screenshots in .verify/,
                                                # fails on page errors, horizontal overflow at 360px,
                                                # or icon ligature text (unrendered icon font)
```

Review the screenshots against Angular Material's component docs.
