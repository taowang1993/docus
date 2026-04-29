# AGENTS.md

## Overview

Docus is a pnpm monorepo for a documentation product built around a reusable **Nuxt layer**.

- **`layer/`** is the main product: the Docus theme, layouts, routing, server utilities, AI assistant, MCP tools, and shared runtime assets.
- **`docs/`** is the official documentation site (`docus.dev`) and a real consumer of the layer.
- **`playground/`** is a lightweight local consumer used to validate the layer in isolation.
- **`cli/`** publishes `create-docus`, which scaffolds new projects from the starter templates.
- **`.starters/`** contains the `default` and `i18n` templates consumed by the CLI.

The repo’s core architecture is: **build Docus once as a Nuxt layer, then reuse it across the docs site, playground, and generated starter projects**.

## Tech Stack

- **Monorepo / Tooling:** pnpm workspace, Node.js 22, TypeScript, ESLint, release-it
- **Framework:** Nuxt 4 + Vue 3
- **Docs/content:** `@nuxt/content`, MDC, Shiki, Nuxt Image
- **UI:** `@nuxt/ui`, Tailwind CSS 4, Iconify icons
- **Internationalization:** `@nuxtjs/i18n`
- **AI assistant:** AI SDK (`ai`, `@ai-sdk/vue`, `@ai-sdk/mcp`, provider SDKs)
- **Search / grounding:** FlexSearch + Fuse.js hybrid retrieval, MCP tools via `@nuxtjs/mcp-toolkit`
- **Site metadata / deployment helpers:** `nuxt-og-image`, `nuxt-llms`, `@nuxtjs/robots`
- **Publishing:** npm packages for `docus` and `create-docus`

## Environment Variables

The repo loads `.env` / `.env.local` through `scripts/run-dev.mjs` and `scripts/with-env.mjs`.

### Core runtime

- `NUXT_PORT=4987` — local dev port used by Docus scripts
- `NUXT_APP_BASE_URL=/` — base URL for root deployments
- `NUXT_SITE_URL=http://127.0.0.1:4987` — canonical site URL used for site metadata and `llms.txt`

### Assistant provider selection

- `AI_PROVIDER` — one of `vercel`, `openrouter`, `deepseek`, `nvidia`, `huggingface`, `groq`, `github`, `gemini`, `cloudflare`
- `AI_MODEL` — optional global model override for the selected provider
- `NUXT_PUBLIC_ASSISTANT_ENABLED=false` — force-show the assistant UI in production

### Provider-specific assistant credentials

- `VERCEL_API_KEY`
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`
- `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`
- `NVIDIA_API_KEY`, `NVIDIA_MODEL`
- `HUGGINGFACE_API_KEY`, `HUGGINGFACE_MODEL`
- `GROQ_API_KEY`, `GROQ_MODEL`
- `GITHUB_TOKEN`, `GITHUB_MODEL`
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_MODEL`

In development, the assistant UI is enabled automatically. In production, it is enabled when credentials are present or when `NUXT_PUBLIC_ASSISTANT_ENABLED=true`.

## Deployment

### Docs site

The official docs app lives in `docs/` and extends `docus` from `layer/`.

Important deployment facts:

- build command: `pnpm run docs:build`
- verification command: `pnpm run verify`
- site config is defined in `docs/nuxt.config.ts`
- Nitro prerendering, sitemap generation, robots output, OG image generation, and `llms.txt` support are configured through the layer
- set `NUXT_SITE_URL` correctly for the target environment
- keep `NUXT_APP_BASE_URL=/` for normal root deployments unless the site is hosted under a subpath

### Package publishing

This repo also publishes two packages:

- `docus` from `layer/`
- `create-docus` from `cli/`

CI (`.github/workflows/ci.yml`) installs dependencies, prepares Nuxt types, lints, typechecks, builds the CLI, and validates package publishability.

## Architecture

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

## Development Guidelines

- Do not run `pnpm dev`, `nuxt dev`, or other long-running app processes manually unless the user explicitly asks for it.
- Preferred validation commands are `pnpm run dev:prepare`, `pnpm run lint`, `pnpm run typecheck`, and `pnpm run docs:build`.
- Use `pnpm run verify` before shipping larger changes when time permits.
- The docs site extends `../layer`; when debugging app behavior, determine whether the source of truth lives in `docs/` or `layer/`.
- Assistant behavior is docs-grounded through MCP tools (`search-pages`, `list-pages`, `get-page`); changes to the assistant should preserve that grounding model.
- Search changes should be evaluated against both FlexSearch and Fuse.js fallback behavior.
- When opening or updating a PR, use `.github/PR.md` as the source template. If that file is missing in the current checkout, copy the current draft from `.github/workflows/PR.md` first.
