import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { TAB_LABELS, type WorkspaceTab } from './tabs';

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
