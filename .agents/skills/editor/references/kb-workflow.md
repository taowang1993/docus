# KB workflow

## Content model

TockDocs KBs live under `docs/content/<kb>/`.

- `docs/content/<kb>/kb.yml` defines KB metadata.
- `docs/content/<kb>/<locale>/...` stores the KB pages for each locale.
- Section folders use `.navigation.yml` for the section title and icon.
- File names usually carry numeric prefixes to control order.
- The public route shape is `/docs/<kb>/<locale>/<slug>`.

## What to preserve when porting

- Keep page meaning and section structure intact.
- Keep locale-specific content in separate locale folders.
- Keep slugs stable unless the new TockDocs route needs a different shape.
- Mirror important page metadata: `title`, `description`, `seo`, `navigation`, `sitemap`, and any content-specific frontmatter.
- Update links and references whenever a page moves.

## What to update together

When content changes affect structure, update these surfaces together:

1. `kb.yml`
2. section `.navigation.yml` files
3. localized Markdown files
4. landing page links and cross-links
5. any redirects or route references in docs

## Practical rules

- Prefer the nearest existing page as a template.
- Reuse the same section and locale naming style already present in the KB.
- If a page should move without a filename rename, use `navigation.position`.
- If a page needs a new slot in the sidebar, update the section folder order and navigation metadata together.
- Do not edit generated Nuxt output or build artifacts.
