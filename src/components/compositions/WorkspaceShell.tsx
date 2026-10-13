import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { AccountMenu, type AccountUser } from './AccountMenu';
import { AppHeader } from './AppHeader';
import { OpenProject } from './OpenProject';
import { DESIGN_TABS, Ribbon, TAB_LABELS, type WorkspaceTab } from './Ribbon';

export interface WorkspaceShellProps {
  tab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  /** The open design, if any. Without one, only Home and Projects are shown. */
  design?: { name: string; version: string } | null;
  /** Back to the open design in the editor. */
  onShowDesign?: () => void;
  /** Close the open design. */
  onCloseDesign?: () => void;
  /** `null` when signed out. */
  user: AccountUser | null;
  /** The active view's commands, shown under the tabs. */
  commands?: ReactNode;
  /** Usually a `StatusBar`; the View tab shows the unmounted count there. */
  statusBar?: ReactNode;
  onHome?: () => void;
  onLogIn?: () => void;
  onAccount?: () => void;
  onLogOut?: () => void;
  /** Extra header actions, before the account menu. */
  headerActions?: ReactNode;
  /** The active view. */
  children: ReactNode;
}

/** The strip under the header that holds a view's commands. Views with their own layout (View) render it themselves. */
export function CommandStrip({ children }: { children: ReactNode }) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ flexShrink: 0, alignItems: 'center', px: 2, py: 0.75, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', overflowX: 'auto' }}
    >
      {children}
    </Stack>
  );
}

/**
 * The app frame: a header with one tab per view, the active view's commands
 * (if any), the view, and an optional status bar. One design is open at a
 * time (UI-V4 §1.1).
 */
export function WorkspaceShell({
  tab,
  onTabChange,
  design,
  onShowDesign,
  onCloseDesign,
  user,
  commands,
  statusBar,
  onHome,
  onLogIn,
  onAccount,
  onLogOut,
  headerActions,
  children,
}: WorkspaceShellProps) {
  const tabs = (Object.keys(TAB_LABELS) as WorkspaceTab[]).filter((t) => design || !DESIGN_TABS.includes(t));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      <AppHeader
        onHome={onHome}
        nav={
          <>
            {design && (
              <>
                <OpenProject name={design.name} version={design.version} onShow={onShowDesign} onClose={onCloseDesign} />
                <Divider orientation="vertical" flexItem sx={{ borderColor: 'currentColor', opacity: 0.3, my: 2 }} />
              </>
            )}
            <Ribbon tabs={tabs} value={tab} onChange={onTabChange} />
          </>
        }
        actions={
          <>
            {headerActions}
            <AccountMenu user={user} onLogIn={onLogIn} onProjects={() => onTabChange('projects')} onAccount={onAccount} onLogOut={onLogOut} />
          </>
        }
      />
      {commands && <CommandStrip>{commands}</CommandStrip>}
      <Box component="main" sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {children}
      </Box>
      {statusBar}
    </Box>
  );
}
