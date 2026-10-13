import { useState } from 'react';
import type { PartEntry } from '../../editor/AddPartSearch';

/**
 * A new part on its way onto the canvas: picked (then a click places it) or
 * dragged in from a list (it drops where the button is let go). Also keeps
 * the parts added last, newest first, for the Add search.
 */
export function usePlacing() {
  const [entry, setEntry] = useState<PartEntry | null>(null);
  const [dragging, setDragging] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  return {
    /** The part being placed, if any. */
    entry,
    /** It is being dragged in from a list. */
    dragging,
    recent,
    start: (part: PartEntry, drag: boolean) => {
      setEntry(part);
      setDragging(drag);
    },
    stop: () => {
      setEntry(null);
      setDragging(false);
    },
    /** One was placed: remember it; keep placing more of it when asked (Ctrl-click). */
    placed: (more: boolean) => {
      if (entry) setRecent((prev) => [entry.id, ...prev.filter((r) => r !== entry.id)]);
      if (!more) {
        setEntry(null);
        setDragging(false);
      }
    },
  };
}
