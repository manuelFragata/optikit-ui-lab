/**
 * The selected part's properties, as a spec sheet: everything said once.
 *
 * - the title is the part's name, edited in place (PropertiesTitle);
 * - the header: its step (ideal, real optic, mounted: PartStage) and what it is now;
 * - a designed lens or mirror: its shape, f and Ø first (ShapeSection);
 * - its numbers, one row each: drag a label to change it, or type (ScrubNumber);
 * - where it sits, in one row: x, y, layer, its turn and its locks;
 * - a note, when it has one;
 * - the footer: the way to its next step, and stepping through the parts (PropertiesFooter).
 *
 * Explanations are in tooltips, not on the page.
 */
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import UndoIcon from '@mui/icons-material/Undo';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { EmptyState } from '../../primitives/EmptyState';
import { ScrubNumber } from '../../primitives/ScrubNumber';
import { ShapeSection } from './ShapeSection';
import { frozen, holderMismatch, isLocked, ORIGINS, realize, seatOf, shifted, sketched, stageOf, STEPS, unbound, type Lock, type ModuleOption, type SchematicSymbol, type Seat } from '../model';
import { STEP_TONE, StepDots } from '../PartStage';

export type { ModuleOption };

export interface PropertiesPanelProps {
  symbol: SchematicSymbol | null;
  onChange: (patch: Partial<SchematicSymbol>) => void;
  /** Existing modules the selected part can go in. */
  realizeOptions?: ModuleOption[];
}

const LOCKS: { value: Lock; label: string }[] = [
  { value: 'x', label: 'Along x' },
  { value: 'y', label: 'Along y' },
  { value: 'z', label: 'Layer' },
  { value: 'turn', label: 'Turn' },
];

/** The part's name as the panel's title, edited in place: Enter or leaving keeps it (one undo step), Esc puts it back. */
export function PropertiesTitle({ symbol, onChange }: { symbol: SchematicSymbol; onChange: (patch: Partial<SchematicSymbol>) => void }) {
  return <NameField key={`${symbol.id}:${symbol.label}`} name={symbol.label} onRename={(label) => onChange({ label })} />;
}

function NameField({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState(name);
  const commit = () => (draft.trim() && draft.trim() !== name ? onRename(draft.trim()) : setDraft(name));
  return (
    <InputBase
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation(); // the editor's shortcuts are not for this field
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(name);
      }}
      inputProps={{ 'aria-label': 'Name' }}
      sx={{
        width: '100%',
        typography: 'subtitle2',
        '& input': { p: 0.25, mx: -0.25, borderRadius: 0.5, textOverflow: 'ellipsis' },
        '& input:hover': { bgcolor: 'action.hover' },
        '& input:focus': { bgcolor: 'action.selected' },
      }}
    />
  );
}

/** Its step and what it is now, in two short lines. */
function Header({ symbol }: { symbol: SchematicSymbol }) {
  const p = symbol.placement;
  const { step, origin } = stageOf(symbol);
  const what =
    p.state === 'in-cube'
      ? `${p.module}${p.version ? ` v${p.version}` : ''} · ${origin === 'holder' ? ORIGINS.holder.toLowerCase() : p.source}`
      : p.state === 'unmounted'
        ? origin === 'designed'
          ? `${p.part} · designed here`
          : `${p.part} · ${p.source}`
        : null;
  return (
    <Box sx={{ px: 2, pt: 1.25, pb: 1 }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: `${STEP_TONE[step]}.main` }} title={step === 'ideal' ? 'It does what its numbers say' : undefined}>
          {STEPS.find((s) => s.step === step)!.label}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <StepDots part={symbol} />
      </Stack>
      {what && (
        <Typography variant="meta" color="text.meta" component="div" noWrap title={what}>
          {what}
        </Typography>
      )}
    </Box>
  );
}

