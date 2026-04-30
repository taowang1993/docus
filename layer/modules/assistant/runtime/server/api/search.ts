import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, streamText } from 'ai'
import type { ToolCallPart, ToolSet, UIMessageStreamWriter } from 'ai'
import { createMCPClient } from '@ai-sdk/mcp'
import type { H3Event } from 'h3'
import { getDefaultLocale, resolveDocsRoute } from '../../../../../utils/docs'
import { createAssistantChatModel, getAssistantProviderConfig } from '../utils/ai-provider'

const MAX_STEPS = 10

function logAssistant(step: string, data: Record<string, unknown>) {
  console.info(`[docus-assistant] ${JSON.stringify({ step, ...data })}`)
}

function createLocalFetch(event: H3Event): typeof fetch {
  const origin = getRequestURL(event).origin

  return (input, init) => {
    const requestUrl = input instanceof URL
      ? input
      : typeof input === 'string'
        ? new URL(input, origin)
        : new URL(input.url)
    const localPath = requestUrl.origin === origin
      ? `${requestUrl.pathname}${requestUrl.search}`
      : requestUrl.toString()

    return event.fetch(localPath, init)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stopWhenResponseComplete({ steps }: { steps: any[] }): boolean {
  const lastStep = steps.at(-1)
  if (!lastStep) return false

  const hasText = Boolean(lastStep.text && lastStep.text.trim().length > 0)
  const hasNoToolCalls = !lastStep.toolCalls || lastStep.toolCalls.length === 0

  if (hasText && hasNoToolCalls) return true

  return steps.length >= MAX_STEPS
}

function getSystemPrompt(siteName: string, scopeLabel?: string) {
  return `You are the documentation assistant for ${siteName}. Help users navigate and understand the project documentation.

**Your identity:**
- You are an assistant helping users with ${siteName} documentation
- NEVER use first person ("I", "me", "my") - always refer to the project by name: "${siteName} provides...", "${siteName} supports...", "The project offers..."
- Be confident and knowledgeable about the project
- Speak as a helpful guide, not as the documentation itself
${scopeLabel ? `- You are currently scoped to the ${scopeLabel} knowledge base context. Prefer answers from that scope.` : ''}

**Tool usage (CRITICAL):**
- You have tools: search-pages (full-document search), list-pages (browse structure), and get-page (read a page)
- For substantive documentation questions, use a documentation tool before answering so the response stays grounded in the docs
- Use search-pages first for most documentation questions, especially factual questions, troubleshooting, configuration details, or anything that may be buried in page content
- You may answer simple greetings, acknowledgements, or purely meta/UI questions without tools when no docs lookup is needed
- Use list-pages when the user is exploring sections, categories, or page names
- If you already know the exact page path and need the full markdown, use get-page directly
- After search-pages finds a likely match, use get-page when more context, exact wording, or code examples would help
- Do not answer from prior knowledge when the docs tools can verify the answer
- ALWAYS respond with text after using tools - never end with just tool calls

**Guidelines:**
- If you can't find something, say "There is no documentation on that yet" or "${siteName} doesn't cover that topic yet"
- Be concise, helpful, and direct
- Guide users like a friendly expert would

**Links and exploration:**
- Tool results include a \`url\` for each page — prefer markdown links \`[label](url)\` so users can open the doc in one click
- When it helps, add extra links (related pages, “read more”, side topics) — make the answer easy to dig into, not a wall of text
- Stick to URLs from tool results (\`url\` / \`path\`) so links stay valid

**FORMATTING RULES (CRITICAL):**
- NEVER use markdown headings (#, ##, ###, etc.)
- Use **bold text** for emphasis and section labels
- Start responses with content directly, never with a heading
- Use bullet points for lists
- Keep code examples focused and minimal

**Response style:**
- Conversational but professional
- "Here's how you can do that:" instead of "The documentation shows:"
- "${siteName} supports TypeScript out of the box" instead of "I support TypeScript"
- Provide actionable guidance, not just information dumps`
}

function getAssistantScope(event: H3Event) {
  const config = useRuntimeConfig(event).public as Parameters<typeof resolveDocsRoute>[1]
  const referer = getRequestHeader(event, 'referer')

  if (!referer) {
    return {
      kb: undefined,
      locale: getDefaultLocale(config),
      scopeLabel: undefined,
    }
  }

  try {
    const refererPath = new URL(referer).pathname
    const resolved = resolveDocsRoute(refererPath, config)

    return {
      kb: resolved.kb,
      locale: resolved.locale || getDefaultLocale(config),
      scopeLabel: resolved.kb ? `${resolved.kb}${resolved.locale ? `/${resolved.locale}` : ''}` : undefined,
    }
  }
  catch {
    return {
      kb: undefined,
      locale: getDefaultLocale(config),
      scopeLabel: undefined,
    }
  }
}

export default defineEventHandler(async (event) => {
  const startedAt = performance.now()
  const { messages } = await readBody(event)
  const config = useRuntimeConfig(event)
  const siteConfig = getSiteConfig(event)
  const siteName = siteConfig.name || 'Documentation'
  const providerConfig = getAssistantProviderConfig(event)
  const assistantScope = getAssistantScope(event)

  const mcpServer = config.assistant.mcpServer
  const isExternalUrl = mcpServer.startsWith('http://') || mcpServer.startsWith('https://')
  const baseURL = config.app?.baseURL?.replace(/\/$/, '') || ''
  const requestPath = getRequestURL(event).pathname
  const mcpUrl = new URL(mcpServer, getRequestURL(event).origin)

  if (assistantScope.kb) {
    mcpUrl.searchParams.set('kb', assistantScope.kb)
  }

  if (assistantScope.locale) {
    mcpUrl.searchParams.set('locale', assistantScope.locale)
  }

  let transport: Parameters<typeof createMCPClient>[0]['transport']
  let transportMode = 'internal-local-fetch'

  if (isExternalUrl) {
    transportMode = 'external-http'
    transport = {
      type: 'http',
      url: mcpUrl.toString(),
    }
  }
  else if (import.meta.dev) {
    transportMode = 'internal-dev-http'
    transport = {
      type: 'http',
      url: `${getRequestURL(event).origin}${baseURL}${mcpUrl.pathname}${mcpUrl.search}`,
    }
  }
  else {
    transport = {
      type: 'http',
      url: `${getRequestURL(event).origin}${baseURL}${mcpUrl.pathname}${mcpUrl.search}`,
      fetch: createLocalFetch(event),
    }
  }

  logAssistant('request_start', {
    requestPath,
    provider: providerConfig.provider,
    model: providerConfig.model,
    kb: assistantScope.kb,
    locale: assistantScope.locale,
    mcpServer,
    transportMode,
    transportUrl: transport.url,
    messageCount: Array.isArray(messages) ? messages.length : 0,
  })

  const httpClient = await createMCPClient({ transport })
  const mcpTools = await httpClient.tools()

  logAssistant('mcp_tools_loaded', {
    requestPath,
    toolCount: Object.keys(mcpTools).length,
    toolNames: Object.keys(mcpTools),
  })

  let toolCallCount = 0

  const stream = createUIMessageStream({
    execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
      try {
        const modelMessages = await convertToModelMessages(messages)
        const result = streamText({
          model: createAssistantChatModel(event),
          maxOutputTokens: 4000,
          maxRetries: 2,
          stopWhen: stopWhenResponseComplete,
          system: getSystemPrompt(siteName, assistantScope.scopeLabel),
          messages: modelMessages,
          tools: mcpTools as ToolSet,
          onStepFinish: ({ toolCalls }: { toolCalls: ToolCallPart[] }) => {
            if (toolCalls.length === 0) return

            toolCallCount += toolCalls.length

            logAssistant('tool_calls', {
              requestPath,
              provider: providerConfig.provider,
              model: providerConfig.model,
              toolCalls: toolCalls.map((tc: ToolCallPart) => tc.toolName),
            })

            writer.write({
              id: toolCalls[0]?.toolCallId,
              type: 'data-tool-calls',
              data: {
                tools: toolCalls.map((tc: ToolCallPart) => {
                  const args = 'args' in tc ? tc.args : 'input' in tc ? tc.input : {}
                  return {
                    toolName: tc.toolName,
                    toolCallId: tc.toolCallId,
                    args,
                  }
                }),
              },
            })
          },
        })
        writer.merge(result.toUIMessageStream())
      }
      catch (error) {
        logAssistant('request_error', {
          requestPath,
          provider: providerConfig.provider,
          model: providerConfig.model,
          durationMs: Number((performance.now() - startedAt).toFixed(1)),
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    },
    onFinish: async () => {
      await httpClient.close()
      logAssistant('request_finish', {
        requestPath,
        provider: providerConfig.provider,
        model: providerConfig.model,
        durationMs: Number((performance.now() - startedAt).toFixed(1)),
        toolCallCount,
      })
    },
  })

  return createUIMessageStreamResponse({ stream })
})
