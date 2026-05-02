# TockDocs Architecture

## System Overview

TockDocs is a pnpm workspace centered on a reusable Nuxt layer.

The workspace supports two content modes:

- **legacy docs mode** — route content with locale prefixes such as `/en/...`
- **knowledge-base mode** — route multiple docs collections under `/docs/<kb>/<locale>/...`

The core idea is still the same: **build TockDocs once as a Nuxt layer, then reuse that layer from the docs site, the playground, and generated starter projects**.

- **`layer/`** is the product: the TockDocs theme, layouts, routing, knowledge-base/content resolution, server utilities, AI assistant, MCP tools, and shared app/runtime assets.
- **`docs/`** is the official documentation site deployed at `tockdocs.dev`. It extends the layer and adds KB content, Nuxt i18n, Nuxt Studio, Nuxt Skill Hub, and site-specific configuration.
- **`playground/`** is a minimal local app used to validate the layer in isolation.
- **`cli/`** publishes `create-tockdocs`, which scaffolds new projects from `.starters/default` or `.starters/i18n`.
- **`.starters/`** contains the project templates consumed by the CLI.

## Content and routing model

### Knowledge-base discovery

The layer detects KB mode when it finds one or more `content/<kb>/kb.yml` files.

That configuration is resolved by:

- `layer/utils/knowledge-bases.ts`
- `layer/modules/config.ts`

Those files build the runtime KB metadata that is exposed through `runtimeConfig.public.tockdocs`, including:

- `docsMode`
- `knowledgeBases`
- `defaultKnowledgeBase`
- `filteredLocales`
- `hasSiteContent`

### Content collections

`layer/content.config.ts` builds Nuxt Content collections dynamically:

- **KB mode**
  - optional `site` collection from `content/site/**/*`
  - one collection per KB locale: `docs_<kb>_<locale>`
  - collection prefix: `/docs/<kb>/<locale>`
- **Legacy mode**
  - locale-based `docs_<locale>` collections when i18n is enabled
  - fallback `docs` collection when i18n is disabled
  - landing collections for root pages when needed

### Routing

`layer/modules/routing.ts` swaps routes based on the content mode:

- **KB mode**
  - docs pages live at `layer/app/pages/docs/[kb]/[locale]/[[...slug]].vue`
  - `/docs/<kb>` redirects to the KB home path
  - `/` uses `layer/app/templates/landing.vue`
- **Legacy mode**
  - docs pages live at `layer/app/pages/[[lang]]/[...slug].vue`
  - optional localized landing page routing is preserved

The landing template also behaves differently by mode:

- in KB mode, it renders `content/site/index.md` when present
- otherwise it falls back to `KnowledgeBaseDirectory`
- in legacy mode, it uses the `landing` collections

## Architectural layers

### 1. Workspace layer

The root `package.json` and `pnpm-workspace.yaml` define a monorepo with four packages:

- root workspace orchestration and verification scripts
- `cli/`
- `docs/`
- `layer/`

Root scripts coordinate common workflows:

- `pnpm run dev` → runs the docs site in dev mode
- `pnpm run dev:prepare` → prepares layer, docs, and playground Nuxt types
- `pnpm run docs:build` → builds the docs app while extending `../layer`
- `pnpm run verify` → prepare + lint + typecheck + docs build

### 2. Product layer (`layer/`)

`layer/nuxt.config.ts` is the composition root for the TockDocs product.
It wires in:

- local Nuxt modules:
  - `layer/modules/config.ts`
  - `layer/modules/routing.ts`
  - `layer/modules/markdown-rewrite.ts`
  - `layer/modules/skills/index.ts`
  - `layer/modules/css.ts`
  - `layer/modules/assistant/index.ts`
- upstream Nuxt modules:
  - `@nuxt/ui`
  - `@nuxt/content`
  - `@nuxt/image`
  - `@nuxtjs/robots`
  - `@nuxtjs/mcp-toolkit`
  - `nuxt-og-image`
  - `nuxt-llms`

The layer also sets:

- runtime assistant provider config
- the TockDocs dev server defaults (`4987`)
- Content markdown highlighting
- robots, sitemap, prerender, OG image, and llms defaults
- `nuxt-og-image` in `zeroRuntime` mode so OG assets are generated at build time
- icon collections and i18n defaults

`layer/modules/config.ts` is especially important because it:

- resolves `kb.yml` files
- filters locales against real content and locale message files
- chooses KB mode vs legacy mode
- writes the public `tockdocs` runtime config that the app layer consumes

