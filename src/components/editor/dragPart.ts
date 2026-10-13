import type { PointerEvent } from 'react';

/** How far (px) the pointer must move before a press on a card becomes a drag. */
const THRESHOLD = 5;

/**
 * Drag a part card out of a list and onto the canvas. Call from the card's
 * `onPointerDown`. A press that moves past the threshold calls `onStart`
 * (the canvas then shows the part under the pointer and drops it on
 * release); releasing anywhere calls `onEnd`. A plain click is left alone.
 */
export function dragPart(e: PointerEvent, onStart: () => void, onEnd: () => void) {
  if (e.button !== 0) return;
  const from = { x: e.clientX, y: e.clientY };
  let started = false;

  const move = (ev: globalThis.PointerEvent) => {
    if (started || Math.hypot(ev.clientX - from.x, ev.clientY - from.y) < THRESHOLD) return;
    started = true;
    onStart();
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    if (!started) return;
    onEnd();
    // A drag released over its own card would also click it: swallow that click.
    const swallow = (ev: Event) => ev.stopPropagation();
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }));
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}
