const HEADER_LAYOUT_CLASSES = {
  default: {
    center: 'hidden lg:flex min-w-0 flex-1',
    searchButton: 'shrink-0 lg:hidden',
    desktopAskAiButton: 'hidden shrink-0 sm:inline-flex',
    mobileAskAiButton: 'shrink-0 sm:hidden',
    drawerOnly: 'lg:hidden',
    headerSelectors: 'hidden lg:flex items-center gap-1.5',
  },
  docked: {
    center: 'min-w-0 flex-1',
    searchButton: 'shrink-0',
    desktopAskAiButton: 'hidden shrink-0 min-[1400px]:inline-flex',
    mobileAskAiButton: 'shrink-0 min-[1400px]:hidden',
    drawerOnly: 'min-[1400px]:hidden',
    headerSelectors: 'hidden min-[1400px]:flex items-center gap-1.5',
  },
  dockedExpanded: {
    center: 'min-w-0 flex-1',
    searchButton: 'shrink-0',
    desktopAskAiButton: 'hidden shrink-0 min-[1560px]:inline-flex',
    mobileAskAiButton: 'shrink-0 min-[1560px]:hidden',
    drawerOnly: 'min-[1560px]:hidden',
    headerSelectors: 'hidden min-[1560px]:flex items-center gap-1.5',
  },
} as const

export function useHeaderLayout() {
  const route = useRoute()
  const { shouldPushContent, isExpanded } = useAssistant()

  const isAssistantDocked = computed(() => route.meta.layout === 'docs' && shouldPushContent.value)

  const classes = computed(() => {
    if (!isAssistantDocked.value) {
      return HEADER_LAYOUT_CLASSES.default
    }

    return isExpanded.value
      ? HEADER_LAYOUT_CLASSES.dockedExpanded
      : HEADER_LAYOUT_CLASSES.docked
  })

  return {
    classes,
    isAssistantDocked,
  }
}
