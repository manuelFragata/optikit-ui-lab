import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { TagChip } from '../../primitives/TagChip';
import type { SchematicSymbol } from '../model';

export interface PartsListPanelProps {
  symbols: SchematicSymbol[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Schematic symbol → concrete part, with link status: the design's bill of materials. */
export function PartsListPanel({ symbols, selectedId, onSelect }: PartsListPanelProps) {
  const linked = symbols.filter((s) => s.linked?.status === 'Linked').length;
  const unlinked = symbols.length - linked;

  return (
    <Box sx={{ py: 1 }}>
      <Stack direction="row" spacing={1} sx={{ px: 2, py: 1, alignItems: 'center' }}>
        <TagChip label={`${linked} linked`} tone="success" dot />
        {unlinked > 0 && <TagChip label={`${unlinked} unlinked`} tone="warning" dot />}
      </Stack>
      <List disablePadding>
        {symbols.map((s) => (
          <ListItemButton key={s.id} selected={s.id === selectedId} onClick={() => onSelect(s.id)} sx={{ display: 'block', px: 2, py: 0.75 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
              <Typography variant="meta" color="text.meta">
                {s.id}
              </Typography>
              <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
                {s.label}
              </Typography>
              <Typography variant="meta" color="text.meta">
                ×1
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', pl: 3.5 }}>
              <Typography variant="body2" color="text.secondary" noWrap>
                {s.linked ? `${s.linked.name} · ${s.linked.source}` : 'No part chosen'}
              </Typography>
              {s.linked?.status === 'Unlinked' && <TagChip label="Unlinked" tone="warning" dot />}
            </Stack>
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
