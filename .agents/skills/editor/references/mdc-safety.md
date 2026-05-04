# MDC safety

Goal: keep TockDocs content at **zero malformed MDC in source** by combining safe authoring patterns with mandatory source lint and the rendered-output backstop.

## Mandatory editing loop

1. Edit a single markdown file.
2. Add or change only one MDC construct at a time.
3. Run:

   ```bash
   pnpm run check:mdc-source <file>
   ```

4. If lint fails, stop and fix that file immediately.
5. Only continue once the file passes again.

Do not batch several new component fences, slots, and frontmatter edits before linting.

## Validation commands

- `pnpm run check:mdc-source <files>` — validate touched markdown files.
- `pnpm run check:mdc-source:staged` — validate staged workspace content files.
- `pnpm run check:content-integrity` — verify rendered content after a build or structural change.

Use `check:mdc-source` as the immediate guardrail and `check:content-integrity` as the rendered backstop.

## Copy-safe templates

### Page frontmatter

```md
---
title: My Page
description: Short summary.
---
```

### Simple component

```mdc
::note
Body.
::
```

### Component with frontmatter

```mdc
::::accordion-item
---
label: Installation
icon: i-lucide-download
---
Body.
::::
```

### Component with a slot marker

````mdc
::code-preview
`inline code`

#code
```mdc
`inline code`
```
::
````

### Literal MDC example inside a docs page

Use an **outer fence longer than anything inside it** so the example stays literal instead of rendering.

`````md
````mdc
::note
Literal example
::
````
`````

### Safe generated-asset embed

```mdc
:site-image{src="/_og/s/c_Studio.png" alt="Nuxt Studio preview" class="w-full rounded-lg" loading="lazy"}
```

Keep generated asset URLs relative when they belong to the same site.

## Common failure modes

These are the patterns the source linter catches or that commonly break TockDocs pages:

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
- Empty headings such as `###` left behind after editing.
- Top-level Mermaid fences wrapped in the wrong structure.
- Literal MDC examples pasted as live component syntax instead of fenced code.

## Safe editing habits

- Edit the smallest possible region.
- Prefer plain Markdown unless a component or MDC construct is required.
- Prefer copying a nearby valid pattern over inventing new syntax from memory.
- Keep opening and closing fences visually paired while editing.
- Re-run source lint after every batch of content edits.
- If lint fails, fix the source file first; do not work around malformed MDC in the renderer.
- Re-read the raw source after automated edits; malformed MDC often looks obvious in source even when a preview partially renders.

## Stop conditions

Stop and repair the file before continuing when any of these happen:

- `check:mdc-source` reports a parse or structure error.
- You are no longer sure whether a block is meant to render or stay literal.
- Fence depth (`::` vs `:::` vs `::::`) is unclear.
- A slot marker moved outside its component.
- A code example now contains raw component syntax without an outer fence.

When in doubt, revert the smallest broken region, restore a minimal valid Markdown version, then reintroduce one MDC construct at a time.
