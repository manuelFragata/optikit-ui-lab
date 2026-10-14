import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { Vec3 } from './layout3d';
import type { Project } from './overlay';

export type Rect = { x0: number; y0: number; x1: number; y1: number };

/**
 * Box selection: a left drag that starts on empty space draws a rectangle;
 * on release, the parts whose centres fall inside it are selected (Shift adds).
 * Returns the rectangle to draw, the handler for the frame's pointer down,
 * and `consumeClick`, true once for the click that ends a box (not a deselect).
 */
export function useBoxSelect({
  frame,
  enabled,
  pressedOnPart,
  project,
  candidates,
  onSelect,
}: {
  frame: RefObject<HTMLElement | null>;
  enabled: boolean;
  pressedOnPart: { current: boolean };
  project: RefObject<Project | null>;
  candidates: { id: string; center: Vec3 }[];
  onSelect: (ids: string[], add: boolean) => void;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const justBoxed = useRef(false);
  // A drag in progress ends with the view: its window listeners go too.
  const stopDrag = useRef<() => void>(() => {});
  useEffect(() => () => stopDrag.current(), []);

  const onPointerDown = (e: ReactPointerEvent) => {
    // A new press: whatever the last one did is over.
    justBoxed.current = false;
    const onPart = pressedOnPart.current;
    pressedOnPart.current = false;
    if (!enabled || e.button !== 0 || onPart || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    const from = { x: e.clientX - r.left, y: e.clientY - r.top };
    let box: Rect | null = null;

    const move = (ev: PointerEvent) => {
      const x = ev.clientX - r.left;
      const y = ev.clientY - r.top;
      if (!box && Math.hypot(x - from.x, y - from.y) < 4) return;
      box = { x0: Math.min(from.x, x), y0: Math.min(from.y, y), x1: Math.max(from.x, x), y1: Math.max(from.y, y) };
      setRect(box);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    const up = (ev: PointerEvent) => {
      stop();
      setRect(null);
      const b = box;
      if (!b || !project.current) return;
      justBoxed.current = true;
      const inside = candidates.filter(({ center }) => {
        const p = project.current!(center);
        return p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1;
      });
      onSelect(
        inside.map((c) => c.id),
        ev.shiftKey,
      );
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    stopDrag.current = stop;
  };

  const consumeClick = () => {
    const boxed = justBoxed.current;
    justBoxed.current = false;
    return boxed;
  };

  return { rect, onPointerDown, consumeClick };
}
