# Icons

The icon set of the design team's Figma Icons page (node 6763:35): Untitled UI line icons in 19 categories,
plus the team's own icons (the PartoBita category).

- `icons.json`: the categories and icon names, as on the Figma page.
- `svg/*.svg`: one 24x24 icon per name, drawn with `stroke="currentColor"`.

The Untitled UI SVGs were generated from `@untitled-ui/icons-react@0.1.4` (MIT, github.com/devias-io/untitled-ui):
each component's SVG markup, saved under the Figma name. That package is not a dependency.

The 14 PartoBita icons (seafood-fish, turkey, ...) are not in that package and still need an SVG export from
Figma. Until they are added, `scripts/build-icons.mts` leaves them out with a warning.
