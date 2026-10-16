import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import UndoIcon from '@mui/icons-material/Undo';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { DisclosureSection } from '../../panels/DisclosureSection';
import { SliderField } from '../../primitives/SliderField';
import { TagChip } from '../../primitives/TagChip';
import { Vec3Field } from '../../primitives/Vec3Field';
import { ShapeSection } from './ShapeSection';
import { frozen, holderMismatch, isLocked, realize, sketched, specLine, unbound, type Lock, type ModuleOption, type SchematicSymbol, type Seat } from '../model';

export type { ModuleOption };

export interface PropertiesPanelProps {
  symbol: SchematicSymbol | null;
  onChange: (patch: Partial<SchematicSymbol>) => void;
  /** Existing modules the selected part can be realized as (swapped for). */
  realizeOptions?: ModuleOption[];
  /** Freeze opens the holder designer (the close-up) instead of freezing on the spot. */
  onFreeze?: () => void;
  /** Snap: choose a catalogue part for an ideal one (in the close-up). */
  onSnap?: () => void;
}

const SEATS: Seat[] = [0, 1, 2, 3];
const LOCKS: { value: Lock; label: string }[] = [
  { value: 'x', label: 'x' },
  { value: 'y', label: 'y' },
  { value: 'z', label: 'z' },
  { value: 'turn', label: 'turn' },
];

/**
 * In a cube or not mounted yet, and the operations between the two:
 * realize (swap for an existing module), freeze (generate a holder here)
 * and unbind (take the optic out of its cube).
 */
