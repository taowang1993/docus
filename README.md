# Docus

An AI-powered Knowledge Management System built as a pnpm monorepo around the Docus Nuxt layer, the official docs site, the `create-docus` CLI, and the starter templates those tools generate.

## Overview

Docus is an AI-powered Knowledge Management System built around a reusable **Nuxt layer**.

- **`layer/`** is the main product: the Docus theme, layouts, routing, server utilities, AI assistant, MCP tools, and shared runtime assets.
- **`docs/`** is the official documentation site (`docus.dev`) and a real consumer of the layer.
- **`playground/`** is a lightweight local consumer used to validate the layer in isolation.
- **`cli/`** publishes `create-docus`, which scaffolds new projects from the starter templates.
- **`.starters/`** contains the `default` and `i18n` templates consumed by the CLI.

The repo’s core architecture is: **build Docus once as an AI-powered Nuxt layer, then reuse it across the docs site, playground, and generated starter projects**.

## Tech Stack

| Tech | Use Case |
| --- | --- |
| pnpm workspace, Node.js 22, TypeScript, ESLint, release-it | workspace automation |
| Nuxt 4 + Vue 3 | app framework |
| `@nuxt/content`, MDC, Shiki, Nuxt Image | content rendering |
| `@nuxt/ui`, Tailwind CSS 4, Iconify icons | UI system |
| `@nuxtjs/i18n` | locale support |
| AI SDK (`ai`, `@ai-sdk/vue`, `@ai-sdk/mcp`, provider SDKs) | assistant runtime |
| FlexSearch + Fuse.js, MCP tools via `@nuxtjs/mcp-toolkit` | docs search |
| `nuxt-og-image`, `nuxt-llms`, `@nuxtjs/robots` | site metadata |
| npm packages for `docus` and `create-docus` | package publishing |

## Environment Variables

The repo loads `.env` / `.env.local` through `scripts/run-dev.mjs` and `scripts/with-env.mjs`.

| Env Var | Use Case |
| --- | --- |
| NUXT_PORT | local dev port |
| NUXT_APP_BASE_URL | deployment base path |
| NUXT_SITE_URL | canonical site URL |
| AI_PROVIDER | assistant provider |
| AI_MODEL | model override |
| VERCEL_API_KEY | Vercel AI Gateway |
| OPENROUTER_API_KEY | OpenRouter access |
| OPENROUTER_MODEL | OpenRouter model |
| DEEPSEEK_API_KEY | DeepSeek access |
| DEEPSEEK_MODEL | DeepSeek model |
| NVIDIA_API_KEY | NVIDIA access |
| NVIDIA_MODEL | NVIDIA model |
| HUGGINGFACE_API_KEY | Hugging Face access |
| HUGGINGFACE_MODEL | Hugging Face model |
| GROQ_API_KEY | Groq access |
| GROQ_MODEL | Groq model |
| GITHUB_TOKEN | GitHub Models access |
| GITHUB_MODEL | GitHub model |
| GEMINI_API_KEY | Gemini access |
| GEMINI_MODEL | Gemini model |
| CLOUDFLARE_ACCOUNT_ID | Cloudflare account |
| CLOUDFLARE_API_TOKEN | Cloudflare API token |
| CLOUDFLARE_MODEL | Cloudflare model |
| NUXT_PUBLIC_ASSISTANT_ENABLED | force-enable assistant |


## Deployment

### Docs site

The official docs app lives in `docs/`, extends `docus` from `layer/`, and is deployed from the repository root.

Important deployment facts:

- Vercel uses the root `vercel.json` with `CI= pnpm install --frozen-lockfile` and `CI= pnpm build`
- the workspace root `build` script delegates to `pnpm run docs:build`
- verification command: `pnpm run verify`
- site config is defined in `docs/nuxt.config.ts`
- Nitro prerendering, sitemap generation, robots output, OG image generation, `llms.txt` support, and the Vercel `/tmp/contents.sqlite` setup are configured through the layer
- set `NUXT_SITE_URL` correctly for the target environment
- keep `NUXT_APP_BASE_URL=/` for normal root deployments unless the site is hosted under a subpath

### Package publishing

This repo also publishes two packages:

- `docus` from `layer/`
- `create-docus` from `cli/`

CI (`.github/workflows/ci.yml`) installs dependencies, prepares Nuxt types, lints, typechecks, builds the CLI, and validates package publishability.

## Architecture

```text
                                Docus Workspace
┌──────────────────────────────────────────────────────────────────────────────┐
│ Root pnpm workspace                                                         │
│ package.json · pnpm-workspace.yaml · scripts/ · CI                          │
└───────────────┬───────────────────────────────┬──────────────────────────────┘
                │                               │
                │ consumes / builds             │
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
                │                                │
                │ renders                        │ queries
                │                                │
         ┌──────▼──────┐                ┌────────▼─────────┐
         │ Nuxt Content│                │ FlexSearch +     │
         │ collections │                │ Fuse.js index    │
         └─────────────┘                └──────────────────┘

Assistant path

User → AssistantPanel.vue → /__docus__/assistant → AI provider resolver
     → MCP client/server → search-pages | list-pages | get-page
     → Nuxt Content + hybrid search → streamed grounded answer
```

Docus is organized as a **layered monorepo**:

1. **Workspace orchestration** at the root controls shared scripts, linting, typechecking, and release workflows.
2. **`layer/`** is the composition root for the product. Its `nuxt.config.ts` wires in local modules (`config`, `routing`, `markdown-rewrite`, `skills`, `css`, `assistant`) plus Nuxt ecosystem modules.
3. **`layer/app/`** provides the UI shell: header/footer, docs layout, page rendering, left navigation, right TOC, and shared composables.
4. **`layer/server/`** provides content-aware server behavior: locale/content helpers, sitemap generation, and MCP tools.
5. **`layer/modules/assistant/`** implements the docs-grounded AI assistant. The client streams chat to a server endpoint, which selects an AI provider, connects to an MCP server, and exposes Docus MCP tools to the model.
6. **Hybrid docs retrieval** is implemented in `layer/server/utils/docs-search.ts` using FlexSearch for primary retrieval and Fuse.js for fuzzy fallback.
7. **`docs/`**, **`playground/`**, and generated starter projects are consumers of the same layer architecture.

For a fuller walkthrough and ASCII system diagram, see **`.context/architecture.md`**.

## Project Structure

```text
.
├── .context/                 # Local project context docs for assistants
├── .github/                 # CI and PR-related repo automation
├── .starters/               # CLI starter templates (default, i18n)
├── cli/                     # create-docus package
│   ├── cli.ts               # CLI command definition
│   └── main.ts              # CLI entrypoint
├── docs/                    # Official docs app extending the Docus layer
│   ├── app/                 # Docs-site-specific app config/plugins
│   ├── content/             # Documentation content
│   └── nuxt.config.ts       # Docs-site config
├── layer/                   # Reusable Docus Nuxt layer
│   ├── app/                 # Layouts, pages, components, composables
│   ├── i18n/                # Locale message files
│   ├── modules/             # Docus Nuxt modules
│   ├── server/              # MCP tools, search, sitemap, content helpers
│   └── nuxt.config.ts       # Layer composition root
├── playground/              # Minimal local consumer for manual testing
├── scripts/                 # Env/bootstrap helper scripts
├── package.json             # Workspace scripts
└── pnpm-workspace.yaml      # Workspace package definitions
```
