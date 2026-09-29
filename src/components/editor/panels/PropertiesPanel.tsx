import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import LinkOffIcon from '@mui/icons-material/LinkOff';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { DisclosureSection } from '../../panels/DisclosureSection';
import { SliderField } from '../../primitives/SliderField';
import { TagChip } from '../../primitives/TagChip';
import { Vec3Field } from '../../primitives/Vec3Field';
import type { SchematicSymbol, Seat } from '../model';

export interface ModuleOption {
  module: string;
  source: string;
  version?: string;
}

export interface PropertiesPanelProps {
  symbol: SchematicSymbol | null;
  onChange: (patch: Partial<SchematicSymbol>) => void;
  /** Existing modules the selected part can be realized as (swapped for). */
  realizeOptions?: ModuleOption[];
}

const SEATS: Seat[] = [0, 1, 2, 3];

/**
 * In a cube or not mounted yet, and the operations between the two:
 * realize (swap for an existing module), freeze (generate a holder here)
 * and unbind (take the optic out of its cube).
 */
function PlacementSection({ symbol, realizeOptions = [], onChange }: { symbol: SchematicSymbol; realizeOptions?: ModuleOption[]; onChange: PropertiesPanelProps['onChange'] }) {
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const p = symbol.placement;
  const mounted = p.state === 'in-cube';

  const realize = (option: ModuleOption) => {
    setMenu(null);
    onChange({ placement: { state: 'in-cube', ...option, seat: 0 } });
  };
  const freeze = () =>
    p.state === 'unmounted' && onChange({ placement: { state: 'in-cube', module: `Holder for ${p.part}`, source: 'Generated here', seat: 0, frozen: true } });
  const unbind = () =>
    p.state === 'in-cube' && onChange({
      placement: p.frozen
        ? { state: 'unmounted', part: p.module.replace(/^Holder for /, ''), source: 'Holder removed' }
        : { state: 'unmounted', part: symbol.label, source: `Taken out of ${p.module}` },
    });

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
          {mounted ? <ViewInArOutlinedIcon sx={{ fontSize: '1rem' }} /> : <BlurOnIcon sx={{ fontSize: '1rem' }} />}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" noWrap>
            {p.state === 'in-cube' ? p.module : p.part}
          </Typography>
          <Typography variant="meta" color="text.meta" noWrap component="div">
            {p.source}
            {p.state === 'in-cube' && p.version && ` · v${p.version}`}
          </Typography>
        </Box>
      </Stack>

      <TagChip label={mounted ? (p.state === 'in-cube' && p.frozen ? 'In a cube · frozen holder' : 'In a cube') : 'Not mounted yet'} tone={mounted ? 'success' : 'warning'} dot sx={{ alignSelf: 'flex-start' }} />

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
        {mounted ? (
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
            <Tooltip title="Generate a holder at the current position">
              <Button variant="outlined" size="small" startIcon={<AcUnitIcon fontSize="small" />} onClick={freeze}>
                Freeze
              </Button>
            </Tooltip>
          </>
        )}
      </Stack>
      {!mounted && (
        <Typography variant="caption" color="text.secondary">
          Parts that are not mounted yet can be saved and shared, but the design isn't buildable until every part is in a cube.
        </Typography>
      )}

      <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {realizeOptions.length === 0 && <MenuItem disabled>No matching module</MenuItem>}
        {realizeOptions.map((o) => (
          <MenuItem key={o.module} onClick={() => realize(o)}>
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

/** Contextual properties of the selected schematic symbol. */
export function PropertiesPanel({ symbol, onChange, realizeOptions }: PropertiesPanelProps) {
  if (!symbol) {
    return (
      <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', px: 3, py: 6, color: 'text.secondary' }}>
        <NearMeOutlinedIcon sx={{ transform: 'scaleX(-1)' }} />
        <Typography variant="subtitle2">Nothing selected</Typography>
        <Typography variant="body2">Select a part on the canvas, in Layers or in the Parts list to see its properties.</Typography>
      </Stack>
    );
  }

  return (
    <Box>
      <Stack spacing={0.75} sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
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
          precision={0}
        />
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
          grid units · 1 unit = 1 cube
        </Typography>
      </DisclosureSection>

      <DisclosureSection title="Placement">
        <PlacementSection symbol={symbol} realizeOptions={realizeOptions} onChange={onChange} />
      </DisclosureSection>

      {symbol.param && (
        <DisclosureSection title={symbol.param.label}>
          <SliderField
            label={symbol.param.label}
            value={symbol.param.value}
            min={symbol.param.min}
            max={symbol.param.max}
            step={symbol.param.step}
            unit={symbol.param.unit}
            onChange={(value) => symbol.param && onChange({ param: { ...symbol.param, value } })}
          />
        </DisclosureSection>
      )}

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

export interface PropertiesFooterProps {
  total: number;
  symbolId: string;
  onPrev: () => void;
  onNext: () => void;
  onDelete: () => void;
}

/** Actions under the properties: replace, delete, and stepping through symbols. */
export function PropertiesFooter({ total, symbolId, onPrev, onNext, onDelete }: PropertiesFooterProps) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', px: 1, py: 0.75 }}>
      <Tooltip title="Replace symbol">
        <IconButton size="small" aria-label="Replace symbol">
          <SwapHorizIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete symbol">
        <IconButton size="small" aria-label="Delete symbol" onClick={onDelete}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Box sx={{ flex: 1 }} />
      <IconButton size="small" aria-label="Previous symbol" onClick={onPrev}>
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      <Typography variant="mono" color="text.secondary">
        {symbolId} / {total}
      </Typography>
      <IconButton size="small" aria-label="Next symbol" onClick={onNext}>
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
