# AGENTS.md

## Overview

TockDocs is an AI-powered Knowledge Management System built around a reusable **Nuxt layer**.

- **`layer/`** is the main product: the TockDocs theme, layouts, routing, knowledge-base/content resolution, server utilities, AI assistant, MCP tools, and shared runtime assets.
- **`docs/`** is the official documentation site (`tockdocs.dev`) and a real consumer of the layer.
- **`playground/`** is a lightweight local consumer used to validate the layer in isolation.
- **`cli/`** publishes `create-tockdocs`, which scaffolds new projects from the starter templates.
- **`.starters/`** contains the `default` and `i18n` templates consumed by the CLI.

The repo’s core architecture is: **build TockDocs once as an AI-powered Nuxt layer, then reuse it across the docs site, playground, and generated starter projects**.

## Tech Stack

| Tech                                  | Use Case      |
| ------------------------------------- | ------------- |
| pnpm, Node.js, TypeScript, release-it | Workspace     |
| Nuxt 4 + Vue 3                        | App Framework |
| Nuxt Content, MDC, Shiki, Nuxt Image  | Content       |
| Nuxt UI, Tailwind CSS 4, Iconify      | UI            |
| Nuxt i18n                             | Localization  |
| AI SDK                                | Assistant     |
| FlexSearch, Fuse.js, MCP toolkit      | Search        |
| Nuxt OG Image, Nuxt LLMs, Robots      | Metadata      |
| npm packages                          | Publishing    |

## Environment Variables

The repo loads `.env` / `.env.local` through `scripts/run-dev.mjs` and `scripts/with-env.mjs`.

| Env Var                       | Use Case                     |
| ----------------------------- | ---------------------------- |
| NUXT_PORT                     | Local Dev Port               |
| NUXT_APP_BASE_URL             | Deployment Base Path         |
| NUXT_SITE_URL                 | Canonical Site URL           |
| AI_PROVIDER                   | Assistant Provider           |
| AI_MODEL                      | Model Override               |
| AI_GATEWAY_API_KEY            | Vercel AI Gateway            |
| VERCEL_OIDC_TOKEN             | Vercel AI Gateway OIDC auth  |
| OPENROUTER_API_KEY            | OpenRouter Access            |
| OPENROUTER_MODEL              | OpenRouter Model             |
| DEEPSEEK_API_KEY              | DeepSeek Access              |
| DEEPSEEK_MODEL                | DeepSeek Model               |
| NVIDIA_API_KEY                | NVIDIA Access                |
| NVIDIA_MODEL                  | NVIDIA Model                 |
| HUGGINGFACE_API_KEY           | Hugging Face Access          |
| HUGGINGFACE_MODEL             | Hugging Face Model           |
| GROQ_API_KEY                  | Groq Access                  |
| GROQ_MODEL                    | Groq Model                   |
| GITHUB_TOKEN                  | GitHub Models Access         |
| GITHUB_MODEL                  | GitHub Model                 |
| GEMINI_API_KEY                | Gemini Access                |
| GEMINI_MODEL                  | Gemini Model                 |
| CLOUDFLARE_ACCOUNT_ID         | Cloudflare Account           |
| CLOUDFLARE_API_TOKEN          | Cloudflare API Token         |
| CLOUDFLARE_MODEL              | Cloudflare Model             |
| STUDIO_GITHUB_CLIENT_ID       | Nuxt Studio GitHub Client    |
| STUDIO_GITHUB_CLIENT_SECRET   | Nuxt Studio GitHub Secret    |
| STUDIO_GITHUB_MODERATORS      | Nuxt Studio Access Allowlist |
| NUXT_PUBLIC_ASSISTANT_ENABLED | Force Enable Assistant       |

## Deployment

### Docs Site

The official docs app lives in `docs/`, extends `tockdocs` from `layer/`, and is deployed directly from `docs/` (template-style Vercel setup).

Important deployment facts:

- For Vercel deployments, point the project at `docs/`; `docs/package.json` prepares the layer before `nuxt build`, so no `vercel.json` is needed in that setup
- Verification command: `pnpm run verify`
- Site config is defined in `docs/nuxt.config.ts`
- Nitro prerendering, sitemap generation, robots output, OG image generation, `llms.txt` support, and the Vercel `/tmp/contents.sqlite` setup are configured through the layer
- Set `NUXT_SITE_URL` to the public deployment URL for the site (for example `https://tockdocs-pi-nine.vercel.app`)
- Keep `NUXT_APP_BASE_URL=/` for the site root unless the site is hosted under a subpath

### Nuxt Studio

- The Studio admin route is `/admin`
- Add `STUDIO_GITHUB_CLIENT_ID` and `STUDIO_GITHUB_CLIENT_SECRET` to the deployment environment
- Optionally set `STUDIO_GITHUB_MODERATORS` to restrict access to specific GitHub emails
- Configure the GitHub OAuth callback URL to `https://<your-domain>/__nuxt_studio/auth/github`
- Open Studio after deployment at `https://<your-domain>/admin`

