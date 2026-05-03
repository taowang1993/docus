# MDC safety

Use source-level lint to catch malformed Markdown/MDC before content lands in TockDocs.

## Validation commands

- `pnpm run check:mdc-source <files>` — validate touched markdown files.
- `pnpm run check:mdc-source:staged` — validate staged docs files.
- `pnpm run check:content-integrity` — verify rendered content after a build or structural change.

## Common failure modes

These are the patterns the source linter is designed to catch or that commonly break TockDocs pages:

- Unclosed page frontmatter fences (`---`).
- Invalid component fences or trailing text on the same line as a component opener.
- Blank lines between a component opener and its component frontmatter.
- Unclosed component frontmatter fences.
- Slot markers used outside a component fence.
- Escaped component fences leaking into prose.
- Inline admonition shorthand appended to a list item.
- Escaped `_blank` targets leaking into component props.
- Same-site generated asset URLs written as absolute `_og` or `_ipx` paths.
- Headingized component fences or slot markers caused by an accidental `#` prefix.
- Top-level Mermaid fences wrapped in the wrong structure.

## Safe editing habits

- Edit the smallest possible region.
- Keep opening and closing fences adjacent when you add component syntax.
- Prefer plain Markdown unless a component or MDC construct is required.
- Re-run source lint after every batch of content edits.
- If lint fails, fix the source file first; do not work around malformed MDC in the renderer.
