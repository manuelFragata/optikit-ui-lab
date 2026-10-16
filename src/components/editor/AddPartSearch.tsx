import { useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import SearchIcon from '@mui/icons-material/Search';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { dragPart } from './dragPart';
import type { FragmentSurface } from './holders/optic';
import type { SymbolKind, SymbolParam } from './model';

/** A part that can be added: a module that comes in a cube, a bare optic, or an ideal one (the sketch). */
export interface PartEntry {
  id: string;
  label: string;
  kind: SymbolKind;
  mount: 'mounted' | 'unmounted' | 'ideal' | 'designed';
  /** The box or catalogue it comes from. */
  source: string;
  /** Its inputs as it is placed, when not the kind's own. */
  inputs?: SymbolParam[];
  /** A lens or mirror designed here: its surfaces. */
  prescription?: FragmentSurface[];
}

export interface AddPartSearchProps {
  parts: PartEntry[];
  /** Ids of the parts added last, newest first. */
  recent?: string[];
  onPick: (part: PartEntry) => void;
  /** A card dragged out of the list, towards the canvas; `onDragEnd` when it is let go anywhere. */
  onDragStart?: (part: PartEntry) => void;
  onDragEnd?: () => void;
}

/**
 * Add, search first (UI-V4 §1.3): type to find a part, mounted or not yet,
 * then drag it onto the canvas, or click it and click where it goes.
 * Enter picks the first match.
 */
export function AddPartSearch({ parts, recent = [], onPick, onDragStart, onDragEnd = () => {} }: AddPartSearchProps) {
  const [query, setQuery] = useState('');
  const [mount, setMount] = useState<PartEntry['mount']>('mounted');
  const q = query.trim().toLowerCase();

  const matches = parts.filter((p) => p.mount === mount && (!q || `${p.label} ${p.source}`.toLowerCase().includes(q)));
  const recentParts = q ? [] : recent.flatMap((id) => parts.filter((p) => p.id === id)).slice(0, 3);

  const row = (p: PartEntry) => (
    <ButtonBase
      key={p.id}
      onClick={() => onPick(p)}
      onPointerDown={(e) => onDragStart && dragPart(e, () => onDragStart(p), onDragEnd)}
      sx={{ justifyContent: 'flex-start', gap: 1.25, px: 1, py: 0.75, borderRadius: 1, cursor: 'grab', userSelect: 'none', '&:hover, &:focus-visible': { bgcolor: 'action.hover' } }}
    >
      {p.mount === 'mounted' ? <ViewInArOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} /> : <BlurOnIcon fontSize="small" sx={{ color: 'text.meta' }} />}
      <Box sx={{ minWidth: 0, textAlign: 'left' }}>
        <Typography variant="body2" noWrap>
          {p.label}
        </Typography>
        <Typography variant="meta" color="text.meta" noWrap component="div">
          {p.source}
        </Typography>
      </Box>
    </ButtonBase>
  );

  const heading = (text: string) => (
    <Typography variant="meta" color="text.meta" sx={{ px: 1, pt: 1, pb: 0.25, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {text}
    </Typography>
  );

  return (
    <Stack sx={{ width: 320, p: 0.5 }} role="dialog" aria-label="Add a part">
      <TextField
        autoFocus
        size="small"
        placeholder="Search parts"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && matches[0] && onPick(matches[0])}
        slotProps={{
          htmlInput: { 'aria-label': 'Search parts' },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={mount}
        onChange={(_, next: PartEntry['mount'] | null) => next && setMount(next)}
        aria-label="Kind of part"
        sx={{ mt: 1, '& .MuiToggleButton-root': { py: 0.25, typography: 'body2', textTransform: 'none' } }}
      >
        <ToggleButton value="mounted">Mounted</ToggleButton>
        <ToggleButton value="unmounted">Unmounted</ToggleButton>
      </ToggleButtonGroup>

      <Stack sx={{ mt: 0.5, maxHeight: 300, overflowY: 'auto' }}>
        {recentParts.length > 0 && (
          <>
            {heading('Recent')}
            {recentParts.map(row)}
            {heading(mount === 'mounted' ? 'Modules, in a cube' : 'Optics, no holder yet')}
          </>
        )}
        {matches.map(row)}
        {matches.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2 }}>
            Nothing {mount} matches “{query}”.
          </Typography>
        )}
      </Stack>
      <Typography variant="meta" color="text.meta" sx={{ px: 1, pt: 1, borderTop: 1, borderColor: 'divider', mt: 0.5 }}>
        Drag onto the canvas, or click and place · Enter adds the first match
      </Typography>
    </Stack>
  );
}
