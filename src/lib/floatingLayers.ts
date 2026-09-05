/**
 * One place that decides what floats above what.
 *
 * Six components each own a fixed-position element and each picked its own z-index in
 * isolation (0, 40, 60, 100, 110, 9999, 10001). Nothing coordinated them, so the order on
 * screen was whatever the numbers happened to produce — and on a phone they all pile into
 * the same bottom corner. The install sheet in particular came up behind a floating button.
 *
 * Import these instead of typing a number. If a new floating element needs a slot, add it
 * here so the whole stack stays readable in one screen.
 */
export const LAYER = {
  /** Ambient page furniture: contextual cards, inline hints. */
  ambient: 40,
  /** Persistent entry points: the Instagram wand, the alerts bell. */
  launcher: 60,
  /** Bottom bars: range filters, quick actions. */
  bar: 100,
  /** Panels those launchers open: side drawers, alert lists. */
  panel: 110,
  /** Scroll-to-top and friends — above the bars, below anything modal. */
  assist: 9999,
  /** Modal scrim, and the sheet that sits on it. */
  scrim: 10000,
  sheet: 10001,
} as const

/**
 * Marks an element as secondary furniture that must step aside for a sheet.
 * Spread onto the element; index.css hides anything carrying it while
 * `data-install-sheet="open"` is set on <body>.
 */
export const secondaryFloating = { 'data-floating': 'secondary' } as const

/** Called by the install sheet as it opens and closes. */
export function setInstallSheetOpen(open: boolean) {
  if (typeof document === 'undefined') return
  if (open) document.body.setAttribute('data-install-sheet', 'open')
  else document.body.removeAttribute('data-install-sheet')
}
