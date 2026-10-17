import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListSubheader from '@mui/material/ListSubheader';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { TagChip } from '../../primitives/TagChip';
import { ORIGINS, seatOf, specLine, stageOf, type SchematicSymbol } from '../model';

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
        {seatOf(p) > 0 && (
          <Typography variant="meta" color="text.meta">
            {seatOf(p) * 90}°
          </Typography>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" noWrap sx={{ pl: 3.5 }}>
        {p.state === 'in-cube' ? `${p.module} · ${ORIGINS[stageOf(s).origin!]}` : p.state === 'unmounted' ? `${p.part} · ${ORIGINS[stageOf(s).origin!]}` : specLine(s) || 'no numbers set'}
      </Typography>
    </ListItemButton>
  );
}

/** Every part of the design, grouped by where it sits: ideal (sketched), not mounted yet, or in a cube. */
export function PartsListPanel({ symbols, selectedId, onSelect }: PartsListPanelProps) {
  const mounted = symbols.filter((s) => s.placement.state === 'in-cube');
  const loose = symbols.filter((s) => s.placement.state === 'unmounted');
  const ideal = symbols.filter((s) => s.placement.state === 'ideal');
  const subheader = { bgcolor: 'background.paper', lineHeight: 2.5, typography: 'overline', color: 'text.secondary', px: 2 } as const;

  return (
    <Box sx={{ py: 1 }}>
      <Stack direction="row" spacing={1} sx={{ px: 2, py: 1, alignItems: 'center' }}>
        {ideal.length > 0 && <TagChip label={`${ideal.length} ideal`} tone="primary" dot />}
        {loose.length > 0 && <TagChip label={`${loose.length} real, not mounted`} tone="warning" dot />}
        <TagChip label={`${mounted.length} mounted`} tone="success" dot />
        {loose.length + ideal.length === 0 && <TagChip label="Buildable" tone="success" />}
      </Stack>
      <List disablePadding>
        {ideal.length > 0 && (
          <>
            <ListSubheader sx={subheader}>1 · Ideal</ListSubheader>
            {ideal.map((s) => (
              <Row key={s.id} s={s} selected={s.id === selectedId} onSelect={onSelect} />
            ))}
          </>
        )}
        {loose.length > 0 && (
          <>
            <ListSubheader sx={subheader}>2 · Real optic, not mounted</ListSubheader>
            {loose.map((s) => (
              <Row key={s.id} s={s} selected={s.id === selectedId} onSelect={onSelect} />
            ))}
          </>
        )}
        <ListSubheader sx={subheader}>3 · Mounted</ListSubheader>
        {mounted.map((s) => (
          <Row key={s.id} s={s} selected={s.id === selectedId} onSelect={onSelect} />
        ))}
      </List>
    </Box>
  );
}