/** x, y and layer, its turn and its locks, in one row. */
function PlaceRow({ symbol, onChange }: { symbol: SchematicSymbol; onChange: PropertiesPanelProps['onChange'] }) {
  const [locks, setLocks] = useState<HTMLElement | null>(null);
  const p = symbol.placement;
  const anyLock = LOCKS.some((l) => isLocked(symbol, l.value));
  const turnLocked = isLocked(symbol, 'turn');
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) auto auto', alignItems: 'center', columnGap: 0.5, px: 2, py: 0.75 }}>
      <ScrubNumber compact label="x" value={symbol.x} step={0.1} readOnly={isLocked(symbol, 'x')} hint={isLocked(symbol, 'x') ? 'Locked along x' : 'x, in cubes'} onChange={(x) => onChange({ x })} />
      <ScrubNumber compact label="y" value={symbol.y} step={0.1} readOnly={isLocked(symbol, 'y')} hint={isLocked(symbol, 'y') ? 'Locked along y' : 'y, in cubes'} onChange={(y) => onChange({ y })} />
      <ScrubNumber
        compact
        label="z"
        value={symbol.z}
        min={0}
        readOnly={isLocked(symbol, 'z')}
        hint={isLocked(symbol, 'z') ? 'Locked on its layer' : 'Layer'}
        onChange={(z) => onChange({ z: shifted(symbol, { z: z - symbol.z }).z })}
      />
      <Tooltip title={turnLocked ? 'Locked: it does not turn' : `Turned ${seatOf(p) * 90}°: click to turn a quarter (R)`} placement="top" enterDelay={700} disableInteractive>
        <span>
          <ButtonBase
            disabled={turnLocked}
            onClick={() => onChange({ placement: { ...p, seat: ((seatOf(p) + 1) % 4) as Seat } })}
            aria-label="Turn a quarter"
            sx={{ gap: 0.25, px: 0.5, height: 26, borderRadius: 0.75, color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}
          >
            <RotateRightIcon sx={{ fontSize: 16 }} />
            <Typography variant="mono" sx={{ fontSize: 12, minWidth: 26, textAlign: 'left' }}>
              {seatOf(p) * 90}°
            </Typography>
          </ButtonBase>
        </span>
      </Tooltip>
      <Tooltip
        title={
          anyLock
            ? `Locked: ${LOCKS.filter((l) => isLocked(symbol, l.value))
                .map((l) => l.label.toLowerCase())
                .join(', ')}`
            : 'Free to move and turn. Click to lock.'
        }
        placement="top"
        enterDelay={700}
        disableInteractive
      >
        <IconButton size="small" aria-label="Locks" onClick={(e) => setLocks(e.currentTarget)} sx={{ color: anyLock ? 'text.primary' : 'text.meta' }}>
          {anyLock ? <LockOutlinedIcon sx={{ fontSize: 16 }} /> : <LockOpenOutlinedIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Tooltip>
      <Menu anchorEl={locks} open={Boolean(locks)} onClose={() => setLocks(null)} slotProps={{ list: { dense: true } }}>
        <ListSubheader sx={{ lineHeight: 2.5 }}>Keep it still</ListSubheader>
        {LOCKS.map((l) => (
          <MenuItem key={l.value} onClick={() => onChange({ locks: { ...symbol.locks, [l.value]: !isLocked(symbol, l.value) } })}>
            <Checkbox size="small" checked={isLocked(symbol, l.value)} sx={{ p: 0, mr: 1 }} />
            {l.label}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => onChange({ locks: Object.fromEntries(LOCKS.map((l) => [l.value, !anyLock])) })}>{anyLock ? 'Unlock all' : 'Lock all'}</MenuItem>
      </Menu>
    </Box>
  );
}

/** A note: a link while there is none, then a field. */
function NoteRow({ notes, onChange }: { notes: string; onChange: (notes: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!notes && !open)
    return (
      <Button size="small" startIcon={<EditNoteOutlinedIcon fontSize="small" />} onClick={() => setOpen(true)} sx={{ mx: 1.5, my: 0.5, color: 'text.secondary', alignSelf: 'flex-start' }}>
        Add a note
      </Button>
    );
  return (
    <Box sx={{ px: 2, py: 1 }}>
      <TextField
        fullWidth
        multiline
        minRows={2}
        autoFocus={open && !notes}
        variant="standard"
        placeholder="Design intent, tolerances, open questions…"
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.stopPropagation()}
        slotProps={{ htmlInput: { 'aria-label': 'Notes' }, input: { disableUnderline: true, sx: { fontSize: 13 } } }}
      />
    </Box>
  );
}

/** Contextual properties of the selected part. */
export function PropertiesPanel({ symbol, onChange, realizeOptions = [] }: PropertiesPanelProps) {
  if (!symbol) {
    return (
      <EmptyState icon={<NearMeOutlinedIcon sx={{ transform: 'scaleX(-1)' }} />} title="Nothing selected">
        Select a part on the canvas, in Layers or in the Parts list to see its properties.
      </EmptyState>
    );
  }

  // A designed optic's focal length and diameter are its shape's: ShapeSection shows and sets them.
  const fromShape = (label: string) => Boolean(symbol.prescription) && (label === 'Focal length' || label === 'Diameter');
  const inputs = symbol.inputs ?? [];
  const shown = inputs.filter((i) => !fromShape(i.label));
  const mismatch = holderMismatch(symbol, realizeOptions);
  const line = <Divider sx={{ mx: 2 }} />;

  return (
    <Stack>
      <Header symbol={symbol} />

      {mismatch && (
        <Box role="alert" sx={{ mx: 2, mb: 1, p: 1, borderRadius: 1, bgcolor: 'warning.soft', color: 'warning.onSoft' }}>
          <Typography variant="body2">{mismatch.inputs.map((i) => `The holder takes ${i.label.toLowerCase()} ${i.module} ${i.unit}; this part is ${i.part} ${i.unit}.`).join(' ')}</Typography>
          {mismatch.fits && (
            <Button size="small" color="inherit" startIcon={<SwapHorizIcon fontSize="small" />} onClick={() => onChange(realize(symbol, mismatch.fits!))} sx={{ mt: 0.5 }}>
              Swap for {mismatch.fits.module}
            </Button>
          )}
        </Box>
      )}

      {symbol.prescription && (
        <>
          {line}
          <Box sx={{ px: 2, py: 0.75 }}>
            <ShapeSection symbol={{ ...symbol, prescription: symbol.prescription }} onChange={onChange} />
          </Box>
        </>
      )}

      {shown.length > 0 && (
        <>
          {line}
          <Box sx={{ px: 2, py: 0.75 }}>
            {shown.map((input) => (
              <ScrubNumber
                key={input.label}
                label={input.label}
                value={input.value}
                min={input.min}
                max={input.max}
                step={input.step}
                unit={input.unit}
                hint={symbol.kind === 'mirror' && input.label === 'Focal length' ? '0: flat · positive: concave · negative: convex' : undefined}
                onChange={(value) => onChange({ inputs: inputs.map((x) => (x.label === input.label ? { ...x, value } : x)) })}
              />
            ))}
          </Box>
        </>
      )}

      {line}
      <PlaceRow symbol={symbol} onChange={onChange} />
      {line}
      <NoteRow notes={symbol.notes} onChange={(notes) => onChange({ notes })} />
    </Stack>
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
  symbol: SchematicSymbol;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onDelete: () => void;
  onChange: (patch: Partial<SchematicSymbol>) => void;
  realizeOptions?: ModuleOption[];
  /** Make a holder: the holder designer (the close-up). Without it, a holder is made on the spot. */
  onFreeze?: () => void;
  /** Make an ideal part real from the catalogue (Choose parts). */
  onSnap?: () => void;
  /** Make an ideal lens or mirror real by designing it (the close-up). */
  onDesign?: () => void;
}

/**
 * Under the properties: the way to the part's next step (one main button,
 * the other ways in ⋯), then delete and stepping through the parts.
 */
export function PropertiesFooter({ symbol, total, onPrev, onNext, onDelete, onChange, realizeOptions = [], onFreeze, onSnap, onDesign }: PropertiesFooterProps) {
  const [more, setMore] = useState<HTMLElement | null>(null);
  const p = symbol.placement;
  const { step } = stageOf(symbol);
  const canDesign = Boolean(onDesign) && (symbol.kind === 'lens' || symbol.kind === 'mirror');
  const close = (then: () => void) => () => {
    setMore(null);
    then();
  };
  const modules = realizeOptions.length > 0 && [
    <ListSubheader key="h" sx={{ lineHeight: 2.5 }}>
      Ready modules
    </ListSubheader>,
    ...realizeOptions.map((o) => (
      <MenuItem key={o.module} onClick={close(() => onChange(realize(symbol, o)))}>
        <ListItemIcon>
          <ViewInArOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary={o.module} secondary={`${o.source}${o.version ? ` · v${o.version}` : ''}`} />
      </MenuItem>
    )),
  ];

  return (
    <Box>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', px: 1.5, pt: 1.25, pb: 0.75 }}>
        {step === 'ideal' && (
          <>
            {onSnap && (
              <Tooltip title="Make it real: a part that exists, from a vendor">
                <Button variant="contained" size="small" startIcon={<TravelExploreIcon fontSize="small" />} onClick={onSnap} sx={{ flex: 1, whiteSpace: 'nowrap' }}>
                  Catalogue
                </Button>
              </Tooltip>
            )}
            {canDesign && (
              <Tooltip title="Make it real: your own lens or mirror (radii, glass, Ø)">
                <Button variant="outlined" size="small" startIcon={<ArchitectureIcon fontSize="small" />} onClick={onDesign} sx={{ flex: 1, whiteSpace: 'nowrap' }}>
                  Design
                </Button>
              </Tooltip>
            )}
          </>
        )}
        {step === 'real' && (
          <Tooltip title={onFreeze ? 'Mount it: make a holder for it in a cube, up close' : 'Mount it: make a holder for it in a cube, here'}>
            <Button variant="contained" size="small" startIcon={<AcUnitIcon fontSize="small" />} onClick={() => (onFreeze ? onFreeze() : onChange({ placement: frozen(p) }))} sx={{ flex: 1 }}>
              Make a holder
            </Button>
          </Tooltip>
        )}
        {step === 'mounted' && (
          <Stack direction="row" spacing={0.75} sx={{ flex: 1, alignItems: 'center', color: 'success.main', px: 0.5 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
            <Typography variant="body2">Ready to build</Typography>
          </Stack>
        )}
        <Tooltip title="More ways">
          <IconButton size="small" aria-label="More ways" onClick={(e) => setMore(e.currentTarget)} sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <MoreHorizIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Menu anchorEl={more} open={Boolean(more)} onClose={() => setMore(null)} slotProps={{ list: { dense: true } }}>
        {step !== 'mounted' && modules}
        {step === 'ideal' && realizeOptions.length === 0 && <MenuItem disabled>No ready module of this kind</MenuItem>}
        {step === 'real' && [
          <Divider key="d" />,
          <MenuItem key="back" onClick={close(() => onChange({ placement: sketched(p), prescription: undefined }))}>
            <ListItemIcon>
              <UndoIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Back to ideal" secondary="The numbers stay" />
          </MenuItem>,
        ]}
        {step === 'mounted' && (
          <MenuItem onClick={close(() => onChange({ placement: unbound(symbol) }))}>
            <ListItemIcon>
              <LinkOffIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Take out of the cube" secondary="It stays here, as a real optic" />
          </MenuItem>
        )}
      </Menu>

      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', px: 1, pb: 0.5 }}>
        <Tooltip title="Delete part (Del)">
          <IconButton size="small" aria-label="Delete part" onClick={onDelete}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" aria-label="Previous part" onClick={onPrev}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Typography variant="mono" color="text.secondary" sx={{ fontSize: 12 }}>
          {symbol.id} / {total}
        </Typography>
        <IconButton size="small" aria-label="Next part" onClick={onNext}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}
