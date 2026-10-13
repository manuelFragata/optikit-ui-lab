import { useState } from 'react';

/**
 * A value with undo and redo. `set` records a step; `undo` and `redo` walk
 * the steps back and forth. Steps are kept for the session only.
 */
export function useHistory<T>(initial: T) {
  const [state, setState] = useState({ past: [] as T[], present: initial, future: [] as T[] });

  const set = (next: T | ((prev: T) => T)) =>
    setState(({ past, present }) => ({
      past: [...past, present],
      present: typeof next === 'function' ? (next as (prev: T) => T)(present) : next,
      future: [],
    }));

  const undo = () =>
    setState(({ past, present, future }) => (past.length ? { past: past.slice(0, -1), present: past[past.length - 1], future: [present, ...future] } : { past, present, future }));

  const redo = () =>
    setState(({ past, present, future }) => (future.length ? { past: [...past, present], present: future[0], future: future.slice(1) } : { past, present, future }));

  return { value: state.present, set, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}
