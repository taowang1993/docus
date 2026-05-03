# Content linting and integrity checks

## Overview

TockDocs now uses a **two-layer docs validation flow**:

1. **Source-level MDC lint**
   - Script: `scripts/check-mdc-source.mjs`
   - Shared logic: `scripts/lib/mdc-source-lint.mjs`
   - Purpose: catch malformed `.md` / `.mdc` source before a full Nuxt build

2. **Rendered-output integrity smoke test**
   - Script: `scripts/check-content-integrity.mjs`
   - Purpose: catch regressions that only show up after the docs site is rendered

The source lint is the primary guard for agent-edited Markdown.
The rendered smoke test is still kept because some MDC mistakes can parse successfully but still render incorrectly.

## Source MDC lint

### Commands

- `pnpm run check:mdc-source`
  - lints every Markdown file under `docs/content`
- `pnpm run check:mdc-source:staged`
  - lints only **staged** `docs/content/**/*.md` and `docs/content/**/*.mdc` files
  - supports both **newly created** and **modified** files via `git diff --cached --diff-filter=ACMR`
- `pnpm run test:mdc-source`
  - runs unit tests for the source lint

### Parser surface

The linter intentionally reuses the real MDC parsing stack instead of a custom approximation:

- `@nuxtjs/mdc/runtime`
- the project’s `remark-mdc` configuration
- `autoUnwrap: true`
- `yaml` parsing for page and component frontmatter validation

That makes the source lint match TockDocs’ real authoring/runtime behavior much more closely than a regex-only check.

### What it checks

The source lint validates all of the following before build:

- invalid page frontmatter YAML
- unclosed page frontmatter fences
- invalid component frontmatter YAML
- unclosed component frontmatter fences
- blank lines between a component fence and its frontmatter
- property-like lines that should be inside component frontmatter
- slot markers outside component fences
- component fences converted into headings
- slot markers converted into headings
- escaped component fences leaking into prose
- malformed component fence syntax, including broken inline prop braces
- unclosed or mismatched component fences
- inline admonition shorthand appended to list items
- escaped `_blank` values leaking into component props
- same-site generated asset URLs written as absolute `_og` / `_ipx` URLs

## Staged-file wrapper

The staged wrapper exists to fail fast in pre-commit while still supporting newly added docs files.

It works by reading:

- `git diff --cached --name-only --diff-filter=ACMR -- docs/content`

That means it includes:

- `A` = added files
- `C` = copied files
- `M` = modified files
- `R` = renamed files

Deleted files are intentionally ignored.

If no staged Markdown files are present, the wrapper exits successfully.

## Rendered-output integrity check

`check-content-integrity.mjs` is still useful and has **not** been removed.

Reason: the source parser/lint catches malformed MDC much earlier, but the rendered check still verifies things the source pass does not fully prove by itself, such as:

- guarded MDC content not leaking raw tokens into built HTML
- rendered pages still containing expected heading text
- generated OG image paths existing in the build output
- encoded OG route paths still pointing at valid routes

So the current strategy is:

- **parse first**
- **render second**

That gives faster failures for authors and agents while preserving end-to-end confidence.

## Build and pre-commit integration

### Root scripts

- `docs:build`
  - runs `check:mdc-source`
  - runs the Nuxt docs build
  - runs `check:content-integrity`

- `precommit`
  - runs `check:mdc-source:staged`
  - runs diagram checks
  - runs ESLint
  - runs `docs:build`

### Docs app script

- `docs/package.json#build`
  - runs the root `check:mdc-source`
  - builds docs
  - runs the root `check:content-integrity`

## Verification checklist

When changing docs linting behavior, run at least:

- `pnpm run test:mdc-source`
- `pnpm run check:mdc-source`
- `pnpm run lint`
- `pnpm run docs:build`

Before committing, run:

- `pnpm run precommit`
