import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { formatEur as eur, formatPercent as percent } from '../../primitives/format';
import { NumberInput } from '../../primitives/NumberInput';
import { cardSx } from '../card';
import { LOW_MARGIN, type Quote, type QuoteTerms } from './quote';

export interface QuoteTableProps {
  quote: Quote;
  terms: QuoteTerms;
  /** The discount or the assembly hours changed. */
  onTerms: (terms: QuoteTerms) => void;
}

/** The quote's lines, then what is taken off and added, then the total. */
export function QuoteTable({ quote, terms, onTerms }: QuoteTableProps) {
  return (
    <Box sx={(t) => ({ ...cardSx(t), p: 0, overflowX: 'auto' })}>
      <Table size="small" sx={{ '& td, & th': { borderColor: 'divider' }, '& th': { color: 'text.secondary', typography: 'overline' } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ pl: 3 }}>Qty</TableCell>
            <TableCell>Item</TableCell>
            <TableCell align="right">Each</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell align="right">Margin</TableCell>
            <TableCell align="right" sx={{ pr: 3 }}>
              Lead
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {quote.lines.map((l) => (
            <TableRow key={l.name}>
              <TableCell sx={{ pl: 3, typography: 'mono' }}>×{l.qty}</TableCell>
              <TableCell>
                <Typography variant="subtitle2">{l.name}</Typography>
                <Typography variant="meta" color="text.meta">
                  {l.source}
                  {l.kind === 'optic' && ' · no holder yet'}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ typography: 'mono' }}>
                {l.unitPrice === null ? <Box component="span" sx={{ color: 'warning.main' }}>no price</Box> : eur(l.unitPrice)}
              </TableCell>
              <TableCell align="right" sx={{ typography: 'mono' }}>
                {l.unitPrice === null ? '–' : eur(l.unitPrice * l.qty)}
              </TableCell>
              <TableCell align="right" sx={{ typography: 'mono', color: l.marginShare !== null && l.marginShare < LOW_MARGIN ? 'warning.main' : 'text.secondary' }}>
                {l.marginShare === null ? '–' : percent(l.marginShare)}
              </TableCell>
              <TableCell align="right" sx={{ pr: 3, typography: 'mono', color: 'text.secondary' }}>
                {l.leadDays === null ? '–' : `${l.leadDays} d`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Stack sx={{ p: 3, gap: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <SumRow label="Parts" value={eur(quote.parts)} hint={quote.unpriced ? `${quote.unpriced} ${quote.unpriced === 1 ? 'line' : 'lines'} without a price left out` : undefined} />
        <SumRow
          label="Discount"
          control={<NumberInput size="small" value={Math.round(terms.discount * 100)} min={0} max={50} unit="%" ariaLabel="Discount" onChange={(v) => onTerms({ ...terms, discount: v / 100 })} sx={{ width: 96 }} />}
          value={quote.discount ? `−${eur(quote.discount)}` : eur(0)}
        />
        <SumRow
          label="Assembly"
          control={<NumberInput size="small" value={terms.labourHours} min={0} max={40} step={0.5} unit="h" ariaLabel="Assembly hours" onChange={(v) => onTerms({ ...terms, labourHours: v })} sx={{ width: 96 }} />}
          value={eur(quote.labour)}
          hint={`${eur(terms.labourRate)} an hour`}
        />
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Box>
            <Typography variant="subtitle1">Total, excluding VAT</Typography>
            {quote.unpriced > 0 && (
              <Typography variant="meta" color="warning.main">
                {`At least: ${quote.unpriced} ${quote.unpriced === 1 ? 'line has' : 'lines have'} no price yet`}
              </Typography>
            )}
          </Box>
          <Typography variant="h1">{eur(quote.total)}</Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

/** One line of the sums: a label, maybe a field, and the amount. */
function SumRow({ label, control, value, hint }: { label: string; control?: ReactNode; value: string; hint?: string }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2">{label}</Typography>
        {hint && (
          <Typography variant="meta" color="text.meta">
            {hint}
          </Typography>
        )}
      </Box>
      {control}
      <Typography variant="mono" sx={{ minWidth: 96, textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}
