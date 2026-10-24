# UI tests: visual regression and accessibility

Playwright tests that open every page of the Blazor docs, the Angular docs and the landing page, so a
change to the tokens (foundations) or to a component shows up as a failing test instead of being
noticed by eye later.

| Spec | What it checks |
| --- | --- |
| `visual.spec.mts` | A full-page screenshot of every page in the default theme (Rose & Red), five pages in each other theme, and three pages at 360px wide, compared with the committed baselines under `__screenshots__/<site>/`. |
| `a11y.spec.mts` | axe-core with the WCAG 2.2 A and AA rules on every page, and color contrast again in each other theme. |

Pages come from each docs app's catalog (`Navigation/ComponentCatalog.cs`, `src/app/component-catalog.ts`),
the same list as its navigation, so a new component page is covered without editing the tests.

## Running

```bash
npm run test:ui                                # every site
UI_TARGETS=blazor-docs npm run test:ui         # one site: blazor-docs, angular-docs or landing
npm run test:ui -- --grep "/button"            # pages whose title matches
npm run test:ui -- visual.spec                 # only the screenshots
npx playwright show-report dist/ui-tests/report   # diffs, traces and axe details of the last run
```

Sites that are already running (for example from `npm start`) are reused; otherwise
`tools/scripts/test-ui.mts` builds the tokens once and Playwright starts the dev servers. To test a
deployed site instead, give its address: `BLAZOR_DOCS_URL`, `ANGULAR_DOCS_URL`, `LANDING_URL`.

## When a test fails

- **Screenshot differs:** the HTML report shows the expected, actual and diff images. If the change
  is intended, accept it with `npm run test:ui:update` and commit the new images with the change that
  caused them.
- **New accessibility violation:** the failure lists the rule, how many elements fail and the first
  few selectors; the full axe result is attached to the test in the report.

## Baselines

- Screenshots are named per OS (`-win32`, `-linux`), because fonts render differently on each.
  Compare on the same OS the baselines were made on.
- `a11y-baseline/<site>.json` records the issues that already existed when the suite was adopted,
  per page: axe rule -> number of failing elements. A page fails only when it gains a rule or failing
  elements; fixing issues never fails it. `npm run test:ui:update` rewrites the entries of the pages it
  ran, so run it after fixing issues to lock the improvement in.
- `MASKS` in `fixtures.mts` hides parts of a page that change between runs (for example a picker that
  opens on today's date, which the Blazor docs compute on the server).
