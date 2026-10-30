/**
 * The views of the workspace, one tab each (UI-V4 §2). Home and Projects
 * work without a design; the others act on the open design (Simulate is a
 * pane of View, beside the canvas). Optimize is the same editor as View,
 * with the optimizer beside the canvas and the V on the numbers it may
 * change: switching between them keeps the selection, the zoom and the undo
 * history. Control is the design's electronics: controllers, devices and
 * the inputs the motors move. Commercial is internal (staff only); the
 * prototype shows it to everyone.
 */
export type WorkspaceTab = 'home' | 'projects' | 'file' | 'view' | 'optimize' | 'control' | 'commercial';

export const TAB_LABELS: Record<WorkspaceTab, string> = {
  home: 'Home',
  projects: 'Projects',
  file: 'File',
  view: 'View',
  optimize: 'Optimize',
  control: 'Control',
  commercial: 'Commercial',
};

/** Tabs that need an open design. */
export const DESIGN_TABS: WorkspaceTab[] = ['file', 'view', 'optimize', 'control', 'commercial'];

/** Tabs that are the editor: one editor for all of them, kept as the tab changes. */
export const EDITOR_TABS: WorkspaceTab[] = ['view', 'optimize'];
