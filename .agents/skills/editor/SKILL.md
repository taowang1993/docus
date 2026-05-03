---
name: editor
description: TockDocs knowledge-base editing and migration workflow. Use when porting a source KB into the docs/content tree, editing markdown/frontmatter/navigation, rewriting links or assets, or validating MDC with source-level lint to avoid malformed pages.
---

# Editor

## Overview

Use this skill to move or edit knowledge-base content in TockDocs. Preserve the source meaning first, then adapt the content tree, navigation, and frontmatter so the page renders at the correct `/docs/<kb>/<locale>/...` route.

## Read first

1. Read [`.context/architecture.md`](../../../.context/architecture.md).
2. Read [`references/kb-workflow.md`](references/kb-workflow.md).
3. Read [`references/mdc-safety.md`](references/mdc-safety.md) before touching MDC, component fences, or frontmatter.

## Porting workflow

### 1. Map the source KB

- Identify the target KB id and locale set.
- Find the destination `docs/content/<kb>/kb.yml` and the relevant `docs/content/<kb>/<locale>/` folders.
- Inspect sibling pages and `.navigation.yml` files before adding or moving anything.
- Keep section titles, file names, and numeric ordering aligned with the destination tree.

### 2. Port one page at a time

- Keep Markdown content Markdown-first.
- Preserve headings, code fences, and admonitions unless the TockDocs structure requires a change.
- Rewrite internal links, image paths, and cross-references to the new TockDocs route structure.
- If a page moves between sections, update its navigation metadata and any links that point to the old path.

### 3. Update metadata deliberately

- Keep page frontmatter valid and minimal.
- Use `title`, `description`, `seo`, and `navigation` fields only when they improve the TockDocs page.
- Keep `navigation.position` and section filenames consistent with the visible order.
- Update `kb.yml` when the KB id, locales, entry page, or assistant metadata changes.

### 4. Validate before continuing

Run the narrowest useful checks first:

```bash
pnpm run check:mdc-source <touched-files>
```

Use the staged helper when content is already staged:

```bash
pnpm run check:mdc-source:staged
```

Run broader checks only when the change affects routing, collections, or runtime behavior:

```bash
pnpm run check:content-integrity
pnpm run typecheck
```

## MDC safety rules

- Keep page frontmatter fences balanced.
- Keep component fences valid (`::note`, `::code-group`, `::::accordion-item`, etc.).
- Do not insert a blank line between a component fence and its component frontmatter.
- Keep slot markers like `#title`, `#description`, `#header`, `#footer`, `#default`, and `#code` inside a component fence.
- Do not leave escaped component fences (`\::`) or escaped `_blank` targets in prose.
- Do not append admonition shorthand to list items.
- Keep generated asset URLs relative when they belong to the same site.
- Keep Mermaid as a top-level fenced block unless a specific component is required.

## Finish

- Re-read the changed pages in context.
- Fix any lint failures before moving on.
- Prefer small, reviewable content batches over large mixed edits.
