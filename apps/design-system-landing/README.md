# Design system landing page (Nx project: `design-system-landing`)

The front page for the PartoBita design systems, laid out after devexpress.com: a headline band with one
card per framework (Angular, Blazor, React, Svelte), feature tiles, per-platform bands, popular
components, the type scale and a link footer. Each card and link opens that framework's docs site.

It is plain HTML, CSS and JavaScript with no bundler, styled only with `@partobita/design-tokens`
(color roles, the Yekan Bakh `--typography-*` styles, shape, elevation, spacing and motion), in Persian
and right-to-left. The theme picker switches between the four token themes. Unlike the other apps, it
lives in the workspace repository itself rather than in a submodule.

```bash
npm run landing                               # = npx nx run design-system-landing:serve, http://127.0.0.1:4300
npx nx run design-system-landing:build        # static site in dist/apps/design-system-landing
```

Both build the tokens first. The dev server (`tools/scripts/dev-design-system-landing.mts`) serves
`src/` and the tokens package's `dist/` as `/tokens/`; the build copies both into one folder.

## Docs addresses

`src/docs-links.json` maps each framework to its docs site; `null` shows the card as "coming soon"
(React and Svelte, until their design systems exist). The defaults are the local dev servers:
Angular docs `http://localhost:4200` (`npm run docs:angular`) and Blazor docs `http://127.0.0.1:5080`
(`npm run docs`). Environment variables override them for the dev server and the build:

| Variable | Framework |
| --- | --- |
| `LANDING_ANGULAR_DOCS_URL` | Angular |
| `LANDING_BLAZOR_DOCS_URL` | Blazor |
| `LANDING_REACT_DOCS_URL` | React |
| `LANDING_SVELTE_DOCS_URL` | Svelte |

An empty value turns a framework back to "coming soon". Component links append the docs route
(`/data-grid`, `/typography`, ...), which is the same in the Angular and Blazor docs.
