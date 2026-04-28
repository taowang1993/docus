# Docus assistant internals

## Overview

The Docus assistant is a docs-grounded chat surface built on top of:

- **AI SDK** for chat/model orchestration
- **MCP** for documentation tools
- **FlexSearch** for primary full-text retrieval
- **Fuse.js** for fuzzy fallback retrieval

The assistant is intentionally grounded in the documentation rather than relying on the model's prior knowledge.

## Runtime pieces

### Client

The UI lives in the assistant runtime components and composables:

- `layer/modules/assistant/runtime/components/AssistantPanel.vue`
- `layer/modules/assistant/runtime/components/AssistantChat.vue`
- `layer/modules/assistant/runtime/components/AssistantFloatingInput.vue`
- `layer/modules/assistant/runtime/composables/useAssistant.ts`

The chat panel uses `@ai-sdk/vue` + `DefaultChatTransport` and posts to:

- `config.public.assistant.apiPath`
- default: `/__docus__/assistant`

### Server

The server endpoint is:

- `layer/modules/assistant/runtime/server/api/search.ts`

That route:

1. resolves the active AI provider/model
2. connects to the configured MCP server
3. exposes MCP tools to the model
4. streams the result back to the UI

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
- `VERCEL_API_KEY`
- provider-specific key/model vars such as `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`, etc.

If `AI_PROVIDER` is unset, Docus auto-detects the first configured provider from runtime config.

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

#### `list-pages`

Use this for structure browsing:

- sections
- categories
- page discovery by title/path/description

#### `get-page`

Use this when the exact page path is known and the assistant needs full markdown context.

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

### Grounding behavior

The assistant prompt strongly biases the model toward using tools for substantive documentation questions.

Current behavior:

- substantive docs questions should use MCP tools before answering
- `search-pages` is preferred first
- `get-page` is used for deeper reads
- simple greetings / acknowledgement / purely meta UI questions may be answered without tools

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
