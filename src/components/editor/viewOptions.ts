/** The canvas's tools, its two views and what it shows: shared by the toolbar, the dock, both canvases and the shortcuts. */
export type CanvasTool = 'select' | 'pan' | 'zoom' | 'measure';
/** One document, two looks at it (UI-V4 §1.3): the 2D schematic is the 3D scene seen from the top. */
export type EditorView = '2d' | '3d';

export const VIEW_LABELS: Record<EditorView, string> = {
  '2d': '2D',
  '3d': '3D',
};

/** What the canvas draws, and how parts snap. Editor state; none of it goes into the design file. */
export interface ViewOptions {
  /** The other layers, faintly. */
  onionSkin: boolean;
  snapToGrid: boolean;
  showRayLabels: boolean;
  /** Outline the cube around every mounted part. */
  showCages: boolean;
  /** Draw the light paths. */
  showRays?: boolean;
  /** Name the parts (on by default). */
  showPartLabels?: boolean;
}

export const DEFAULT_VIEW_OPTIONS: ViewOptions = {
  onionSkin: true,
  snapToGrid: true,
  showRayLabels: true,
  showCages: true,
};
