import en, { type Dictionary, type TranslationKey } from './locales/en'
import es from './locales/es'
import fr from './locales/fr'
import de from './locales/de'
import pt from './locales/pt'
import it from './locales/it'
import ja from './locales/ja'
import zh from './locales/zh'

export type { Dictionary, TranslationKey }

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'ja' | 'zh'

export const DEFAULT_LOCALE: Locale = 'en'

/**
 * Locale list in the order the picker renders them. `label` is the endonym —
 * a visitor who can't read the current UI language still recognises their own.
 */
export const LOCALES: { code: Locale; label: string; englishName: string }[] = [
  { code: 'en', label: 'English', englishName: 'English' },
  { code: 'es', label: 'Español', englishName: 'Spanish' },
  { code: 'fr', label: 'Français', englishName: 'French' },
  { code: 'de', label: 'Deutsch', englishName: 'German' },
  { code: 'pt', label: 'Português', englishName: 'Portuguese' },
  { code: 'it', label: 'Italiano', englishName: 'Italian' },
  { code: 'ja', label: '日本語', englishName: 'Japanese' },
  { code: 'zh', label: '简体中文', englishName: 'Chinese (Simplified)' },
]

const DICTIONARIES: Record<Locale, Dictionary> = { en, es, fr, de, pt, it, ja, zh }

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && value in DICTIONARIES
}

/**
 * Resolve the first supported locale out of a list of BCP-47 tags, matching on
 * the primary subtag so `pt-BR`, `zh-Hans-CN` and `en-GB` all land somewhere.
 * Returns null when nothing matches, so callers can tell "no preference" apart
 * from "explicitly chose English".
 */
export function resolveLocale(tags: readonly string[]): Locale | null {
  for (const tag of tags) {
    if (!tag) continue
    const primary = tag.toLowerCase().split('-')[0]
    if (isLocale(primary)) return primary
  }
  return null
}

/**
 * Look up a string, falling back to English for any key a locale is missing.
 * Locale files are typed as complete `Dictionary` objects so that shouldn't
 * happen, but a fallback beats rendering a raw key at a visitor.
 */
export function translate(locale: Locale, key: TranslationKey): string {
  return DICTIONARIES[locale]?.[key] ?? en[key]
}