`layer/content.config.ts` and `layer/modules/routing.ts` work together so the content collections and visible routes always stay in sync.

### 3. App/UI layer (`layer/app/`)

The layer ships the app shell and reusable UI primitives:

- `app.vue` and `error.vue` bootstrap the Nuxt UI app shell and content search
- `layouts/docs.vue` hosts the documentation page layout
- `pages/[[lang]]/[...slug].vue` resolves legacy content pages from Nuxt Content
- `pages/docs/[kb]/index.vue` redirects `/docs/<kb>` to the KB home path
- `pages/docs/[kb]/[locale]/[[...slug]].vue` resolves KB content pages
- `components/app/*` builds the global header/footer shell
- `components/KnowledgeBaseSelect.vue` shows the KB switcher only when multiple KBs are available
- `components/LanguageSelect.vue` shows the locale switcher only when multiple locales are available on docs routes
- `components/KnowledgeBaseDirectory.vue` renders the KB directory landing page
- `composables/useTockDocs.ts` resolves the active KB, locale, collection name, and home path
- `composables/useTockDocsI18n.ts` keeps locale switching aligned with the active content mode

The header only shows the KB selector when:

- KB mode is active
- more than one KB exists
- the current route is a docs route

The language selector only shows when:

- i18n is enabled
- more than one locale exists
- the current route is a docs route in KB mode, or any valid docs route in legacy mode

### 4. Server/content layer (`layer/server/`)

Server-side responsibilities are split between content helpers and MCP tools:

- `server/utils/content.ts` derives searchable collections and locale-aware lookups
- `server/utils/docs-search.ts` builds an in-memory hybrid search index
- `server/mcp/tools/search-pages.ts` exposes full-text docs retrieval
- `server/mcp/tools/list-pages.ts` exposes structure browsing
- `server/mcp/tools/get-page.ts` exposes exact page retrieval
- `server/routes/sitemap.xml.ts` generates sitemap output

The search system is hybrid:

- **FlexSearch** provides primary retrieval
- **Fuse.js** provides fuzzy fallback when FlexSearch is weak
- results are merged, reranked, and returned with excerpted page context

### 5. Assistant layer (`layer/modules/assistant/`)

The assistant is implemented as a Nuxt module plus runtime UI/server code.

Client side:

- `runtime/components/AssistantPanel.vue`
- `runtime/components/AssistantChat.vue`
- `runtime/components/AssistantFloatingInput.vue`
- `runtime/composables/useAssistant.ts`

Server side:

- `runtime/server/api/search.ts`
- `runtime/server/utils/ai-provider.ts`

Assistant request flow:

1. the client posts chat messages to `config.public.assistant.apiPath`
2. the server resolves the active AI provider/model
3. the server derives the current KB/locale scope from the referer when possible
4. the server connects to the configured MCP server and forwards KB/locale when using the built-in local MCP endpoint
5. MCP tools are exposed to the model
6. the model streams grounded responses back to the UI

The assistant is intentionally **tool-grounded**. For substantive docs questions, the model is prompted to use MCP tools before answering.

### 6. Consumer apps

#### `docs/`

The official site extends `tockdocs` in `docs/nuxt.config.ts` and adds:

- real site metadata (`https://tockdocs.dev` by default)
- i18n locales (`en`, `fr`)
- Nuxt Skill Hub integration
- Nuxt Studio integration
- docs-specific app config and content
- MCP browser redirect settings for the public docs site

The docs content currently includes two KBs:

- `platform`
- `parser`

The landing page at `docs/content/site/index.md` links into those KBs.

#### `playground/`

The playground is a thin test harness for layer development. It disables i18n explicitly so contributors can validate the default non-i18n behavior.

#### Starter templates

`.starters/default` and `.starters/i18n` are the generated project baselines used by `create-tockdocs`.

Both starters currently scaffold **legacy mode** projects. Knowledge-base mode is opt-in and is enabled later by adding `content/<kb>/kb.yml` files (plus optional `content/site/` landing content).

## Request and Data Flow

### Docs page rendering

1. a consumer app extends `tockdocs`
2. TockDocs modules register config, routes, CSS, skills, and assistant runtime pieces
3. `layer/modules/config.ts` resolves KB mode, locale filters, and runtime `tockdocs` metadata
4. `layer/content.config.ts` creates the correct Nuxt Content collections
5. `useTockDocs()` derives the active KB, locale, collection name, and route-specific home path
6. navigation, TOC, SEO, OG image metadata, and edit/report links are derived from content + app config
7. the docs layout renders header, left nav, page body, and right TOC

