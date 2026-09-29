import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import PanToolOutlinedIcon from '@mui/icons-material/PanToolOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import ZoomInIcon from '@mui/icons-material/ZoomIn';

export type CanvasTool = 'select' | 'pan' | 'zoom';
/** One document, two looks at it (UI-V4 §1.3): the 2D schematic is the 3D scene seen from the top. */
export type EditorView = '2d' | '3d';

export const VIEW_LABELS: Record<EditorView, string> = {
  '2d': '2D',
  '3d': '3D',
};

export interface ViewOptions {
  sliceAxis: 'x' | 'y' | 'z';
  onionSkin: boolean;
  snapToGrid: boolean;
  showRayLabels: boolean;
  /** Outline the cube around every mounted part. */
  showCages: boolean;
}

export const DEFAULT_VIEW_OPTIONS: ViewOptions = {
  sliceAxis: 'z',
  onionSkin: true,
  snapToGrid: true,
  showRayLabels: true,
  showCages: true,
};

export interface CanvasToolbarProps {
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  view: EditorView;
  onViewChange: (view: EditorView) => void;
  options: ViewOptions;
  onOptionsChange: (options: ViewOptions) => void;
  /** Grid pitch shown in the options popover. */
  unitMm?: number;
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

/** Floating canvas controls: tools, view options and the view switcher. */
export function CanvasToolbar({ tool, onToolChange, view, onViewChange, options, onOptionsChange, unitMm = 50 }: CanvasToolbarProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const set = (patch: Partial<ViewOptions>) => onOptionsChange({ ...options, ...patch });

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Paper variant="outlined" sx={{ ...floatingSx, display: 'flex', alignItems: 'center', p: 0.5, gap: 0.5 }}>
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
              <ToggleButton
                value={t.value}
                aria-label={t.label}
                sx={{ '&.Mui-selected': { bgcolor: 'primary.soft', color: 'primary.onSoft', '&:hover': { bgcolor: 'primary.soft' } } }}
              >
                {t.icon}
              </ToggleButton>
            </Tooltip>
          ))}
        </ToggleButtonGroup>
        <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
        <Tooltip title="View options">
          <IconButton
            size="small"
            aria-label="View options"
            aria-haspopup="dialog"
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{ borderRadius: 1, ...(anchor ? { bgcolor: 'primary.soft', color: 'primary.onSoft' } : {}) }}
          >
            <TuneIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>

      <Paper variant="outlined" sx={{ ...floatingSx, p: 0.5 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          onChange={(_, next: EditorView | null) => next && onViewChange(next)}
          aria-label="Canvas view"
          sx={{ '& .MuiToggleButton-root': { border: 0, borderRadius: 1, px: 1.25, typography: 'subtitle2' } }}
        >
          {(Object.keys(VIEW_LABELS) as EditorView[]).map((v) => (
            <ToggleButton
              key={v}
              value={v}
              sx={{ '&.Mui-selected': { bgcolor: 'primary.soft', color: 'primary.onSoft', '&:hover': { bgcolor: 'primary.soft' } } }}
            >
              {VIEW_LABELS[v]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Paper>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 1, p: 2, width: (theme) => theme.spacing(36) } } }}
      >
        <Stack spacing={1.5} role="dialog" aria-label="View options">
          <Box>
            <Typography variant="overline" color="text.secondary">
              Slice axis
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={options.sliceAxis}
              onChange={(_, next: ViewOptions['sliceAxis'] | null) => next && set({ sliceAxis: next })}
            >
              {(['x', 'y', 'z'] as const).map((axis) => (
                <ToggleButton key={axis} value={axis} sx={{ typography: 'mono', textTransform: 'none' }}>
                  {axis}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <Stack>
            <FormControlLabel
              control={<Checkbox size="small" checked={options.onionSkin} onChange={(e) => set({ onionSkin: e.target.checked })} />}
              label={<Typography variant="body2">Onion-skin previous layer</Typography>}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={options.snapToGrid} onChange={(e) => set({ snapToGrid: e.target.checked })} />}
              label={<Typography variant="body2">Snap to grid</Typography>}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={options.showRayLabels} onChange={(e) => set({ showRayLabels: e.target.checked })} />}
              label={<Typography variant="body2">Show ray labels</Typography>}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={options.showCages} onChange={(e) => set({ showCages: e.target.checked })} />}
              label={<Typography variant="body2">Cube cages around mounted parts</Typography>}
            />
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between', borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
            <Typography variant="body2">Grid pitch</Typography>
            <Typography variant="mono" color="text.secondary">
              1 cube = {unitMm} mm
            </Typography>
          </Stack>
        </Stack>
      </Popover>
    </Stack>
  );
}