### Package Publishing

This repo also publishes two packages:

- `tockdocs` from `layer/`
- `create-tockdocs` from `cli/`

CI (`.github/workflows/ci.yml`) installs dependencies, prepares Nuxt types, lints, typechecks, builds the CLI, and validates package publishability.

## Architecture

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
        │ TockDocs Nuxt  │              │ create-tockdocs│
        │ layer/product  │              │ scaffolder     │
        └───────┬────────┘              └───────┬────────┘
                │                              uses
     extends    │                               │
                │                        ┌──────▼──────────────────┐
        ┌───────▼────────┐               │ .starters/default       │
        │    docs/       │               │ .starters/i18n          │
        │ official site  │               └─────────────────────────┘
        └───────┬────────┘
                │
        ┌───────▼────────┐
        │ playground/    │
        │ dev harness    │
        └────────────────┘

Inside layer/

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
     │ header/footer       │         │ MCP tools · sitemap route           │
     │ docs navigation UI  │         └───────────┬─────────────────────────┘
     └──────────┬──────────┘                     │
                │                                │
                │ renders                        │ queries
                │                                │
         ┌──────▼───────┐                ┌───────▼──────────┐
         │ Nuxt Content │                │ FlexSearch +     │
         │ collections  │                │ Fuse.js index    │
         └──────────────┘                └──────────────────┘

Assistant path

User → AssistantPanel.vue → /__tockdocs__/assistant → AI provider resolver
     → MCP client/server → search-pages | list-pages | get-page
     → Nuxt Content + hybrid search → streamed grounded answer
```

TockDocs is organized as a **layered monorepo**:

1. **Workspace orchestration** at the root controls shared scripts, linting, typechecking, and release workflows.
2. **`layer/`** is the composition root for the product. Its `nuxt.config.ts` wires in local modules (`config`, `routing`, `markdown-rewrite`, `skills`, `css`, `assistant`) plus Nuxt ecosystem modules.
3. **`layer/app/`** provides the UI shell: header/footer, docs layout, page rendering, left navigation, right TOC, and shared composables.
4. **`layer/server/`** provides content-aware server behavior: locale/content helpers, sitemap generation, and MCP tools.
5. **`layer/modules/assistant/`** implements the docs-grounded AI assistant. The client streams chat to a server endpoint, which selects an AI provider, connects to an MCP server, and exposes TockDocs MCP tools to the model.
6. **Hybrid docs retrieval** is implemented in `layer/server/utils/docs-search.ts` using FlexSearch for primary retrieval and Fuse.js for fuzzy fallback.
7. **`docs/`**, **`playground/`**, and generated starter projects are consumers of the same layer architecture.

## Project Structure

```text
.
├── .context/                # Local project context docs for assistants
├── .github/                 # CI and PR-related repo automation
├── .starters/               # CLI starter templates (default, i18n)
├── cli/                     # create-tockdocs package
│   ├── cli.ts               # CLI command definition
│   └── main.ts              # CLI entrypoint
├── docs/                    # Official docs app extending the TockDocs layer
│   ├── app/                 # Docs-site-specific app config/plugins
│   ├── content/             # Documentation content
│   └── nuxt.config.ts       # Docs-site config
├── layer/                   # Reusable TockDocs Nuxt layer
│   ├── app/                 # Layouts, pages, components, composables
│   ├── i18n/                # Locale message files
│   ├── modules/             # TockDocs Nuxt modules
│   ├── server/              # MCP tools, search, sitemap, content helpers
│   └── nuxt.config.ts       # Layer composition root
├── playground/              # Minimal local consumer for manual testing
├── scripts/                 # Env/bootstrap helper scripts
├── package.json             # Workspace scripts
└── pnpm-workspace.yaml      # Workspace package definitions
```

## Local agent skills

- `.agents/skills/nuxt`: Symlink to `.codex/skills/nuxt` so local agent tooling follows the generated Nuxt wrapper automatically.
- `.codex/skills/nuxt/SKILL.md`: Stable wrapper for the generated `docs/.nuxt/skill-hub/nuxt` tree.

## Development Guidelines

- Do not run `pnpm dev`, `nuxt dev`, or other long-running app processes unless the user explicitly asks for it.
- Before every commit, run `pnpm run precommit`. The repo installs a versioned Git pre-commit hook from `.githooks/pre-commit`; do not bypass it.
- Keep Markdown edits targeted. Do not run repo-wide Markdown formatting commands that can reflow ASCII diagrams; `pnpm run check:diagrams` verifies those snapshots.
- Knowledge-base changes are route + content changes. Keep `docs/content/<kb>/kb.yml`, localized content paths, and landing/docs links aligned with the public `/docs/<kb>/<locale>/...` routes.
- When opening or updating a PR, use `.github/PR.md` as the source template. If it is missing, copy the current draft from `.github/workflows/PR.md` first.
