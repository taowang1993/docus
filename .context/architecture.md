# Docus Architecture

## System Overview

Docus is a pnpm workspace centered on a reusable Nuxt layer.

- **`layer/`** is the product: a Nuxt layer that provides the Docus theme, layouts, routing, server utilities, AI assistant, MCP tools, i18n assets, and shared app components.
- **`docs/`** is the official documentation site deployed at `docus.dev`. It extends the layer and adds site-specific config, content, and Nuxt Studio integration.
- **`playground/`** is a minimal local app used to validate the layer in isolation.
- **`cli/`** publishes `create-docus`, which scaffolds new projects from `.starters/default` or `.starters/i18n`.
- **`.starters/`** contains the project templates consumed by the CLI.

The core architectural idea is: **build the product as a Nuxt layer, then consume that layer from the docs site, playground, and generated starter projects**.

## Architectural Layers

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

`layer/nuxt.config.ts` is the composition root for the Docus product.
It wires in:

- local Nuxt modules:
  - `layer/modules/config.ts`
  - `layer/modules/routing.ts`
  - `layer/modules/markdown-rewrite.ts`
  - `layer/modules/skills/index.ts`
  - `layer/modules/css.ts`
  - `layer/modules/assistant/index.ts` (enabled through the layer config)
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
- the Docus dev server defaults (`4987`)
- Content markdown highlighting
- robots, sitemap, prerender, OG image, and llms defaults
- icon collections and i18n defaults

### 3. App/UI layer (`layer/app/`)

The layer ships the app shell and reusable UI primitives:

- `app.vue` and `error.vue` bootstrap the Nuxt UI app shell and content search
- `layouts/docs.vue` hosts the documentation page layout
- `pages/[[lang]]/[...slug].vue` resolves content pages from Nuxt Content
- `components/app/*` builds the global header/footer shell
- `components/docs/*` renders the left navigation, right TOC, and page controls
- `composables/*` coordinates client-side behaviors such as i18n, subnavigation, content search, and assistant state

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
3. the server connects to the configured MCP server
4. MCP tools are exposed to the model
5. the model streams grounded responses back to the UI

The assistant is intentionally **tool-grounded**. For substantive docs questions, the model is prompted to use MCP tools before answering.

### 6. Consumer apps

#### `docs/`

The official site extends `docus` in `docs/nuxt.config.ts` and adds:

- real site metadata (`https://docus.dev`)
- i18n locales (`en`, `fr`)
- Nuxt Studio integration
- docs-specific app config and content
- MCP browser redirect settings for the public docs site

#### `playground/`

The playground is a thin test harness for layer development. It disables i18n explicitly so contributors can validate the default non-i18n behavior.

#### Starter templates

`.starters/default` and `.starters/i18n` are the generated project baselines used by `create-docus`.

## Request and Data Flow

### Docs page rendering

1. a consumer app extends `docus`
2. Docus modules register config, routes, CSS, skills, and assistant runtime pieces
3. `pages/[[lang]]/[...slug].vue` queries Nuxt Content collections
4. navigation, TOC, SEO, OG image metadata, and edit/report links are derived from content + app config
5. the docs layout renders header, left nav, page body, and right TOC

### Assistant grounding

1. user opens the assistant UI
2. `useAssistant()` manages panel state and messages
3. `AssistantPanel.vue` streams requests to `/__docus__/assistant`
4. server endpoint loads the active AI provider
5. endpoint connects to MCP tools (`search-pages`, `list-pages`, `get-page`)
6. MCP tools query Nuxt Content and hybrid search helpers
7. grounded answers stream back to the panel

## ASCII Architecture Diagram

```text
                                Docus Workspace
┌──────────────────────────────────────────────────────────────────────────────┐
│ Root pnpm workspace                                                         │
│ package.json · pnpm-workspace.yaml · scripts/ · CI                          │
└───────────────┬───────────────────────────────┬──────────────────────────────┘
                │                               │
                │ consumes / builds             │ scaffolds from
                │                               │
        ┌───────▼────────┐              ┌───────▼────────┐
        │   layer/       │              │    cli/        │
        │ Docus Nuxt     │              │ create-docus   │
        │ layer/product  │              │ scaffolder     │
        └───────┬────────┘              └───────┬────────┘
                │                                uses
     extends    │                                  │
                │                          ┌───────▼──────────────────┐
        ┌───────▼────────┐                 │ .starters/default        │
        │    docs/       │                 │ .starters/i18n           │
        │ official site  │                 └──────────────────────────┘
        └───────┬────────┘
                │
        ┌───────▼────────┐
        │ playground/    │
        │ dev harness    │
        └────────────────┘

Inside layer/

┌──────────────────────────────────────────────────────────────────────────────┐
│ Nuxt modules                                                                 │
│ config · routing · markdown-rewrite · skills · css · assistant              │
└───────────────┬───────────────────────────────┬──────────────────────────────┘
                │                               │
                │ registers                     │ exposes
                │                               │
     ┌──────────▼──────────┐         ┌──────────▼──────────────────────────┐
     │ app/                │         │ server/                             │
     │ layouts · pages     │         │ content utils · docs search         │
     │ header/footer       │         │ MCP tools · sitemap route           │
     │ docs navigation UI  │         └──────────┬──────────────────────────┘
     └──────────┬──────────┘                    │
                │                                │ queries
                │ renders                        │
         ┌──────▼──────┐                ┌────────▼─────────┐
         │ Nuxt Content│                │ FlexSearch +     │
         │ collections │                │ Fuse.js index    │
         └─────────────┘                └──────────────────┘

Assistant path

User → AssistantPanel.vue → /__docus__/assistant → AI provider resolver
     → MCP client/server → search-pages | list-pages | get-page
     → Nuxt Content + hybrid search → streamed grounded answer
```

## Key Design Decisions

- **Nuxt layer first**: the reusable theme and runtime live in `layer/`, not inside the docs app.
- **Docs site as a consumer**: `docs/` proves the layer works in a real deployment.
- **Generated starters mirror the product**: the CLI scaffolds consumers that extend the same layer architecture.
- **Tool-grounded AI**: the assistant is designed to retrieve documentation through MCP instead of answering from model memory alone.
- **Hybrid search**: FlexSearch handles primary indexing while Fuse.js improves typo tolerance and fuzzy recovery.
- **Static-friendly output**: prerender, robots, sitemap, OG image, and llms defaults support documentation-site deployment patterns.

## Operational Notes

- Default local dev port is `4987`.
- `scripts/run-dev.mjs` and `scripts/with-env.mjs` load `.env` / `.env.local` before invoking Nuxt commands.
- In development, the assistant UI is enabled automatically; in production it requires explicit enablement or valid provider credentials.
- CI validates prepare, lint, typecheck, and package build/publish readiness from GitHub Actions.
