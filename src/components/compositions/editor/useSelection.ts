import { useState } from 'react';
import type { SchematicSymbol } from '../../editor/model';

/**
 * Which parts are selected. One of them, `selected`, is the one the
 * inspector shows (the last one picked); `ids` holds them all. The primary id
 * can be controlled from outside (`selectedId`, `setSelectedId`); the others
 * are kept here.
 */
export function useSelection(symbols: SchematicSymbol[], selectedId: string | null, setSelectedId: (id: string | null) => void) {
  const [others, setOthers] = useState<string[]>([]);
  const selected = symbols.find((s) => s.id === selectedId) ?? null;
  // Parts deleted meanwhile drop out.
  const ids = selected ? [...others.filter((id) => id !== selected.id && symbols.some((s) => s.id === id)), selected.id] : [];
  const parts = symbols.filter((s) => ids.includes(s.id));

  return {
    selected,
    ids,
    parts,
    /** Exactly these parts (none to deselect); the last becomes the one the inspector shows. */
    set: (next: string[]) => {
      setOthers(next.slice(0, -1));
      setSelectedId(next[next.length - 1] ?? null);
    },
    /** The selection with these added. */
    plus: (more: string[]) => [...ids, ...more.filter((id) => !ids.includes(id))],
    /** The selection with this part added, or taken out if it was in. */
    toggled: (id: string) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]),
  };
}
