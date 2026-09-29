import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListSubheader from '@mui/material/ListSubheader';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { TagChip } from '../../primitives/TagChip';
import type { SchematicSymbol } from '../model';

export interface PartsListPanelProps {
  symbols: SchematicSymbol[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function Row({ s, selected, onSelect }: { s: SchematicSymbol; selected: boolean; onSelect: (id: string) => void }) {
  const p = s.placement;
  return (
    <ListItemButton selected={selected} onClick={() => onSelect(s.id)} sx={{ display: 'block', px: 2, py: 0.75 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
        <Typography variant="meta" color="text.meta">
          {s.id}
        </Typography>
        <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
          {s.label}
        </Typography>
        {p.state === 'in-cube' && p.seat > 0 && (
          <Typography variant="meta" color="text.meta">
            {p.seat * 90}°
          </Typography>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" noWrap sx={{ pl: 3.5 }}>
        {p.state === 'in-cube' ? `${p.module} · ${p.source}` : `${p.part} · ${p.source}`}
      </Typography>
    </ListItemButton>
  );
}

/** Every part of the design, grouped by where it sits: in a cube, or not mounted yet. */
export function PartsListPanel({ symbols, selectedId, onSelect }: PartsListPanelProps) {
  const mounted = symbols.filter((s) => s.placement.state === 'in-cube');
  const loose = symbols.filter((s) => s.placement.state === 'unmounted');
  const subheader = { bgcolor: 'background.paper', lineHeight: 2.5, typography: 'overline', color: 'text.secondary', px: 2 } as const;

  return (
    <Box sx={{ py: 1 }}>
      <Stack direction="row" spacing={1} sx={{ px: 2, py: 1, alignItems: 'center' }}>
        <TagChip label={`${mounted.length} in a cube`} tone="success" dot />
        {loose.length > 0 ? <TagChip label={`${loose.length} not mounted yet`} tone="warning" dot /> : <TagChip label="Buildable" tone="success" />}
      </Stack>
      <List disablePadding>
        {loose.length > 0 && (
          <>
            <ListSubheader sx={subheader}>Not mounted yet</ListSubheader>
            {loose.map((s) => (
              <Row key={s.id} s={s} selected={s.id === selectedId} onSelect={onSelect} />
            ))}
          </>
        )}
        <ListSubheader sx={subheader}>In a cube</ListSubheader>
        {mounted.map((s) => (
          <Row key={s.id} s={s} selected={s.id === selectedId} onSelect={onSelect} />
        ))}
      </List>
    </Box>
  );
}
