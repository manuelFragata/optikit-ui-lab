import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AdjustIcon from '@mui/icons-material/Adjust';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined';
import { demoPanelItems } from '../../demo/panelContent';
import { InspectorPanel } from '../panels/InspectorPanel';
import { OverflowMenu } from '../panels/OverflowMenu';
import { SidePanel, type SidePanelState } from '../panels/SidePanel';
import type { Vec3 } from '../primitives/Vec3Field';
import { AppHeader, type HeaderVariant } from './AppHeader';
import { CanvasPlaceholder } from './CanvasPlaceholder';
import { StatusBar } from './StatusBar';

export interface EditorShellProps {
  headerVariant?: HeaderVariant;
  projectName?: string;
  railState?: SidePanelState;
  onRailStateChange?: (state: SidePanelState) => void;
  activePanel?: string;
  onActivePanelChange?: (id: string) => void;
  inspectorOpen?: boolean;
  onInspectorOpenChange?: (open: boolean) => void;
  /** Extra header actions, placed before the built-in ones. */
  headerActions?: ReactNode;
}

/**
 * Editor layout: header, left rail + side panel, canvas, right inspector,
 * status bar. Rail and inspector state can be controlled or left internal.
 */
export function EditorShell({
  headerVariant = 'navy',
  projectName = 'Double Gauss 50 mm f/2',
  railState,
  onRailStateChange,
  activePanel,
  onActivePanelChange,
  inspectorOpen: inspectorOpenProp,
  onInspectorOpenChange,
  headerActions,
}: EditorShellProps) {
  const [innerInspectorOpen, setInnerInspectorOpen] = useState(true);
  const inspectorOpen = inspectorOpenProp ?? innerInspectorOpen;
  const setInspectorOpen = (open: boolean) => {
    setInnerInspectorOpen(open);
    onInspectorOpenChange?.(open);
  };

  const [position, setPosition] = useState<Vec3>({ x: 0, y: 0, z: 12.5 });
  const [notes, setNotes] = useState('');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
      <AppHeader
        variant={headerVariant}
        projectName={projectName}
        actions={
          <>
            {headerActions}
            <Tooltip title="Undo">
              <IconButton color="inherit" aria-label="Undo">
                <UndoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Redo">
              <IconButton color="inherit" aria-label="Redo">
                <RedoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={inspectorOpen ? 'Hide inspector' : 'Show inspector'}>
              <IconButton
                color="inherit"
                aria-label="Toggle inspector"
                aria-pressed={inspectorOpen}
                onClick={() => setInspectorOpen(!inspectorOpen)}
              >
                <ViewSidebarOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button variant="outlined" color="inherit">
              Share
            </Button>
          </>
        }
      />

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <SidePanel
          aria-label="Tools"
          items={demoPanelItems}
          state={railState}
          onStateChange={onRailStateChange}
          activeId={activePanel}
          onActiveChange={onActivePanelChange}
        />

        <CanvasPlaceholder />

        {inspectorOpen && (
          <Box
            sx={{
              width: (theme) => theme.spacing(theme.layout.inspectorWidth),
              flexShrink: 0,
              borderLeft: 1,
              borderColor: 'divider',
            }}
          >
            <InspectorPanel
              title="L1 front"
              kind="Spherical surface"
              icon={<AdjustIcon fontSize="small" />}
              position={position}
              onPositionChange={setPosition}
              notes={notes}
              onNotesChange={setNotes}
              onClose={() => setInspectorOpen(false)}
              menuItems={[
                { id: 'duplicate', label: 'Duplicate', icon: <ContentCopyIcon fontSize="small" />, shortcut: 'Ctrl+D' },
                {
                  id: 'delete',
                  label: 'Delete',
                  icon: <DeleteOutlineIcon fontSize="small" />,
                  destructive: true,
                  dividerBefore: true,
                },
              ]}
            />
          </Box>
        )}
      </Box>

      <StatusBar
        start={
          <Typography variant="mono">
            x {position.x.toFixed(2)} y {position.y.toFixed(2)} z {position.z.toFixed(2)}
          </Typography>
        }
        end={
          <>
            <Typography variant="caption">7 surfaces</Typography>
            <Typography variant="caption">Units: mm</Typography>
            <Typography variant="mono">100%</Typography>
            <OverflowMenu
              label="View options"
              items={[
                { id: 'fit', label: 'Zoom to fit' },
                { id: 'grid', label: 'Toggle grid' },
              ]}
            />
          </>
        }
      />
    </Box>
  );
}
