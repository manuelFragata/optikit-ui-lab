/**
 * The sketch: ideal parts only. Each does exactly what its numbers say (a
 * lens is a paraxial thin lens of f and Ø, a mirror an ideal mirror of f), so
 * layouts can be tried before any real part is chosen. Placed like any part
 * (a click, then a click on the canvas; or dragged out). Each is made real
 * later, on the canvas: from the catalogue or designed here, then mounted
 * (see model.ts, STEPS).
 */
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { dragPart } from '../dragPart';
import { specLine, STEPS, type SymbolKind, type SymbolParam } from '../model';
import { SketchPicture } from '../SketchSvg';

export interface SketchEntry {
  id: string;
  label: string;
  kind: SymbolKind;
  /** Its inputs as placed. */
  inputs: SymbolParam[];
}

export interface SketchGroup {
  id: string;
  label: string;
  entries: SketchEntry[];
}

export interface SketchPanelProps {
  groups: SketchGroup[];
  /** The entry being placed, highlighted. */
  activeEntryId?: string;
  onPick: (entryId: string) => void;
  onDragStart?: (entryId: string) => void;
  onDragEnd?: () => void;
}

function Tile({ entry, active, onPick, onDragStart, onDragEnd }: { entry: SketchEntry; active: boolean } & Pick<SketchPanelProps, 'onPick' | 'onDragStart' | 'onDragEnd'>) {
  return (
    <ButtonBase
      onClick={() => onPick(entry.id)}
      onPointerDown={(e) => onDragStart && dragPart(e, () => onDragStart(entry.id), onDragEnd ?? (() => {}))}
      aria-label={`Sketch ${entry.label.toLowerCase()}`}
      sx={(t) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 0.5,
        p: 1,
        borderRadius: 1,
        border: `${t.layout.hairline}px solid ${(t.vars ?? t).palette.divider}`,
        bgcolor: active ? 'primary.soft' : 'background.paper',
        color: active ? 'primary.onSoft' : 'text.primary',
        cursor: onDragStart ? 'grab' : 'pointer',
        userSelect: 'none',
        textAlign: 'left',
        '&:hover': { borderColor: 'primary.main' },
      })}
    >
      {/* As the canvas draws it, at one scale for every tile: a wider lens looks wider. */}
      <SketchPicture part={entry} mmAcross={entry.kind === 'laser' || entry.kind === 'camera' ? 44 : 34} sx={{ width: '100%', height: 44 }} />
      <Typography variant="body2" noWrap>
        {entry.label}
      </Typography>
      <Typography variant="meta" color="text.meta" component="div">
        {specLine(entry)}
      </Typography>
    </ButtonBase>
  );
}

export function SketchPanel({ groups, activeEntryId, onPick, onDragStart, onDragEnd }: SketchPanelProps) {
  return (
    <Box sx={{ py: 1.5 }}>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ px: 1.5, m: 0 }}>
        Ideal parts: each does exactly what its numbers say. Place them where the light goes and try layouts.
      </Typography>
      {/* The way every part goes, so the sketch is seen as its first step. */}
      <Box component="ol" sx={{ px: 1.5, m: 0, mt: 1, listStyle: 'none', display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => (
          <Typography key={s.step} component="li" variant="caption" color={i === 0 ? 'primary.main' : 'text.secondary'} sx={{ fontWeight: i === 0 ? 600 : 400 }}>
            {`${i + 1} ${s.label}${i < STEPS.length - 1 ? ' →' : ''}`}
          </Typography>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ px: 1.5, m: 0, mt: 0.5 }}>
        Later, select a part to make it real (from the catalogue, or design your own) and then mount it.
      </Typography>
      {groups.map((g) => (
        <Box key={g.id} component="section" aria-label={g.label} sx={{ px: 1.5, pt: 1 }}>
          <Typography variant="overline" color="text.secondary" component="h3" sx={{ display: 'block', lineHeight: 1.8, m: 0 }}>
            {g.label}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
            {g.entries.map((e) => (
              <Tile key={e.id} entry={e} active={e.id === activeEntryId} onPick={onPick} onDragStart={onDragStart} onDragEnd={onDragEnd} />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
