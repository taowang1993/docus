import type { UIMessage } from 'ai'
import { useAppConfig, useRuntimeConfig, useState } from '#imports'
import { useMediaQuery } from '@vueuse/core'
import { computed } from 'vue'
import type { FaqCategory, FaqQuestions, LocalizedFaqQuestions } from '../types'

function normalizeFaqQuestions(questions: FaqQuestions): FaqCategory[] {
  if (!questions || (Array.isArray(questions) && questions.length === 0)) {
    return []
  }

  if (typeof questions[0] === 'string') {
    return [{
      category: 'Questions',
      items: questions as string[],
    }]
  }

  return questions as FaqCategory[]
}

const PANEL_WIDTH_COMPACT = 352
const PANEL_WIDTH_EXPANDED = 520
const PANEL_WIDTH_MIN = 320
const PANEL_WIDTH_MAX = 520

function clampDesktopAssistantWidth(width: number) {
  return Math.min(PANEL_WIDTH_MAX, Math.max(PANEL_WIDTH_MIN, Math.round(width)))
}

export function useAssistant() {
  const config = useRuntimeConfig()
  const appConfig = useAppConfig()
  const assistantRuntimeConfig = config.public.assistant as { enabled?: boolean } | undefined
  const assistantConfig = appConfig.assistant as { faqQuestions?: FaqQuestions | LocalizedFaqQuestions } | undefined
  const docusRuntimeConfig = appConfig.docus as { locale?: string } | undefined
  const isEnabled = computed(() => assistantRuntimeConfig?.enabled ?? false)

  const isOpen = useState('assistant-open', () => false)
  const isResizing = useState('assistant-resizing', () => false)
  const desktopWidth = useState('assistant-desktop-width', () => PANEL_WIDTH_COMPACT)
  const messages = useState<UIMessage[]>('assistant-messages', () => [])
  const pendingMessage = useState<string | undefined>('assistant-pending', () => undefined)

  const isMobile = useMediaQuery('(max-width: 767px)')
  const panelWidth = computed(() => desktopWidth.value)
  const isExpanded = computed(() => desktopWidth.value > PANEL_WIDTH_COMPACT)
  const shouldPushContent = computed(() => !isMobile.value && isOpen.value)

  const faqQuestions = computed<FaqCategory[]>(() => {
    const faqConfig = assistantConfig?.faqQuestions
    if (!faqConfig) return []

    // Check if it's a localized object (has locale keys like 'en', 'fr')
    if (!Array.isArray(faqConfig)) {
      const localizedConfig = faqConfig as LocalizedFaqQuestions
      const currentLocale = docusRuntimeConfig?.locale || 'en'
      const defaultLocale = config.public.i18n?.defaultLocale || 'en'

      // Try current locale, then default locale, then first available
      const questions = localizedConfig[currentLocale]
        || localizedConfig[defaultLocale]
        || Object.values(localizedConfig)[0]

      return normalizeFaqQuestions(questions || [])
    }

    return normalizeFaqQuestions(faqConfig)
  })

  function open(initialMessage?: string, clearPrevious = false) {
    if (clearPrevious) {
      messages.value = []
    }

    if (initialMessage) {
      pendingMessage.value = initialMessage
    }
    isOpen.value = true
  }

  function clearPending() {
    pendingMessage.value = undefined
  }

  function close() {
    isOpen.value = false
  }

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function clearMessages() {
    messages.value = []
  }

  function setDesktopWidth(width: number) {
    desktopWidth.value = clampDesktopAssistantWidth(width)
  }

  function setResizing(value: boolean) {
    isResizing.value = value
  }

  function toggleExpanded() {
    setDesktopWidth(isExpanded.value ? PANEL_WIDTH_COMPACT : PANEL_WIDTH_EXPANDED)
  }

  return {
    isEnabled,
    isOpen,
    isExpanded,
    isMobile,
    isResizing,
    panelWidth,
    shouldPushContent,
    messages,
    pendingMessage,
    faqQuestions,
    open,
    clearPending,
    close,
    toggle,
    toggleExpanded,
    setDesktopWidth,
    setResizing,
    clearMessages,
  }
}
