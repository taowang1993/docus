const MAC_OS_USER_AGENT_RE = /\b(?:Macintosh|Mac OS X|MacPPC|MacIntel|iPhone|iPad|iPod)\b/i

function detectMacOS(userAgent = '') {
  return MAC_OS_USER_AGENT_RE.test(userAgent)
}

export function useShortcutDisplayKeys() {
  const isMacOS = useState('tockdocs-shortcut-is-macos', () => {
    if (import.meta.server) {
      const userAgent = useRequestHeaders(['user-agent'])['user-agent']
      return detectMacOS(userAgent)
    }

    return detectMacOS(navigator.userAgent)
  })

  function displayKey(key: string) {
    switch (key.toLowerCase()) {
      case 'meta':
        return isMacOS.value ? 'command' : 'Ctrl'
      case 'ctrl':
        return isMacOS.value ? 'control' : 'Ctrl'
      case 'alt':
        return isMacOS.value ? 'option' : 'Alt'
      default:
        return key
    }
  }

  function displayKeys(shortcut: string) {
    return shortcut.split('_').filter(Boolean).map(displayKey)
  }

  return {
    isMacOS,
    displayKey,
    displayKeys,
  }
}
