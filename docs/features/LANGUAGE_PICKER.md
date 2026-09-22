# LANGUAGE PICKER

Lets a visitor read the site's navigation in their own language. Ships with eight
locales: English, Spanish, French, German, Portuguese, Italian, Japanese and
Simplified Chinese.

## What is and isn't translated

**Translated:** the site chrome — nav menu, footer links, the copyright line,
menu aria-labels.

**Not translated:** article bodies, blog titles, product copy, gallery captions,
emails and anything else that lives in Supabase. Those are authored in English
and stay in English. The picker panel says so out loud (`language.scope`), so a
visitor who switches to Japanese isn't misled into expecting Japanese articles.

**Deliberately never translated:** the publication's own proper nouns —
THE LOST+UNFOUNDS, THE LOST ARCHIVES, GEARHEADS, EDGE OF THE BORDERLANDS,
MAD SCIENTISTS, NEW THEORY, SAGE MODE. They are literals in the JSX and are
absent from the string catalogue on purpose.

## How a language gets picked

On first paint, in order:

1. `?lang=` in the URL — a link can force a language (`/?lang=es`), and doing so
   is treated as an explicit choice and saved.
2. A previously saved choice in `localStorage` under `tlau_locale`.
3. The browser's own `navigator.languages`, matched on the primary subtag, so
   `pt-BR` → `pt` and `zh-Hans-CN` → `zh`. A detected locale is **not** saved —
   leaving it unsaved means a visitor who later changes their browser language
   gets the new one.
4. English.

The chosen locale is written to `<html lang>` on every change.

## Where the control lives

| Variant | Where | Who sees it |
|---|---|---|
| `footer` | Bottom of every page | Everyone — this is the important one |
| `menu` | Inside the full-screen nav menu | Signed-in users only |

The header hamburger only renders for signed-in users (`showHeaderMenu` in
`Layout.tsx`), so the footer control is the only one a logged-out visitor can
reach. Don't remove it.

The footer panel renders through a portal to `document.body` at `z-[9999]`.
`<footer>` is `relative z-30`, which opens a stacking context a child panel
cannot climb out of — rendered inline, the homepage newsletter card paints
straight over the top of the language list on mobile.

## Files

| File | Role |
|---|---|
| `src/i18n/locales/en.ts` | The catalogue. English is the source of truth |
| `src/i18n/locales/*.ts` | One file per language, typed as `Dictionary` |
| `src/i18n/index.ts` | Locale registry, detection, `translate()` |
| `src/contexts/LanguageContext.tsx` | Holds the locale, exposes `t()` |
| `src/components/LanguagePicker.tsx` | Both variants of the control |

## Adding a string

1. Add the key to `src/i18n/locales/en.ts`.
2. Run `npx tsc --noEmit`. **Every other locale file now fails to compile** —
   they're typed as `Record<TranslationKey, string>`, so a missing translation is
   a build error, not a silent English fallback at runtime. Fill them all in.
3. Use it: `const { t } = useLanguage()` → `{t('your.key')}`.

## Adding a language

1. Copy an existing locale file to `src/i18n/locales/<code>.ts` and translate it.
2. Import it in `src/i18n/index.ts`, add the code to the `Locale` union, add a
   row to `LOCALES` (label is the **endonym** — a visitor who can't read the
   current UI language still recognises their own), and add it to `DICTIONARIES`.

Adding a right-to-left language (Arabic, Hebrew) needs more than a locale file:
nothing in the layout sets `dir`, and the whole site would need an RTL pass
first. Don't add one without doing that work.
