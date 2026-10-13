import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import type { EditorView } from '../../editor/CanvasToolbar';
import type { Schematic, SchematicSymbol } from '../../editor/model';
import { StatusBar } from '../StatusBar';

export interface EditorStatusBarProps {
  design: Schematic;
  selected: SchematicSymbol | null;
  selectedCount: number;
  unmounted: number;
  view: EditorView;
  layer: number;
  snap: boolean;
  /** The 2D zoom, 1 = 100%. */
  zoom: number;
  /** The unmounted count was clicked: show the parts list. */
  onShowParts: () => void;
}

/**
 * The editor's status bar. UI-V4 §1.2: it counts the parts not mounted yet;
 * none left means buildable. Then where the selection is, what is in the
 * design, and the grid.
 */
export function EditorStatusBar({ design, selected, selectedCount, unmounted, view, layer, snap, zoom, onShowParts }: EditorStatusBarProps) {
  const parts = design.symbols.length;
  return (
    <StatusBar
      tone={unmounted > 0 ? 'warning' : 'success'}
      status={
        <ButtonBase onClick={onShowParts} sx={{ borderRadius: 1, px: 0.5, typography: 'caption', '&:hover': { color: 'text.primary' } }}>
          {unmounted > 0 ? `${unmounted} ${unmounted === 1 ? 'part' : 'parts'} not mounted yet` : 'Every part is in a cube · buildable'}
        </ButtonBase>
      }
      start={
        <>
          <Typography variant="mono">{selected ? `x ${selected.x} y ${selected.y} z ${selected.z}` : 'x – y – z –'}</Typography>
          <Typography variant="caption">{selectedCount > 1 ? `${selectedCount} of ${parts} parts selected` : `${parts} parts`}</Typography>
          {view === '2d' && <Typography variant="caption">layer z{layer}</Typography>}
          <Typography variant="caption">{design.rays.length} rays</Typography>
        </>
      }
      end={
        <>
          <Typography variant="caption">snap {snap ? 'on' : 'off'}</Typography>
          <Typography variant="caption">grid {design.unitMm} mm</Typography>
          {view === '2d' && <Typography variant="mono">{Math.round(zoom * 100)}%</Typography>}
        </>
      }
    />
  );
}
