# Docus assistant internals

## Overview

The Docus assistant is a docs-grounded chat surface built on top of:

- **AI SDK** for chat/model orchestration
- **MCP** for documentation tools
- **FlexSearch** for primary full-text retrieval
- **Fuse.js** for fuzzy fallback retrieval

It is intentionally tool-grounded. The assistant should prefer documentation tools before answering substantive questions, and it scopes itself to the current knowledge base and locale whenever the request comes from a docs page.

## Runtime pieces

### Client

The UI lives in the assistant runtime components and composables:

- `layer/modules/assistant/runtime/components/AssistantPanel.vue`
- `layer/modules/assistant/runtime/components/AssistantChat.vue`
- `layer/modules/assistant/runtime/components/AssistantFloatingInput.vue`
- `layer/modules/assistant/runtime/composables/useAssistant.ts`

The chat panel uses `@ai-sdk/vue` + `DefaultChatTransport` and posts to `config.public.assistant.apiPath`:

- default: `/__docus__/assistant`

The preferred module config lives under `docus.assistant` in `nuxt.config.ts`. The legacy top-level `assistant` config is still read for compatibility, but it logs a deprecation warning.

The assistant UI is enabled when:

- the app is running in dev, or
- `NUXT_PUBLIC_ASSISTANT_ENABLED=true`, or
- supported provider credentials are present

When none of those are true, the module registers disabled assistant components instead of the live chat UI.

### Server

The server endpoint is:

- `layer/modules/assistant/runtime/server/api/search.ts`

That route:

1. resolves the active AI provider/model
2. derives the current knowledge-base scope from the request referer when possible
3. connects to the configured MCP server
4. exposes MCP tools to the model
5. streams the result back to the UI

The MCP server target comes from `docus.assistant.mcpServer`:

- default: `/mcp`
- it can also be an external URL such as `https://docs.example.com/mcp`

## Model providers

Provider selection is handled in:

- `layer/modules/assistant/runtime/server/utils/ai-provider.ts`

Supported values for `AI_PROVIDER`:

- `vercel`
- `openrouter`
- `deepseek`
- `nvidia`
- `huggingface`
- `groq`
- `github`
- `gemini`
- `cloudflare`

Important env vars:

- `AI_PROVIDER`
- `AI_MODEL`
- `AI_GATEWAY_API_KEY`
- `VERCEL_OIDC_TOKEN`
- provider-specific key/model vars such as `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`, `GITHUB_TOKEN`, `GEMINI_API_KEY`, and `CLOUDFLARE_API_TOKEN`

If `AI_PROVIDER` is unset, Docus auto-detects the first configured provider from runtime config or environment credentials. Vercel AI Gateway is the fallback provider when no explicit provider is set.

## MCP tool layer

The assistant uses MCP tools, not direct content access from the model.

Built-in tools:

- `search-pages`
- `list-pages`
- `get-page`

Files:

- `layer/server/mcp/tools/search-pages.ts`
- `layer/server/mcp/tools/list-pages.ts`
- `layer/server/mcp/tools/get-page.ts`

### Tool roles

#### `search-pages`

Use this for most documentation questions.

It performs full-document retrieval across:

- title
- description
- headings
- path tokens
- body content

It also accepts optional `kb` and `locale` filters in multi-knowledge-base sites.

#### `list-pages`

Use this for structure browsing:

- sections
- categories
- page discovery by title/path/description

It is also KB-aware and supports `kb` and `locale` filters.

#### `get-page`

Use this when the exact page path is known and the assistant needs full markdown context.

In KB-first sites, paths look like `/docs/<kb>/<locale>/...`.

## Search implementation

The primary search implementation lives in:

- `layer/server/utils/docs-search.ts`

### Indexing

For each searchable documentation page, Docus builds a per-process in-memory search index using:

- **FlexSearch** for primary retrieval
- **Fuse.js** for fuzzy fallback

The index excludes navigation-only entries such as:

- `.navigation`
- `/.navigation`

Filtering helpers live in:

- `layer/server/utils/content.ts`

### Search flow

1. query FlexSearch first
2. if results are weak, run Fuse.js fallback
3. merge + rerank candidates
4. return compact search results with:
   - `title`
   - `description`
   - `path`
   - `url`
   - `locale`
   - `excerpt`

## Grounding behavior

The assistant prompt strongly biases the model toward using tools for substantive documentation questions.

Current behavior:

- substantive docs questions should use MCP tools before answering
- `search-pages` is preferred first
- `get-page` is used for deeper reads
- simple greetings, acknowledgements, or purely meta UI questions may be answered without tools

This means Docus is **tool-grounded by design**, but not absolutely tool-forced for trivial non-doc interactions.

## Logs

### Assistant logs

Prefix:

- `[docus-assistant]`

Important events:

- `request_start`
- `mcp_tools_loaded`
- `tool_calls`
- `request_finish`
- `request_error`

`request_finish` includes `toolCallCount`, which is the easiest way to see whether a request actually used retrieval.

### Search logs

Prefix:

- `[docus-docs-search]`

Important events:

- `build_index`
- `search`

`search` includes:

- `candidateCount`
- `usedFuseFallback`
- `resultCount`
- `topPaths`

## How to tell whether hybrid retrieval worked

### FlexSearch-only success

Typical log pattern:

- `[docus-assistant] ... tool_calls ... search-pages`
- `[docus-docs-search] ... usedFuseFallback:false ...`
- `[docus-assistant] ... request_finish ... toolCallCount > 0`

### Fuse fallback success

Typical log pattern:

- `[docus-assistant] ... tool_calls ... search-pages`
- `[docus-docs-search] ... usedFuseFallback:true ...`
- `[docus-assistant] ... request_finish ... toolCallCount > 0`

## Dev defaults

- dev port: `4987`
- default local `NUXT_SITE_URL`: `http://127.0.0.1:4987`
- default locale: `en`

The local site URL uses `127.0.0.1` instead of `localhost` to avoid Nuxt Site Config warnings about localhost URLs.
