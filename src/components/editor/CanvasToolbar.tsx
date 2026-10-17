import type { ReactNode } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import PanToolOutlinedIcon from '@mui/icons-material/PanToolOutlined';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import { Segmented } from '../primitives/Segmented';
import { VIEW_LABELS, type CanvasTool, type EditorView } from './viewOptions';

export interface CanvasToolbarProps {
  view: EditorView;
  onViewChange: (view: EditorView) => void;
  /** The tools, shown when given. The editor keeps them in its dock instead. */
  tool?: CanvasTool;
  onToolChange?: (tool: CanvasTool) => void;
}

const TOOLS: { value: CanvasTool; label: string; shortcut: string; icon: ReactNode }[] = [
  { value: 'select', label: 'Select', shortcut: 'V', icon: <NearMeOutlinedIcon fontSize="small" sx={{ transform: 'scaleX(-1)' }} /> },
  { value: 'pan', label: 'Pan', shortcut: 'H', icon: <PanToolOutlinedIcon fontSize="small" /> },
  { value: 'zoom', label: 'Zoom', shortcut: 'Z', icon: <ZoomInIcon fontSize="small" /> },
];

const floatingSx = {
  borderRadius: (theme: { radius: { tile: number } }) => `${theme.radius.tile}px`,
  boxShadow: (theme: { shadows: string[] }) => theme.shadows[1],
} as const;

const selectedSx = { '&.Mui-selected': { bgcolor: 'primary.soft', color: 'primary.onSoft', '&:hover': { bgcolor: 'primary.soft' } } };

/** Floating canvas controls: the tools (optional) and the 2D/3D switch. */
export function CanvasToolbar({ view, onViewChange, tool, onToolChange }: CanvasToolbarProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      {tool && onToolChange && (
        <Paper variant="outlined" sx={{ ...floatingSx, p: 0.5 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={tool}
            onChange={(_, next: CanvasTool | null) => next && onToolChange(next)}
            aria-label="Canvas tool"
            sx={{ '& .MuiToggleButton-root': { border: 0, borderRadius: 1, px: 0.75 } }}
          >
            {TOOLS.map((t) => (
              <Tooltip key={t.value} title={`${t.label} (${t.shortcut})`}>
                <ToggleButton value={t.value} aria-label={t.label} sx={selectedSx}>
                  {t.icon}
                </ToggleButton>
              </Tooltip>
            ))}
          </ToggleButtonGroup>
        </Paper>
      )}

      <Segmented floating value={view} onChange={onViewChange} aria-label="Canvas view" options={(Object.keys(VIEW_LABELS) as EditorView[]).map((v) => ({ value: v, label: VIEW_LABELS[v] }))} />
    </Stack>
  );
}
