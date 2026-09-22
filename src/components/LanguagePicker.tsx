/**
 * LanguagePicker — lets a visitor change the UI language.
 *
 * Two variants, because the site has two places a visitor can reach:
 *  - `footer`  a compact dropdown that opens upward. This is the one that
 *              matters for the general public: the header hamburger only
 *              renders for signed-in users (`showHeaderMenu` in Layout.tsx),
 *              so the footer is the only chrome a logged-out visitor sees.
 *  - `menu`    a collapsible section inside the full-screen nav menu, matching
 *              the existing MORE / THE LOST ARCHIVES sections.
 *
 * The footer panel renders through a portal to document.body rather than as an
 * absolutely positioned child. `<footer>` is `relative z-30`, which opens a
 * stacking context the panel can never climb out of — with the panel inside it,
 * the homepage newsletter card painted straight over the top of the language
 * list on mobile. Portalling it out and giving it z-[9999] puts it in the
 * overlay band from `modal-z-index-manager`, above the footer and the header
 * alike. Layout.tsx portals the nav menu for the same reason.
 *
 * Noir rules applied: no borders, no shadows, no rounded corners, uppercase
 * label with wide tracking, separation by surface tone and backdrop blur only.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GlobeAltIcon } from '@heroicons/react/24/outline'
import { useLanguage } from '../contexts/LanguageContext'
import { LOCALES, type Locale } from '../i18n'

/** Matches the panel's `w-56`; needed in JS to clamp it inside the viewport. */
const PANEL_WIDTH = 224
/** Breathing room between the trigger and the panel, and from the viewport edge. */
const GAP = 8

export default function LanguagePicker({ variant = 'footer' }: { variant?: 'footer' | 'menu' }) {
  const { locale, setLocale, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<{ left: number; bottom: number; maxHeight: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0]

  const measure = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const left = Math.min(
      Math.max(rect.right - PANEL_WIDTH, GAP),
      Math.max(window.innerWidth - PANEL_WIDTH - GAP, GAP)
    )
    setAnchor({
      // Anchored by its bottom edge so the panel grows upward from the trigger.
      left,
      bottom: window.innerHeight - rect.top + GAP,
      maxHeight: Math.max(rect.top - GAP * 2, 160),
    })
  }, [])

  // Position before the browser paints, so the panel never flashes at 0,0.
  useLayoutEffect(() => {
    if (open) measure()
  }, [open, measure])

  // While open: keep the panel glued to the trigger, and close on outside
  // click or Escape. All of it is torn down on close so the site isn't
  // carrying idle document listeners on every page.
  useEffect(() => {
    if (!open) return

    let frame = 0
    const reposition = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    // Capture phase so scrolling containers, not just the window, are caught.
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, measure])

  const choose = (next: Locale) => {
    setLocale(next)
    setOpen(false)
  }

  if (variant === 'menu') {
    return (
      <>
        <div
          className="menu-item menu-toggle-section flex items-center justify-start w-full gap-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(!open)
          }}
        >
          <span className="flex-grow">{t('language.label')}</span>
          <span className="text-white/40 text-xs mr-2">{current.label}</span>
          <div className="p-1 transition rounded-none flex items-center justify-center h-6 w-6 shrink-0">
            {open ? '▼' : '▶'}
          </div>
        </div>
        <div className={`menu-subsection ${open ? 'open' : ''}`}>
          {LOCALES.map((option) => (
            <button
              key={option.code}
              type="button"
              lang={option.code}
              aria-current={option.code === locale}
              className={`menu-item menu-subitem w-full text-left ${
                option.code === locale ? 'bg-white/10' : ''
              }`}
              onClick={() => choose(option.code)}
            >
              {option.label}
            </button>
          ))}
          <p className="px-6 py-2 text-[10px] text-white/40 leading-snug text-left">
            {t('language.scope')}
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language.select')}
        className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-white/5 text-white/60 hover:bg-white hover:text-black transition-colors"
        style={{ borderRadius: 0 }}
      >
        <GlobeAltIcon className="w-3 h-3" />
        <span lang={current.code}>{current.label}</span>
      </button>

      {open && anchor && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          aria-label={t('language.select')}
          className="fixed z-[9999] bg-black/95 backdrop-blur-md py-1 text-left overflow-y-auto"
          style={{
            left: anchor.left,
            bottom: anchor.bottom,
            width: PANEL_WIDTH,
            maxHeight: anchor.maxHeight,
            borderRadius: 0,
          }}
        >
          {LOCALES.map((option) => {
            const active = option.code === locale
            return (
              <button
                key={option.code}
                type="button"
                role="option"
                lang={option.code}
                aria-selected={active}
                onClick={() => choose(option.code)}
                className={`block w-full px-3 py-2 text-left text-xs transition-colors ${
                  active
                    ? 'bg-white text-black font-bold'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
                style={{ borderRadius: 0 }}
              >
                {option.label}
              </button>
            )
          })}
          <p className="px-3 pt-2 pb-1 text-[10px] text-white/40 leading-snug text-left">
            {t('language.scope')}
          </p>
        </div>,
        document.body
      )}
    </>
  )
}
