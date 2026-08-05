import { useCallback, useEffect, useRef } from 'react';

/**
 * Opens something on a long press where that's the natural gesture (touch) and
 * on a plain click where it isn't (mouse).
 *
 * Movement cancels, so a scroll that begins on the element doesn't fire, and a
 * touch that has already fired swallows the click the browser sends afterwards.
 * Returns props to spread onto the element.
 *
 * `holdOnMouse` makes the mouse hold for the full delay too, and leaves plain
 * clicks alone — for widgets whose clicks already mean something (the clock
 * cycles its formats on click, so only a hold may open its expanded card).
 */
export function useLongPress(onOpen: () => void, ms = 450, { holdOnMouse = false } = {}) {
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false;
      if (e.pointerType === 'mouse' && !holdOnMouse) return;
      origin.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        fired.current = true;
        // The press has become a long press — give the haptic confirmation the
        // gesture normally carries on a phone, where there's no cursor to show
        // that anything registered.
        navigator.vibrate?.(8);
        onOpen();
      }, ms);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!origin.current) return;
      const { x, y } = origin.current;
      if (Math.abs(e.clientX - x) > 10 || Math.abs(e.clientY - y) > 10) clear();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    // Capture phase, so a press that became a hold suppresses the release
    // click before it reaches the widget's own handlers — otherwise holding
    // the clock face would open the card AND cycle the format on release.
    onClickCapture: (e: React.MouseEvent) => {
      if (fired.current) { e.preventDefault(); e.stopPropagation(); }
    },
    onClick: (e: React.MouseEvent) => {
      // A press that already fired must not also register as a click — whether
      // that click would have opened the sheet (default) or done the widget's
      // own click work (holdOnMouse), it was spent on the hold.
      if (fired.current) { e.preventDefault(); e.stopPropagation(); return; }
      if (holdOnMouse) return; // plain clicks belong to the widget
      if (e.detail === 0) return;
      onOpen();
    },
    // A long press on a phone otherwise raises the OS text/context menu.
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}

