# Design system landing page (Nx project: `design-system-landing`)

The front page for the PartoBita design systems, laid out after devexpress.com: a headline band with one
card per framework (Angular, Blazor, React, Svelte), feature tiles, per-platform bands, popular
components, the type scale and a link footer. Each card and link opens that framework's docs site.

It is plain HTML, CSS and JavaScript with no bundler, styled only with `@partobita/design-tokens`
(color roles, the Yekan Bakh `--typography-*` styles, shape, elevation, spacing and motion), in Persian
and right-to-left. The theme picker switches between the four token themes. Unlike the other apps, it
lives in the workspace repository itself rather than in a submodule.

```bash
npm run landing                               # = npx nx run design-system-landing:serve, http://localhost:4300
npx nx run design-system-landing:build        # static site in dist/apps/design-system-landing
```

Both build the tokens first.

## Opening it from other machines

The landing dev server, `npm run docs` (Blazor) and `npm run docs:angular` listen on every network
interface (`0.0.0.0`), so other machines on the network can open `http://<this machine's IP>:4300`; the
landing server prints the addresses when it starts. Because the docs links use `{host}`, the Angular and
Blazor cards then point at the same machine. Set `HOST=127.0.0.1` to keep the landing page and the
Blazor docs local. On Windows, allow Node.js and dotnet through the firewall (private networks) when
asked, or open ports 4300, 4200 and 5080.

`npm start` runs every `serve` target as defined in each project, and the Angular docs' target (in its
submodule) still uses `--host 127.0.0.1`, so use `npm run docs:angular` for network access to it. The dev server (`tools/scripts/dev-design-system-landing.mts`) serves
`src/` and the tokens package's `dist/` as `/tokens/`; the build copies both into one folder.

## Docs addresses

`src/docs-links.json` maps each framework to its docs site; `null` shows the card as "coming soon"
(React and Svelte, until their design systems exist). The defaults are the dev servers on the machine
the page was opened from: Angular docs `http://{host}:4200` (`npm run docs:angular`) and Blazor docs
`http://{host}:5080` (`npm run docs:blazor`), where the page replaces `{host}` with its own host name
(`location.hostname`). Environment variables override them for the dev server and the build:

| Variable | Framework |
| --- | --- |
| `LANDING_ANGULAR_DOCS_URL` | Angular |
| `LANDING_BLAZOR_DOCS_URL` | Blazor |
| `LANDING_REACT_DOCS_URL` | React |
| `LANDING_SVELTE_DOCS_URL` | Svelte |

An empty value turns a framework back to "coming soon". Component links append the docs route
(`/data-grid`, `/typography`, ...), which is the same in the Angular and Blazor docs.
