import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListSubheader from '@mui/material/ListSubheader';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { TagChip } from '../../primitives/TagChip';
import { formatEur as eur } from '../../primitives/format';
import type { Bom, BomLine } from '../../../ports/service';

export interface BomPanelProps {
  bom: Bom;
  selectedIds: string[];
  /** A line clicked: select its parts on the canvas. */
  onSelectParts: (ids: string[]) => void;
}

function Line({ line, selected, onSelect }: { line: BomLine; selected: boolean; onSelect: () => void }) {
  const each = line.unitPrice;
  return (
    <ListItemButton selected={selected} onClick={onSelect} sx={{ display: 'block', px: 2, py: 0.75 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
        <Typography variant="mono" color="text.secondary" sx={{ minWidth: 24 }}>
          ×{line.qty}
        </Typography>
        <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
          {line.name}
        </Typography>
        <Typography variant="mono" color={each === null ? 'text.meta' : 'text.primary'}>
          {each === null ? 'no price' : eur(each * line.qty)}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ pl: 4 }}>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
          {line.source}
        </Typography>
        {each !== null && line.qty > 1 && (
          <Typography variant="meta" color="text.meta">
            {eur(each)} each
          </Typography>
        )}
      </Stack>
    </ListItemButton>
  );
}

/**
 * The bill of materials: what to buy, how many, and what it costs. Modules
 * first, then the optics that still need a holder. A line with no price
 * says so and stays out of the total. Click a line to select its parts.
 */
export function BomPanel({ bom, selectedIds, onSelectParts }: BomPanelProps) {
  const modules = bom.lines.filter((l) => l.kind === 'module');
  const optics = bom.lines.filter((l) => l.kind === 'optic');
  const subheader = { bgcolor: 'background.paper', lineHeight: 2.5, typography: 'overline', color: 'text.secondary', px: 2 } as const;
  const isSelected = (l: BomLine) => l.partIds.every((id) => selectedIds.includes(id));
  const lines = (ls: BomLine[]) => ls.map((l) => <Line key={l.name} line={l} selected={isSelected(l)} onSelect={() => onSelectParts(l.partIds)} />);

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="headline" component="p">
          {eur(bom.total)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {bom.parts} parts · {bom.lines.length} lines
        </Typography>
        {(bom.unpriced > 0 || optics.length > 0) && (
          <Stack direction="row" useFlexGap sx={{ mt: 1, gap: 1, flexWrap: 'wrap' }}>
            {bom.unpriced > 0 && <TagChip label={`${bom.unpriced} without a price`} tone="warning" dot />}
            {optics.length > 0 && <TagChip label={`${optics.length} ${optics.length === 1 ? 'optic needs' : 'optics need'} a holder`} tone="warning" dot />}
          </Stack>
        )}
      </Box>
      <List disablePadding>
        <ListSubheader sx={subheader}>Modules</ListSubheader>
        {lines(modules)}
        {optics.length > 0 && (
          <>
            <ListSubheader sx={subheader}>Optics, no holder yet</ListSubheader>
            {lines(optics)}
          </>
        )}
      </List>
    </Box>
  );
}