function PlacementSection({ symbol, realizeOptions = [], onChange, onFreeze, onSnap }: { symbol: SchematicSymbol; realizeOptions?: ModuleOption[]; onChange: PropertiesPanelProps['onChange']; onFreeze?: () => void; onSnap?: () => void }) {
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const p = symbol.placement;
  const mounted = p.state === 'in-cube';
  const ideal = p.state === 'ideal';

  const realizeAs = (option: ModuleOption) => {
    setMenu(null);
    onChange(realize(symbol, option));
  };
  const freeze = () => (onFreeze ? onFreeze() : onChange({ placement: frozen(p) }));
  const unbind = () => onChange({ placement: unbound(symbol) });
  const mismatch = holderMismatch(symbol, realizeOptions);

  return (
    <Stack spacing={1.25}>
      <Stack
        direction="row"
        spacing={1.25}
        sx={(t) => ({
          alignItems: 'center',
          p: 1,
          borderRadius: 1,
          bgcolor: 'background.sunken',
          border: `${t.layout.hairline}px ${mounted ? 'solid' : 'dashed'} ${(t.vars ?? t).palette.divider}`,
        })}
      >
        <Box sx={{ display: 'grid', placeItems: 'center', p: 0.5, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', color: mounted ? 'text.primary' : 'text.meta' }}>
          {mounted ? <ViewInArOutlinedIcon sx={{ fontSize: '1rem' }} /> : ideal ? <DrawOutlinedIcon sx={{ fontSize: '1rem' }} /> : <BlurOnIcon sx={{ fontSize: '1rem' }} />}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" noWrap>
            {p.state === 'in-cube' ? p.module : p.state === 'unmounted' ? p.part : `Ideal ${symbol.kind}`}
          </Typography>
          <Typography variant="meta" color="text.meta" noWrap component="div">
            {p.state === 'ideal' ? specLine(symbol) || 'No part chosen' : p.source}
            {p.state === 'in-cube' && p.version && ` · v${p.version}`}
          </Typography>
        </Box>
      </Stack>

      <TagChip
        label={mounted ? (p.state === 'in-cube' && p.frozen ? 'In a cube · frozen holder' : 'In a cube') : ideal ? 'Ideal · no part chosen' : 'Not mounted yet'}
        tone={mounted ? 'success' : ideal ? 'primary' : 'warning'}
        dot
        sx={{ alignSelf: 'flex-start' }}
      />

      {mismatch && (
        <Box role="alert" sx={{ p: 1, borderRadius: 1, bgcolor: 'warning.soft', color: 'warning.onSoft' }}>
          <Typography variant="body2">
            {mismatch.inputs.map((i) => `The holder takes ${i.label.toLowerCase()} ${i.module} ${i.unit}; this part is set to ${i.part} ${i.unit}.`).join(' ')}
          </Typography>
          {mismatch.fits ? (
            <Button size="small" variant="outlined" color="inherit" startIcon={<SwapHorizIcon fontSize="small" />} onClick={() => onChange(realize(symbol, mismatch.fits!))} sx={{ mt: 1 }}>
              Swap for {mismatch.fits.module}
            </Button>
          ) : (
            <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
              No module fits it yet: unbind it, then freeze a holder for it.
            </Typography>
          )}
        </Box>
      )}

      {p.state === 'in-cube' && (
        <Box>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
            Seat
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={p.seat}
            disabled={isLocked(symbol, 'turn')}
            onChange={(_, seat: Seat | null) => seat !== null && onChange({ placement: { ...p, seat } })}
            aria-label="Seat, in quarter turns"
          >
            {SEATS.map((seat) => (
              <ToggleButton key={seat} value={seat} aria-label={`${seat * 90} degrees`}>
                {seat * 90}°
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}

      <Stack direction="row" spacing={1}>
        {ideal ? (
          <>
            {onSnap && (
              <Tooltip title="Choose a catalogue part for it, up close">
                <Button variant="contained" size="small" startIcon={<TravelExploreIcon fontSize="small" />} onClick={onSnap}>
                  Snap to a part…
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Swap it for an existing module">
              <Button variant="outlined" size="small" startIcon={<ViewInArOutlinedIcon fontSize="small" />} onClick={(e) => setMenu(e.currentTarget)} aria-haspopup="menu">
                Realize…
              </Button>
            </Tooltip>
          </>
        ) : mounted ? (
          <Tooltip title="Take the optic out of its cube. It stays where it is.">
            <Button variant="outlined" size="small" startIcon={<LinkOffIcon fontSize="small" />} onClick={unbind}>
              Unbind
            </Button>
          </Tooltip>
        ) : (
          <>
            <Tooltip title="Swap it for an existing module">
              <Button variant="contained" size="small" startIcon={<ViewInArOutlinedIcon fontSize="small" />} onClick={(e) => setMenu(e.currentTarget)} aria-haspopup="menu">
                Realize…
              </Button>
            </Tooltip>
            <Tooltip title={onFreeze ? 'Design a holder for it, in the close-up' : 'Generate a holder at the current position'}>
              <Button variant="outlined" size="small" startIcon={<AcUnitIcon fontSize="small" />} onClick={freeze}>
                {onFreeze ? 'Freeze…' : 'Freeze'}
              </Button>
            </Tooltip>
          </>
        )}
      </Stack>
      {p.state === 'unmounted' && (
        <Button size="small" startIcon={<UndoIcon fontSize="small" />} onClick={() => onChange({ placement: sketched(p), prescription: undefined })} sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}>
          Back to the sketch
        </Button>
      )}
      {ideal ? (
        <Typography variant="caption" color="text.secondary">
          An ideal part traces as an ideal optic of its specification. Snap it to a catalogue part, or realize it as a module, before the design can be built.
        </Typography>
      ) : (
        !mounted && (
          <Typography variant="caption" color="text.secondary">
            Parts that are not mounted yet can be saved and shared, but the design isn't buildable until every part is in a cube.
          </Typography>
        )
      )}

      <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {realizeOptions.length === 0 && <MenuItem disabled>No matching module</MenuItem>}
        {realizeOptions.map((o) => (
          <MenuItem key={o.module} onClick={() => realizeAs(o)}>
            <ListItemText primary={o.module} secondary={`${o.source}${o.version ? ` · v${o.version}` : ''}`} />
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: (t) => `${t.spacing(11)} 1fr`, gap: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

/** The part's name, as the views show it: kept on Enter or when the field is left (one undo step), Esc puts it back. */
function NameField({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState(name);
  const commit = () => (draft.trim() && draft.trim() !== name ? onRename(draft.trim()) : setDraft(name));
  return (
    <TextField
      label="Name"
      size="small"
      fullWidth
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation(); // the editor's shortcuts are not for this field
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setDraft(name);
      }}
      sx={{ mb: 0.75 }}
    />
  );
}

/** Contextual properties of the selected part. */
export function PropertiesPanel({ symbol, onChange, realizeOptions, onFreeze, onSnap }: PropertiesPanelProps) {
  if (!symbol) {
    return (
      <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', px: 3, py: 6, color: 'text.secondary' }}>
        <NearMeOutlinedIcon sx={{ transform: 'scaleX(-1)' }} />
        <Typography variant="subtitle2">Nothing selected</Typography>
        <Typography variant="body2">Select a part on the canvas, in Layers or in the Parts list to see its properties.</Typography>
      </Stack>
    );
  }

  // A designed optic's focal length and diameter follow from its shape: set there, not here.
  const shownInputs = (symbol.inputs ?? []).filter((i) => !symbol.prescription || (i.label !== 'Focal length' && i.label !== 'Diameter'));

  return (
    <Box>
      <Stack spacing={0.75} sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        {/* Keyed by the name too: renamed from elsewhere (a module swap), the field starts over. */}
        <NameField key={`${symbol.id}:${symbol.label}`} name={symbol.label} onRename={(label) => onChange({ label })} />
        <Detail label="Part" value={symbol.id} />
        <Detail label="Type" value={symbol.type} />
        <Detail label="Layer" value={`z = ${symbol.z}`} />
      </Stack>

      <DisclosureSection title="Position">
        <Vec3Field
          label="Position"
          value={{ x: symbol.x, y: symbol.y, z: symbol.z }}
          onChange={(v) => onChange({ x: v.x, y: v.y, z: v.z })}
          step={1}
          precision={1}
          locked={symbol.locks}
        />
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
          grid units · 1 unit = 1 cube
        </Typography>

        {/* Locks: the part keeps still along these, on the canvas, with the keys and here. */}
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5, mb: 0.5 }}>
          Locks
        </Typography>
        <ToggleButtonGroup
          fullWidth
          size="small"
          value={LOCKS.filter((l) => isLocked(symbol, l.value)).map((l) => l.value)}
          onChange={(_, on: Lock[]) => onChange({ locks: Object.fromEntries(LOCKS.map((l) => [l.value, on.includes(l.value)])) })}
          aria-label="Locks"
        >
          {LOCKS.map((l) => {
            const on = isLocked(symbol, l.value);
            return (
              <ToggleButton key={l.value} value={l.value} aria-label={`Lock ${l.label}`} sx={{ gap: 0.5, typography: 'mono', textTransform: 'none' }}>
                {on ? <LockOutlinedIcon sx={{ fontSize: '0.9rem' }} /> : <LockOpenOutlinedIcon sx={{ fontSize: '0.9rem', opacity: 0.5 }} />}
                {l.label}
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>
      </DisclosureSection>

      <DisclosureSection title="Placement">
        <PlacementSection symbol={symbol} realizeOptions={realizeOptions} onChange={onChange} onFreeze={onFreeze} onSnap={onSnap} />
      </DisclosureSection>

      {symbol.prescription && (
        <DisclosureSection title={symbol.kind === 'mirror' ? 'Shape · mirror' : 'Shape · lens'}>
          <ShapeSection symbol={{ ...symbol, prescription: symbol.prescription }} onChange={onChange} />
        </DisclosureSection>
      )}

      <DisclosureSection title="Inputs">
        {shownInputs.length ? (
          <Stack spacing={2}>
            {shownInputs.map((input) => (
              <SliderField
                key={input.label}
                label={input.label}
                value={input.value}
                min={input.min}
                max={input.max}
                step={input.step}
                unit={input.unit}
                onChange={(value) => onChange({ inputs: symbol.inputs!.map((x) => (x.label === input.label ? { ...x, value } : x)) })}
              />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            This part has no inputs to set.
          </Typography>
        )}
      </DisclosureSection>

      <DisclosureSection title="Notes">
        <TextField
          fullWidth
          multiline
          minRows={3}
          placeholder="Design intent, tolerances, open questions…"
          value={symbol.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          slotProps={{ htmlInput: { 'aria-label': 'Notes' } }}
        />
      </DisclosureSection>

      <DisclosureSection title="Advanced" defaultOpen={false}>
        <Typography variant="body2" color="text.secondary">
          Tolerances, part substitution rules and export units.
        </Typography>
      </DisclosureSection>
    </Box>
  );
}

/** Several parts selected: which ones, and how to act on them. Picking one shows just its properties. */
export function SelectionSummary({ parts, onPick }: { parts: SchematicSymbol[]; onPick: (id: string) => void }) {
  return (
    <Box sx={{ py: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 1 }}>
        The bar beside them on the canvas turns, moves, locks, copies or deletes them all. Shift-click a part to add it or take it out.
      </Typography>
      {parts.map((p) => (
        <ButtonBase key={p.id} onClick={() => onPick(p.id)} sx={{ width: '100%', justifyContent: 'flex-start', gap: 1.5, px: 2, py: 0.75, '&:hover': { bgcolor: 'action.hover' } }}>
          <Typography variant="mono" color="text.meta" sx={{ width: 28, textAlign: 'left' }}>
            {p.id}
          </Typography>
          <Typography variant="body2" noWrap sx={{ flex: 1, textAlign: 'left' }}>
            {p.label}
          </Typography>
          <Typography variant="meta" color="text.meta">
            z{p.z}
          </Typography>
        </ButtonBase>
      ))}
    </Box>
  );
}

export interface PropertiesFooterProps {
  total: number;
  symbolId: string;
  onPrev: () => void;
  onNext: () => void;
  onDelete: () => void;
}

/** Actions under the properties: replace, delete, and stepping through the parts. */
export function PropertiesFooter({ total, symbolId, onPrev, onNext, onDelete }: PropertiesFooterProps) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', px: 1, py: 0.75 }}>
      <Tooltip title="Replace part">
        <IconButton size="small" aria-label="Replace part">
          <SwapHorizIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete part">
        <IconButton size="small" aria-label="Delete part" onClick={onDelete}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Box sx={{ flex: 1 }} />
      <IconButton size="small" aria-label="Previous part" onClick={onPrev}>
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      <Typography variant="mono" color="text.secondary">
        {symbolId} / {total}
      </Typography>
      <IconButton size="small" aria-label="Next part" onClick={onNext}>
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
