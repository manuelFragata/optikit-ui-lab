import type { PartEntry } from '../../editor/AddPartSearch';
import type { Size } from '../../../settings/preferences';
import type { CanvasTool, EditorView, ViewOptions } from '../../editor/viewOptions';

/** The sidebar's panels, one open at a time. */
export type PanelId = 'sketch' | 'palette' | 'properties' | 'layers' | 'parts' | 'bom' | 'info';

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
  openPanel: (id: PanelId) => void;
  /** Split the canvas, with the selected part up close beside it; again: close it. */
  toggleCloseup: () => void;
  toggleOptimize: () => void;
  /** Split the canvas with Choose parts beside it: real parts for the sketched ones; again: close it. */
  toggleChoose: () => void;
  /** Split the canvas with Simulate beside it: the checks and analyses of the light; again: close it. */
  toggleSimulate: () => void;
  openPalette: () => void;
  openSettings: () => void;

  /** Esc: stop placing, else close the open list, else back to Select, else deselect. */
  escape: () => void;
}
