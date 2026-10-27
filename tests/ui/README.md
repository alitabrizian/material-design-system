# UI tests: Figma foundations, component screenshots and accessibility

Playwright tests for the Blazor docs, the Angular docs and the landing page, so a change to the
tokens (foundations) or to a component shows up as a failing test that says what changed, instead
of being noticed by eye later.

| Spec | What it checks |
| --- | --- |
| `tokens.spec.mts` | Every Foundation token in the design system Figma file (Color System, Numeric Tokens, Typography, Shadow, Motion, Icons) against the tokens package: each value on `:root` in all four themes, the docs' Fundamentals pages (`/typography`, `/colors`, `/scales`, `/shadow`), and that each alias color points at its Figma base color in `src/color-tokens.css`. |
| `visual.spec.mts` | One screenshot per docs example, preview area only (no code panel, no page chrome), named `<page>--<example-id>.png`. Each page's first example is shot again in the three other themes, and `/`, `/button` and `/data-grid` are shot whole at 360px wide. |
| `a11y.spec.mts` | axe-core with the WCAG 2.2 A and AA rules on every page, and color contrast again in each other theme. |

Pages come from each docs app's catalog (`Navigation/ComponentCatalog.cs`, `src/app/component-catalog.ts`)
and examples from its example index (the `<ExampleCard>`s of `Pages/*.razor`, read the same way as
`Navigation/ExampleIndex.cs`; `src/app/generated/page-examples.ts`), so a new page or example is
covered without editing the tests.

## Running

```bash
npm run test:ui                                # every site
UI_TARGETS=blazor-docs npm run test:ui         # one site: blazor-docs, angular-docs or landing
npm run test:ui -- tokens.spec                 # only the Figma foundation checks
npm run test:ui -- --grep "/button"            # pages whose title matches
npx playwright show-report dist/ui-tests/report   # diffs, traces and axe details of the last run
```

Sites that are already running (for example from `npm start`) are reused; otherwise
`tools/scripts/test-ui.mts` builds the tokens once and Playwright starts the dev servers. To test a
deployed site, or a server on another port, give its address: `BLAZOR_DOCS_URL`, `ANGULAR_DOCS_URL`,
`LANDING_URL`. `UI_WORKERS` sets the number of workers (default 2).

## When a test fails

- **A Figma token differs:** the message names the token, the theme, the Figma variable or style
  and both values, e.g. `--typography-display-2-line-height [rose-red] (Figma text style display-2
  line height (line-height/750)): expected 68px, got 56px`. Figma is the source of truth: fix the token
  in `libs/material-design-system/tokens/src/`. If the designer still has to confirm which side is
  right, add the token to `figma/known-mismatches.json` with the reason and an owner; it then must keep
  differing, and the test asks for the entry to be removed once it matches.
- **An example screenshot differs:** the HTML report shows the expected, actual and diff images of
  that example. If the change is intended, accept it with `npm run test:ui:update` and commit the new
  images with the change that caused them.
- **New accessibility violation:** the failure lists the rule, how many elements fail and the first
  few selectors; the full axe result is attached to the test in the report.

## Figma foundations

`figma/foundations.json` holds the expected values. It is generated, so the tests never read Figma:

1. Run `tools/figma/export-foundations.js` in the design system file (`vQU7lIKOIAZ63SnS9kOUzy`) through
   the Figma MCP `use_figma` tool (or a plugin console), once per `PART` (`base`, `alias`, `rest`; one
   call returns at most 20KB), and save each result as `figma/raw/<part>.json`. Figma's REST variables
   endpoint needs an Enterprise plan, which is why the export runs inside the file.
2. Values that are only annotations or frames (the Motion page, the icon buttons on the Icons page)
   are kept by hand in `figma/raw/pages.json`.
3. `node tools/scripts/sync-figma-foundations.mts` rebuilds `figma/foundations.json` (Figma names
   become the package's CSS names: `gray/50` is `--gray-50`).

The Layout page holds no tokens yet, and the Motion page gives no duration for the menu, so
`--motion-menu-duration` is not checked.

## Component token contracts (when the Figma component specs arrive)

The Figma file has no component pages yet: components are redesigned, with specs, in the last phase.
Until then the example screenshots guard them. When a component's Figma spec exists, add a token
contract for it in `tokens.spec.mts` (or a `contracts/` folder next to it):

- a locator for the component on its docs page (prefer `pb-*` classes or roles, one per site when the
  Blazor and Angular DOMs differ);
- per state (default, hover, keyboard focus, pressed, disabled, selected) the Figma token of each
  property: background, text and border color, border width and radius, shadow, typography, size and
  padding, state-layer opacity, motion;
- compare the computed value with a probe element styled `var(--token)` in the same theme scope, as
  `compareInPage` does, with `expect.soft` so one run lists every broken property, and a message that
  names the component, state, property and token.

Expected values come from the Figma spec, never from the component's current CSS, or the test only
mirrors the implementation.

## Baselines

- Screenshots are named per OS (`-win32`, `-linux`), because fonts render differently on each.
  Compare on the same OS the baselines were made on.
- `a11y-baseline/<site>.json` records the issues that already existed when the suite was adopted,
  per page: axe rule -> number of failing elements. A page fails only when it gains a rule or failing
  elements; fixing issues never fails it. `npm run test:ui:update` rewrites the entries of the pages it
  ran, so run it after fixing issues to lock the improvement in.
- `MASKS` in `fixtures.mts` hides parts of an example that change between runs (for example a picker
  that opens on today's date, which the Blazor docs compute on the server).
