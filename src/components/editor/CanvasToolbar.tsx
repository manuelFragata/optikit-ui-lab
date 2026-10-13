import type { ReactNode } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import PanToolOutlinedIcon from '@mui/icons-material/PanToolOutlined';
import ZoomInIcon from '@mui/icons-material/ZoomIn';

export type CanvasTool = 'select' | 'pan' | 'zoom' | 'measure';
/** One document, two looks at it (UI-V4 §1.3): the 2D schematic is the 3D scene seen from the top. */
export type EditorView = '2d' | '3d';

export const VIEW_LABELS: Record<EditorView, string> = {
  '2d': '2D',
  '3d': '3D',
};

/** What the canvas draws, and how parts snap. Editor state; none of it goes into the design file. */
export interface ViewOptions {
  /** The other layers, faintly. */
  onionSkin: boolean;
  snapToGrid: boolean;
  showRayLabels: boolean;
  /** Outline the cube around every mounted part. */
  showCages: boolean;
  /** Draw the light paths. */
  showRays?: boolean;
  /** Name the parts (on by default). */
  showPartLabels?: boolean;
}

export const DEFAULT_VIEW_OPTIONS: ViewOptions = {
  onionSkin: true,
  snapToGrid: true,
  showRayLabels: true,
  showCages: true,
};

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
            <ToggleButton key={v} value={v} sx={selectedSx}>
              {VIEW_LABELS[v]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Paper>
    </Stack>
  );
}
