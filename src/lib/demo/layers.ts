/**
 * DEMO MODE — the top of the stacking order.
 *
 * Demo chrome is not a modal. A modal can be covered by a more urgent modal and
 * nothing is lost; demo chrome covering up is a correctness failure. The banner
 * is the only thing telling somebody the numbers are false, and the checkout
 * overlay is what stands between a click and a real charge. Both have to win
 * every stacking contest on the page, including against overlays that had no
 * idea demo mode existed when they were written.
 *
 * That is why these sit above everything else in the app rather than following
 * the modal scale.
 *
 * A note on the scale, said out loud rather than reconciled quietly: the
 * `modal-z-index-manager` skill documents
 *
 *   > Overlays/Modals:     z-[9999]
 *   > Critical Alerts:     z-[10000]
 *
 * but the code has long since moved past it — `RichTextEditor.tsx:424` uses
 * `z-[1000001]`, and there are live values at `z-[99999]` and `z-[30000]`. A
 * demo banner at the skill's "critical alert" tier would be buried by half a
 * dozen existing overlays, which is exactly the bug this file fixes. So the
 * skill's numbers are followed in spirit — demo chrome is the most critical
 * layer there is — and not to the digit. The values below are one tier above
 * the highest currently in the tree.
 *
 * Keep them here rather than inline so the next person adding demo chrome does
 * not have to rediscover the ordering, and so raising the ceiling is one edit.
 */

export const DEMO_LAYER = {
  /** Section nav under the banner. */
  nav: 'z-[1000008]',
  /** The strip that says nothing saves. Above every overlay in the app. */
  banner: 'z-[1000010]',
  /** "Ready to save?" — must cover the banner it was raised from. */
  saveDialog: 'z-[1000020]',
  /** Checkout interception. The highest thing in the application, by design. */
  checkout: 'z-[1000030]',
} as const;
