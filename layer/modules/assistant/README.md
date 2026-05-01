# Assistant Module

A Nuxt module that provides an AI-powered chat interface using MCP (Model Context Protocol) tools.

## Features

- AI chat slideover component with streaming responses
- Floating input component for quick questions
- MCP tools integration for documentation search
- Full-document search across titles, headings, paths, descriptions, and page body content
- Fuse.js fuzzy fallback for typo-tolerant retrieval
- Syntax highlighting for code blocks
- FAQ suggestions
- Persistent chat state
- Keyboard shortcuts support

## Installation

1. Copy the `modules/assistant` folder to your Nuxt project
2. Install the required dependencies:

```bash
pnpm add @ai-sdk/mcp @ai-sdk/vue @ai-sdk/gateway @ai-sdk/google @ai-sdk/openai-compatible ai motion-v shiki shiki-stream flexsearch fuse.js
```

3. Add the module to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['./modules/assistant'],

  tockdocs: {
    assistant: {
      apiPath: '/__tockdocs__/assistant',
      mcpServer: '/mcp',
      model: 'google/gemini-3-flash',
    },
  },
})
```

4. Configure a model provider.

**Vercel AI Gateway**

```bash
AI_PROVIDER=vercel
AI_MODEL=google/gemini-3-flash
# Use AI_GATEWAY_API_KEY for manual keys; Vercel reserves the VERCEL_* prefix.
AI_GATEWAY_API_KEY=your-api-key
# or rely on Vercel OIDC via VERCEL_OIDC_TOKEN
```

**Other supported providers**

```bash
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=minimax/minimax-m2.5:free

# or deepseek / nvidia / huggingface / groq / github / gemini / cloudflare
```

> **Note:** The module now supports Vercel AI Gateway, OpenRouter, DeepSeek, Nvidia, Hugging Face Router, Groq, GitHub Models, Gemini, and Cloudflare Workers AI. The assistant UI is enabled in dev, when `NUXT_PUBLIC_ASSISTANT_ENABLED=true`, or when supported provider credentials are present.

## Usage

Add the components to your app:

```vue
<template>
  <div>
    <!-- Button to open the chat -->
    <AssistantChat />

    <!-- Chat panel (place once in your app/layout) -->
    <AssistantPanel />
  </div>
</template>
```

### FAQ Questions

Configure FAQ questions in your `app.config.ts`:

```ts
export default defineAppConfig({
  assistant: {
    faqQuestions: [
      {
        category: 'Getting Started',
        items: ['How do I install?', 'How do I configure?'],
      },
      {
        category: 'Advanced',
        items: ['How do I customize?'],
      },
    ],
  },
})
```

You can also use localized FAQ questions:

```ts
export default defineAppConfig({
  assistant: {
    faqQuestions: {
      en: ['How do I install?', 'How do I configure?'],
      fr: ['Comment installer ?', 'Comment configurer ?'],
    },
  },
})
```

### Floating Input

Use `AssistantFloatingInput` for a floating input at the bottom of the page.

**Recommended:** Use `Teleport` to render the floating input at the body level, ensuring it stays fixed at the bottom regardless of your component hierarchy:

```vue
<template>
  <div>
    <!-- Teleport to body for proper fixed positioning -->
    <Teleport to="body">
      <ClientOnly>
        <LazyAssistantFloatingInput />
      </ClientOnly>
    </Teleport>

    <!-- Chat panel (required to display responses) -->
    <AssistantPanel />
  </div>
</template>
```

The floating input:

- Appears at the bottom center of the viewport
- Automatically hides when the chat slideover is open
- Expands on focus for better typing experience
- Supports keyboard shortcuts: `⌘I` to focus, `Escape` to blur

### Programmatic Control

Use the `useAssistant` composable to control the chat:

```vue
<script setup>
const { open, close, toggle, isOpen, messages, clearMessages } = useAssistant()

// Open chat with an initial message
open('How do I install the module?')

// Open and clear previous messages
open('New question', true)

// Toggle chat visibility
toggle()

// Clear all messages
clearMessages()
</script>
```

## Module Options

| Option      | Type     | Default                   | Description                                                                                                                        |
| ----------- | -------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `apiPath`   | `string` | `/__tockdocs__/assistant` | API endpoint path for the chat                                                                                                     |
| `mcpServer` | `string` | `/mcp`                    | MCP server path or full URL (e.g., `https://docs.example.com/mcp` for external servers)                                            |
| `provider`  | `string` | auto                      | Optional provider override (`vercel`, `openrouter`, `deepseek`, `nvidia`, `huggingface`, `groq`, `github`, `gemini`, `cloudflare`) |
| `model`     | `string` | provider default          | Optional model override for the configured provider                                                                                |

## Components

### `<AssistantChat>`

Button to toggle the chat panel. The tooltip text is automatically translated using i18n (`assistant.tooltip`).

### `<AssistantPanel>`

Main chat interface displayed as a side panel. Configuration is done via `app.config.ts` (see FAQ Questions section above).

### `<AssistantFloatingInput>`

Floating input field positioned at the bottom of the viewport. No props required.

**Keyboard shortcuts:**

- `⌘I` / `Ctrl+I` - Focus the input
- `Escape` - Blur the input
- `Enter` - Submit the question

## Composables

### `useAssistant`

Main composable for controlling the chat state.

```ts
const {
  isOpen, // Ref<boolean> - Whether the chat is open
  messages, // Ref<UIMessage[]> - Chat messages
  pendingMessage, // Ref<string | undefined> - Pending message to send
  faqQuestions, // ComputedRef<FaqCategory[]> - FAQ questions from config
  open, // (message?: string, clearPrevious?: boolean) => void
  close, // () => void
  toggle, // () => void
  clearMessages, // () => void
  clearPending, // () => void
} = useAssistant()
```

### `useHighlighter`

Composable for syntax highlighting code blocks with Shiki.

## Requirements

- Nuxt 4.x
- Nuxt UI 3.x (for `USlideover`, `UButton`, `UTextarea`, `UChatMessages`, etc.)
- An MCP server running (path configurable via `mcpServer`)
- Built-in TockDocs MCP tools: `search-pages`, `list-pages`, and `get-page`
- Server credentials for one supported provider, or Vercel AI Gateway auth
- Optional `NUXT_PUBLIC_ASSISTANT_ENABLED=true` to expose the UI explicitly in production

## Customization

### Retrieval Strategy

The embedded assistant works best with the built-in TockDocs MCP tools:

- `search-pages` — full-document retrieval across titles, descriptions, headings, paths, and body text
- `list-pages` — structure browsing by page metadata
- `get-page` — full markdown retrieval for a specific page

By default, the assistant is prompted to:

- use `search-pages` first for factual questions and troubleshooting
- use `list-pages` for high-level exploration
- use `get-page` after search when it needs full context or code examples

`search-pages` uses FlexSearch for the primary pass and Fuse.js as a fuzzy fallback, so the assistant is more tolerant of minor typos.

### System Prompt

To customize the AI's behavior, edit the system prompt in:
`runtime/server/api/search.ts`

### Styling

The components use Nuxt UI and Tailwind CSS design tokens. Customize the appearance by modifying the component files or overriding the UI props.
