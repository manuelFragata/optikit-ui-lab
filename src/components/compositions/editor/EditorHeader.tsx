import type { ReactNode } from 'react';
import Button from '@mui/material/Button';
import IosShareIcon from '@mui/icons-material/IosShare';
import { OverflowMenu } from '../../panels/OverflowMenu';
import { AccountMenu, type AccountUser } from '../AccountMenu';
import { AppHeader, type HeaderVariant } from '../AppHeader';

export interface EditorHeaderProps {
  variant: HeaderVariant;
  projectName: string;
  version: string;
  user: AccountUser | null;
  onHome?: () => void;
  onLogIn?: () => void;
  onAccount?: () => void;
  onLogOut?: () => void;
  /** Version history and design info open in the inspector. */
  onShowInfo: () => void;
  /** Extra header actions, placed before the built-in ones. */
  actions?: ReactNode;
}

/** The editor's own header, when it stands alone (inside the workspace, the workspace's header is used). */
export function EditorHeader({ variant, projectName, version, user, onHome, onLogIn, onAccount, onLogOut, onShowInfo, actions }: EditorHeaderProps) {
  return (
    <AppHeader
      variant={variant}
      projectName={projectName}
      version={version}
      onHome={onHome}
      projectMenu={[
        { id: 'rename', label: 'Rename…' },
        { id: 'duplicate', label: 'Duplicate design' },
        { id: 'info', label: 'Design info', onSelect: onShowInfo },
      ]}
      actions={
        <>
          {actions}
          <Button variant="outlined" color="inherit" startIcon={<IosShareIcon />}>
            Share…
          </Button>
          <OverflowMenu
            label="Design actions"
            items={[
              { id: 'export', label: 'Export…', shortcut: 'STEP, STL, SVG' },
              { id: 'bom', label: 'Export BOM…', shortcut: 'CSV' },
              { id: 'duplicate', label: 'Duplicate design' },
              { id: 'link', label: 'Copy link' },
              { id: 'instructions', label: 'Assembly instructions' },
              { id: 'delete', label: 'Delete design', destructive: true, dividerBefore: true },
            ]}
          />
          <AccountMenu user={user} showSignUp={false} onLogIn={onLogIn} onProjects={onHome} onAccount={onAccount} onLogOut={onLogOut} />
        </>
      }
    />
  );
}
