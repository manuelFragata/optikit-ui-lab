import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { Vec3Field, type Vec3 } from '../primitives/Vec3Field';
import { DisclosureSection } from './DisclosureSection';
import { OverflowMenu, type OverflowMenuItem } from './OverflowMenu';

export interface InspectorPanelProps {
  title: string;
  /** Element type, shown under the title. */
  kind?: string;
  icon?: ReactNode;
  position: Vec3;
  onPositionChange: (position: Vec3) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  unit?: string;
  menuItems?: OverflowMenuItem[];
  onClose?: () => void;
  /** Extra sections, rendered between Position and Notes. */
  children?: ReactNode;
}

/** Contextual inspector for the selected element. */
export function InspectorPanel({
  title,
  kind,
  icon,
  position,
  onPositionChange,
  notes,
  onNotesChange,
  unit = 'mm',
  menuItems,
  onClose,
  children,
}: InspectorPanelProps) {
  return (
    <Box
      component="section"
      aria-label={`Inspector: ${title}`}
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          minHeight: (theme) => theme.spacing(theme.layout.panelHeaderHeight),
          pl: 2,
          pr: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {icon && <Box sx={{ display: 'flex', color: 'primary.main' }}>{icon}</Box>}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {title}
          </Typography>
          {kind && (
            <Typography variant="caption" color="text.secondary" noWrap component="div">
              {kind}
            </Typography>
          )}
        </Box>
        {menuItems && menuItems.length > 0 && <OverflowMenu items={menuItems} label="Element actions" />}
        {onClose && (
          <Tooltip title="Close inspector">
            <IconButton aria-label="Close inspector" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <DisclosureSection title="Position">
          <Vec3Field label="Position" unit={unit} value={position} onChange={onPositionChange} />
        </DisclosureSection>
        {children}
        <DisclosureSection title="Notes">
          <TextField
            fullWidth
            multiline
            minRows={4}
            placeholder="Design intent, tolerances, open questions…"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': 'Notes' } }}
          />
        </DisclosureSection>
      </Box>
    </Box>
  );
}
