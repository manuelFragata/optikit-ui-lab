import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import type { EditorView } from '../../editor/viewOptions';
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
  /** How many light paths the trace found. */
  lightPaths: number;
  /** What the light misses, e.g. "No light reaches Camera". */
  misses: string[];
  /** Where the light's trace is: a long one shows, a failed one can be tried again. */
  trace?: { slow: boolean; error: string | null; retry: () => void };
  /** The unmounted count was clicked: show the parts list. */
  onShowParts: () => void;
}

/**
 * The editor's status bar. UI-V4 §1.2: it counts the parts not mounted yet;
 * none left means buildable. Then where the selection is, what is in the
 * design (and which light paths miss a part), and the grid.
 */
export function EditorStatusBar({ design, selected, selectedCount, unmounted, view, layer, snap, zoom, lightPaths, misses, trace, onShowParts }: EditorStatusBarProps) {
  const parts = design.symbols.length;
  const ideal = design.symbols.filter((s) => s.placement.state === 'ideal').length;
  const loose = unmounted - ideal;
  const open = [ideal > 0 && `${ideal} ideal`, loose > 0 && `${loose} not mounted yet`].filter(Boolean).join(' · ');
  return (
    <StatusBar
      tone={parts === 0 ? 'neutral' : unmounted > 0 ? 'warning' : 'success'}
      status={
        <ButtonBase onClick={onShowParts} sx={{ borderRadius: 1, px: 0.5, typography: 'caption', '&:hover': { color: 'text.primary' } }}>
          {parts === 0 ? 'No parts yet' : unmounted > 0 ? open : 'Every part is in a cube · buildable'}
        </ButtonBase>
      }
      start={
        <>
          <Typography variant="mono">{selected ? `x ${selected.x} y ${selected.y} z ${selected.z}` : 'x – y – z –'}</Typography>
          <Typography variant="caption">{selectedCount > 1 ? `${selectedCount} of ${parts} parts selected` : `${parts} parts`}</Typography>
          {view === '2d' && <Typography variant="caption">layer z{layer}</Typography>}
          {trace?.error ? (
            <ButtonBase onClick={trace.retry} title={trace.error} sx={{ borderRadius: 1, px: 0.5, typography: 'caption', color: 'error.main', '&:hover': { textDecoration: 'underline' } }}>
              The light could not be traced · Try again
            </ButtonBase>
          ) : trace?.slow ? (
            <Typography variant="caption" role="status">
              Tracing the light…
            </Typography>
          ) : misses.length > 0 ? (
            <Typography variant="caption" sx={{ color: 'warning.main' }}>
              {misses.join(' · ')}
            </Typography>
          ) : (
            <Typography variant="caption">{lightPaths === 0 ? 'No light yet' : `${lightPaths} light ${lightPaths === 1 ? 'path' : 'paths'}`}</Typography>
          )}
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
