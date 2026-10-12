import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

/**
 * The views of the workspace, one tab each (UI-V4 §2). Home and Projects
 * work without a design; the others act on the open design.
 */
export type WorkspaceTab = 'home' | 'projects' | 'file' | 'view' | 'simulate';

export const TAB_LABELS: Record<WorkspaceTab, string> = {
  home: 'Home',
  projects: 'Projects',
  file: 'File',
  view: 'View',
  simulate: 'Simulate',
};

/** Tabs that need an open design. */
export const DESIGN_TABS: WorkspaceTab[] = ['file', 'view', 'simulate'];

export interface RibbonProps {
  tabs: WorkspaceTab[];
  value: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
}

/** The view tabs, sized to sit in the header row with their indicator on its bottom edge. */
export function Ribbon({ tabs, value, onChange }: RibbonProps) {
  return (
    <Tabs
      component="nav"
      aria-label="Views"
      value={value}
      onChange={(_, next: WorkspaceTab) => onChange(next)}
      variant="scrollable"
      scrollButtons={false}
      sx={{
        alignSelf: 'stretch',
        minHeight: 0,
        '& .MuiTabs-scroller, & .MuiTabs-list': { height: '100%' },
        '& .MuiTab-root': { minHeight: 0, minWidth: 0, px: 1.5 },
      }}
    >
      {tabs.map((tab) => (
        <Tab key={tab} value={tab} label={TAB_LABELS[tab]} />
      ))}
    </Tabs>
  );
}
