---
name: editor
description: TockDocs knowledge-base editing and migration workflow. Use when porting a source KB into the docs/content tree, editing markdown/frontmatter/navigation, rewriting links or assets, or validating MDC with source-level lint to avoid malformed pages.
---

# Editor

## Goal

Create or migrate TockDocs content **without malformed MDC** while preserving source meaning, route correctness, and navigation order.

## Read first

1. Read [`.context/architecture.md`](../../../.context/architecture.md).
2. Read [`references/kb-workflow.md`](references/kb-workflow.md).
3. Read [`references/mdc-safety.md`](references/mdc-safety.md) before touching frontmatter, component fences, slots, or embedded assets.
4. Inspect at least one nearby page in the same KB section and locale before editing so you copy the local conventions instead of inventing new ones.

## Non-negotiable workflow

1. Work **one file at a time**.
2. Keep content **Markdown-first**. Only introduce MDC when plain Markdown cannot express the intended result.
3. Add **one new MDC construct at a time**: one frontmatter block, one component fence, one slot section, one nested component, or one embedded asset pattern.
4. Immediately run:

   ```bash
   pnpm run check:mdc-source <touched-file>
   ```

5. If lint fails, **stop** and repair that file before touching anything else.
6. If the change affects routing, collections, OG assets, or rendered output, also run:

   ```bash
   pnpm run check:content-integrity
   pnpm run typecheck
   ```

7. Re-read the final raw Markdown source before finishing. Do not trust the rendered preview alone.

## Porting workflow

### 1. Map the destination first

- Identify the target KB id and locale set.
- Find `docs/content/<kb>/kb.yml` and the matching `docs/content/<kb>/<locale>/` folders.
- Inspect sibling pages and `.navigation.yml` files before adding, moving, or renaming anything.
- Keep section titles, file names, and numeric ordering aligned with the destination tree.

### 2. Port one page at a time

- Preserve headings, code fences, and meaning first.
- Rewrite internal links, image paths, and cross-references to the TockDocs route structure.
- If a page moves between sections, update navigation metadata and any links that still point to the old path.
- Prefer adapting an existing valid page pattern over inventing fresh MDC syntax.

### 3. Update metadata deliberately

- Keep page frontmatter valid and minimal.
- Use `title`, `description`, `seo`, and `navigation` only when they materially improve the page.
- Keep `navigation.position`, folder ordering, and visible sidebar order consistent.
- Update `kb.yml` when the KB id, locales, entry page, or assistant metadata changes.

## MDC authoring guardrails

- Keep page frontmatter balanced and only at the top of the file.
- Keep component fence depth matched (`::`, `:::`, `::::`, etc.).
- Do **not** insert a blank line between a component opener and its component frontmatter.
- Keep slot markers like `#title`, `#description`, `#header`, `#footer`, `#default`, and `#code` **inside** a component fence.
- Never prefix component fences or slot markers with heading markers like `#`, `##`, or `###`.
- Never leave empty headings like `###` behind after editing.
- Never leave escaped component fences (`\::`) or escaped `_blank` targets in prose.
- Do not append admonition shorthand to list items.
- When showing MDC syntax as source, use fenced code blocks. Do **not** paste live `::component` syntax into prose unless you want it rendered.
- When a literal example itself contains fenced code or component syntax, wrap it in an outer ````mdc fence (or longer) so the example stays literal.
- Keep Mermaid as a top-level fenced block unless a specific component is explicitly required.
- For generated OG routes like `/_og/...`, use `:site-image` or plain `<img>`, not `NuxtImg`.

## Finish checklist

- Re-read the changed pages in raw source.
- Re-run targeted MDC source lint.
- Fix every lint failure before moving on.
- Confirm `kb.yml`, localized paths, navigation metadata, and links still match the public `/docs/<kb>/<locale>/...` routes.
- Prefer small, reviewable batches over large mixed edits.
