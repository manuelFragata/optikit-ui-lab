/**
 * The sketch: optics by what they do, not by what they are yet. An ideal
 * lens of a focal length, a source of a wavelength, a detector. Placed like
 * any part (a click, then a click on the canvas; or dragged out), they trace
 * as ideal elements; each is later snapped to a catalogue part, realized as a
 * module, or given a holder (see model.ts, the placement states).
 */
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { dragPart } from '../dragPart';
import type { FragmentSurface } from '../holders/optic';
import type { SymbolKind, SymbolParam } from '../model';
import { OpticProfileSvg } from '../OpticProfile';
import { SymbolGlyph } from '../SymbolGlyph';

export interface SketchEntry {
  id: string;
  label: string;
  kind: SymbolKind;
  /** What it starts as, in a line ("f = 50 mm · Ø 25 mm"). */
  spec: string;
  /** Its inputs as placed, when not the kind's own. */
  inputs?: SymbolParam[];
  /** `designed`: a real lens or mirror, by its prescription. Otherwise an ideal element. */
  mount?: 'ideal' | 'designed';
  prescription?: FragmentSurface[];
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

/** Where each glyph sits, in its own units (a laser reaches left of its anchor). */
const VIEW_BOX: Partial<Record<SymbolKind, string>> = { laser: '-2.6 -1.4 3 2.8' };

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
        '&:hover svg': { color: 'primary.main' },
      })}
    >
      {/* A designed optic shows its real cross-section; an ideal one its symbol. */}
      {entry.prescription ? (
        <OpticProfileSvg surfaces={entry.prescription} sx={{ width: '100%', height: 44 }} />
      ) : (
        <Box component="svg" viewBox={VIEW_BOX[entry.kind] ?? '-1.4 -1.4 2.8 2.8'} sx={{ width: '100%', height: 44, color: 'text.secondary' }} aria-hidden>
          <g stroke="currentColor" strokeWidth={0.07} fill="none" strokeDasharray={entry.kind === 'lens' ? '0.12 0.1' : '0'}>
            <SymbolGlyph kind={entry.kind} />
          </g>
        </Box>
      )}
      <Typography variant="body2" noWrap>
        {entry.label}
      </Typography>
      <Typography variant="meta" color="text.meta" noWrap component="div">
        {entry.spec}
      </Typography>
    </ButtonBase>
  );
}

export function SketchPanel({ groups, activeEntryId, onPick, onDragStart, onDragEnd }: SketchPanelProps) {
  return (
    <Box sx={{ py: 1.5 }}>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ px: 1.5, m: 0, pb: 1 }}>
        Real lenses and mirrors you shape here, and ideal elements where only what they do matters yet. Place them, then give each a holder or a catalogue part.
      </Typography>
      {groups.map((g) => (
        <Box key={g.id} component="section" aria-label={g.label} sx={{ px: 1.5, pt: 1 }}>
          <Typography variant="overline" color="text.secondary" component="h3" sx={{ display: 'block', lineHeight: 1.8, m: 0 }}>
            {g.label}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {g.entries.map((e) => (
              <Tile key={e.id} entry={e} active={e.id === activeEntryId} onPick={onPick} onDragStart={onDragStart} onDragEnd={onDragEnd} />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
