import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
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
import type { SchematicSymbol } from '../model';

export interface PropertiesPanelProps {
  symbol: SchematicSymbol | null;
  onChange: (patch: Partial<SchematicSymbol>) => void;
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
export function PropertiesPanel({ symbol, onChange }: PropertiesPanelProps) {
  if (!symbol) {
    return (
      <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', px: 3, py: 6, color: 'text.secondary' }}>
        <NearMeOutlinedIcon sx={{ transform: 'scaleX(-1)' }} />
        <Typography variant="subtitle2">Nothing selected</Typography>
        <Typography variant="body2">Select a symbol on the canvas, in Layers or in the Parts list to see its properties.</Typography>
      </Stack>
    );
  }

  return (
    <Box>
      <Stack spacing={0.75} sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Detail label="Symbol" value={symbol.id} />
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

      {symbol.linked && (
        <DisclosureSection title="Linked design">
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.sunken', p: 1 }}>
            <Box sx={{ display: 'grid', placeItems: 'center', p: 0.5, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
              <ViewInArOutlinedIcon sx={{ fontSize: '1rem' }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {symbol.linked.name}
              </Typography>
              <Typography variant="mono" color="text.meta" noWrap component="div">
                {symbol.linked.source}
                {symbol.linked.version && ` · v${symbol.linked.version}`}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mt: 1 }}>
            <TagChip label={symbol.linked.status} tone={symbol.linked.status === 'Linked' ? 'success' : 'warning'} dot />
            <Link component="button" variant="body2">
              {symbol.linked.status === 'Linked' ? 'Change…' : 'Link a part…'}
            </Link>
          </Stack>
        </DisclosureSection>
      )}

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