### Assistant grounding

1. user opens the assistant UI
2. `useAssistant()` manages panel state and messages
3. `AssistantPanel.vue` streams requests to `/__tockdocs__/assistant`
4. server endpoint loads the active AI provider
5. endpoint resolves the current KB/locale scope from the referer and connects to MCP tools (`search-pages`, `list-pages`, `get-page`)
6. MCP tools query Nuxt Content and hybrid search helpers
7. grounded answers stream back to the panel

## ASCII Architecture Diagram

```text
                                TockDocs Workspace
┌──────────────────────────────────────────────────────────────────────────────┐
│ Root pnpm workspace                                                          │
│ package.json · pnpm-workspace.yaml · scripts/ · CI                           │
└───────────────┬───────────────────────────────┬──────────────────────────────┘
                │                               │
                │ consumes / builds             │
                │                               │
        ┌───────▼────────┐              ┌───────▼────────┐
        │   layer/       │              │    cli/        │
        │ TockDocs Nuxt     │              │ create-tockdocs   │
        │ layer/product  │              │ scaffolder     │
        └───────┬────────┘              └───────┬────────┘
                │                                uses
     extends    │                                  │
                │                          ┌───────▼──────────────────┐
        ┌───────▼────────┐                 │ .starters/default        │
        │    docs/       │                 │ .starters/i18n           │
        │ KB consumer    │                 └──────────────────────────┘
        └───────┬────────┘
                │
        ┌───────▼────────┐
        │ playground/    │
        │ dev harness    │
        └────────────────┘

Inside layer/

content/<kb>/kb.yml
        │
        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Nuxt modules                                                                 │
│ config · routing · markdown-rewrite · skills · css · assistant               │
└───────────────┬───────────────────────────────┬──────────────────────────────┘
                │                               │
                │ registers                     │ exposes
                │                               │
     ┌──────────▼──────────┐         ┌──────────▼──────────────────────────┐
     │ app/                │         │ server/                             │
     │ layouts · pages     │         │ content utils · docs search         │
     │ KB selectors        │         │ MCP tools · sitemap route           │
     └──────────┬──────────┘         └──────────┬──────────────────────────┘
                │                                │
                │ renders                        │ queries
                │                                │
         ┌──────▼──────┐                ┌────────▼─────────┐
         │ Nuxt Content│                │ FlexSearch +     │
         │ collections │                │ Fuse.js index    │
         └─────────────┘                └──────────────────┘

Assistant path

User → AssistantPanel.vue → /__tockdocs__/assistant → AI provider resolver
     → referer-scoped KB/locale → MCP client/server → search-pages | list-pages | get-page
     → Nuxt Content + hybrid search → streamed grounded answer
```

## Key Design Decisions

- **Nuxt layer first**: the reusable theme and runtime live in `layer/`, not inside the docs app.
- **Docs site as a consumer**: `docs/` proves the layer works in a real deployment.
- **Knowledge-base mode is first-class**: KB metadata, routing, content collections, and selectors all derive from `kb.yml`.
- **Generated starters mirror the product**: the CLI scaffolds consumers that extend the same layer architecture.
- **Tool-grounded AI**: the assistant is designed to retrieve documentation through MCP instead of answering from model memory alone.
- **Hybrid search**: FlexSearch handles primary indexing while Fuse.js improves typo tolerance and fuzzy recovery.
- **Static-friendly output**: prerender, robots, sitemap, OG image, and llms defaults support documentation-site deployment patterns.

## Operational Notes

- Default local dev port is `4987`.
- `scripts/run-dev.mjs` and `scripts/with-env.mjs` load `.env` / `.env.local` before invoking Nuxt commands.
- In development, the assistant UI is enabled automatically; in production it requires explicit enablement or valid provider credentials.
- OG images are generated in `zeroRuntime` mode. Inline `/_og/...` examples embedded in docs content must therefore point to prerendered image files that actually exist in the build output; in KB mode their encoded `p_` route paths must match `/docs/<kb>/<locale>/...` routes.
- Consumer apps that render Takumi-based OG images in development should include `@takumi-rs/core` in the consumer app dependencies because the OG worker resolves that module from the app root.
- CI validates prepare, lint, typecheck, and package build/publish readiness from GitHub Actions.
