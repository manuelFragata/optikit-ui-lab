import { useEffect } from 'react';
import type { CanvasTool, EditorView } from '../../editor/CanvasToolbar';
import type { EditorActions } from './actions';

const TOOL_KEYS: Record<string, CanvasTool> = { v: 'select', h: 'pan', z: 'zoom', m: 'measure' };

/** Typing in a field: single-key shortcuts must not fire. */
const typing = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * The editor's keyboard shortcuts, while it is open. Every key calls one of
 * the editor's actions. `paused` (the command palette is open) leaves the
 * keys to it.
 */
export function useShortcuts(actions: EditorActions, { view, hasSelection, paused }: { view: EditorView; hasSelection: boolean; paused: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const run = (action: () => void) => {
        e.preventDefault();
        action();
      };

      if (mod && key === 'k') return run(actions.openPalette);
      if (paused || typing(e.target)) return;

      // With Ctrl (⌘ on a Mac).
      if (mod) {
        if (key === 'z') return run(e.shiftKey ? actions.redo : actions.undo);
        if (key === 'y') return run(actions.redo);
        if (key === 'a') return run(actions.selectAllOnLayer);
        if (key === 'd' && hasSelection) return run(actions.duplicateSelection);
        return;
      }
      if (e.altKey) return;

      // Anywhere.
      if (key === 'escape') return actions.escape();
      if (key === 'a' || key === '/') return run(actions.openAdd);
      if (TOOL_KEYS[key] && (view === '2d' || key !== 'm')) return actions.setTool(TOOL_KEYS[key]);
      if (key === 'f') return e.shiftKey ? actions.fitSelection() : actions.fit();
      if (key === '+' || key === '=') return actions.zoomIn();
      if (key === '-') return actions.zoomOut();
      if (key === '1') return actions.actualSize();

      // On the selection.
      if (!hasSelection) return;
      if (key === 'r') return actions.turnSelection();
      if (key === 'enter') return actions.openProperties();
      if (key === 'delete' || key === 'backspace') return actions.deleteSelection();
      if (key === 'pageup') return run(() => actions.layerSelection(1));
      if (key === 'pagedown') return run(() => actions.layerSelection(-1));
      if (key.startsWith('arrow')) {
        // A cube at a time; with Shift, a tenth.
        const d = e.shiftKey ? 0.1 : 1;
        const x = key === 'arrowleft' ? -d : key === 'arrowright' ? d : 0;
        const y = key === 'arrowdown' ? -d : key === 'arrowup' ? d : 0;
        return run(() => actions.nudgeSelection(x, y));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
}
