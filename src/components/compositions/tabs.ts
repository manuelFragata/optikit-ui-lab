/**
 * The views of the workspace, one tab each (UI-V4 §2). Home and Projects
 * work without a design; the others act on the open design (Simulate is a
 * pane of View, beside the canvas). Commercial is
 * internal (staff only); the prototype shows it to everyone.
 */
export type WorkspaceTab = 'home' | 'projects' | 'file' | 'view' | 'commercial';

export const TAB_LABELS: Record<WorkspaceTab, string> = {
  home: 'Home',
  projects: 'Projects',
  file: 'File',
  view: 'View',
  commercial: 'Commercial',
};

/** Tabs that need an open design. */
export const DESIGN_TABS: WorkspaceTab[] = ['file', 'view', 'commercial'];
