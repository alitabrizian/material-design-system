# CLAUDE.md

Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing components, styles or docs pages, and follow it.
The binding rules are in [.specify/memory/constitution.md](.specify/memory/constitution.md).

The rules that are most often missed:

- **Docs examples show classes and components, never tokens.** No `var(--…)` or token names in a docs
  example or a foundation page's copyable column. Tokens are internal to the tokens project; if an
  example needs a value only a token gives, add a `pb-` class or a component parameter to the library.
- **`pb-` classes are BEM:** `pb-<component>`, elements `pb-<block>__<element>`, variants and states
  `pb-<block>--<modifier>`. No `is-*` classes; prefer native and ARIA attributes for state.
- **Colors only from tokens** in library and docs CSS; `tools/scripts/audit-colors.mts` fails the build
  otherwise.
- **Every component ships in Blazor and Angular, with a docs page in both apps**, in the order header,
  examples, API reference, Accessibility. The Angular page mirrors the Blazor one.
- **Submodules first:** commit and push inside the submodule, then commit the pointer in the workspace.
  Every code change ends with a pushed branch and a pull request on GitHub.
