import type { PartEntry } from '../../editor/AddPartSearch';
import type { Size } from '../../../settings/preferences';
import type { CanvasTool, EditorView, ViewOptions } from '../../editor/viewOptions';

export type LeftPanelId = 'palette' | 'layers' | 'parts' | 'bom';
export type RightPanelId = 'properties' | 'info';

/** View options that switch on and off. */
export type ToggleOption = keyof Pick<ViewOptions, 'showPartLabels' | 'showRays' | 'showRayLabels' | 'showCages' | 'onionSkin' | 'snapToGrid'>;

/**
 * Everything the editor can be asked to do, by name. The shell implements
 * them once; the keyboard (useShortcuts) and the command palette
 * (paletteCommands) only call them, so a shortcut and its command always do
 * the same thing. View-dependent ones (fit, zoom) do the right thing in 2D
 * and in 3D.
 */
export interface EditorActions {
  // The design: each is one undo step.
  undo: () => void;
  redo: () => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  turnSelection: () => void;
  /** Move the selection by a fraction of a cube or whole cubes (y up). */
  nudgeSelection: (x: number, y: number) => void;
  /** Move the selection a layer up (1) or down (−1). */
  layerSelection: (dz: 1 | -1) => void;
  mountAll: () => void;

  // Selecting.
  selectPart: (id: string) => void;
  selectAllOnLayer: () => void;
  openProperties: () => void;

  // Adding.
  openAdd: () => void;
  addPart: (entry: PartEntry) => void;

  // Seeing.
  setTool: (tool: CanvasTool) => void;
  setView: (view: EditorView) => void;
  goToLayer: (z: number) => void;
  toggleOption: (option: ToggleOption) => void;
  /** A preference (Settings), here for Ctrl K. */
  setLabelSize: (size: Size) => void;
  fit: () => void;
  fitSelection: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  actualSize: () => void;

  // Panels.
  openLeft: (id: LeftPanelId) => void;
  openRight: (id: RightPanelId) => void;
  openPalette: () => void;
  openSettings: () => void;

  /** Esc: stop placing, else close the open list, else back to Select, else deselect. */
  escape: () => void;
}
