/**
 * Language Context — holds the visitor's chosen UI language and hands out
 * translated strings.
 *
 * Precedence on first paint: `?lang=` in the URL (so a link can force a
 * language) → a previously saved choice → the browser's own language list →
 * English. A `?lang=` that names a supported locale is also persisted, so the
 * choice survives the visitor navigating away from that link.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import {
  DEFAULT_LOCALE,
  isLocale,
  resolveLocale,
  translate,
  type Locale,
  type TranslationKey,
} from '../i18n'

const STORAGE_KEY = 'tlau_locale'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  /** True when the locale came from the browser rather than an explicit pick. */
  autoDetected: boolean
  t: (key: TranslationKey) => string
}

// A working default rather than `undefined`: any component rendered outside the
// provider (a test harness, a future standalone entry point) still gets English
// instead of throwing.
const LanguageContext = createContext<LanguageContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  autoDetected: false,
  t: (key) => translate(DEFAULT_LOCALE, key),
})

function readStoredLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isLocale(stored) ? stored : null
  } catch {
    // Private browsing / storage disabled — fall through to detection.
    return null
  }
}

function readUrlLocale(): Locale | null {
  try {
    const param = new URLSearchParams(window.location.search).get('lang')
    return isLocale(param) ? param : null
  } catch {
    return null
  }
}

interface InitialLocale {
  locale: Locale
  autoDetected: boolean
}

function detectInitialLocale(): InitialLocale {
  if (typeof window === 'undefined') return { locale: DEFAULT_LOCALE, autoDetected: false }

  const fromUrl = readUrlLocale()
  if (fromUrl) return { locale: fromUrl, autoDetected: false }

  const stored = readStoredLocale()
  if (stored) return { locale: stored, autoDetected: false }

  const fromBrowser = resolveLocale(navigator.languages ?? [navigator.language])
  if (fromBrowser) return { locale: fromBrowser, autoDetected: true }

  return { locale: DEFAULT_LOCALE, autoDetected: false }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(detectInitialLocale)
  const [locale, setLocaleState] = useState<Locale>(initial.locale)
  const [autoDetected, setAutoDetected] = useState(initial.autoDetected)

  // A `?lang=` link is an explicit choice, so persist it immediately. A merely
  // detected locale is not written to storage — leaving it unsaved means a
  // visitor who later changes their browser language gets the new one.
  useEffect(() => {
    if (initial.autoDetected) return
    try {
      localStorage.setItem(STORAGE_KEY, initial.locale)
    } catch {
      // Storage unavailable — the locale still applies for this session.
    }
  }, [initial])

  // Keep the document in sync so screen readers, browser translate prompts and
  // `:lang()` CSS all see the right language.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    setAutoDetected(false)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage unavailable — the choice still applies for this session.
    }
  }, [])

  const t = useCallback((key: TranslationKey) => translate(locale, key), [locale])

  const value = useMemo(
    () => ({ locale, setLocale, autoDetected, t }),
    [locale, setLocale, autoDetected, t]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
