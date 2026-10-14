import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { Bom } from '../editor/bom';
import { formatEur as eur, formatPercent as percent } from '../primitives/format';
import { PageContainer } from '../compositions/PageContainer';
import { PillButton } from '../landing/PillButton';
import { Pill } from '../primitives/Pill';
import { cardSx } from './card';
import { Titled } from './Titled';
import { buildQuote, LOW_MARGIN, type QuoteCheck, type QuoteTerms, type SupplyList } from './commercial/quote';
import { QuoteTable } from './commercial/QuoteTable';

export interface Customer {
  name: string;
  email: string;
}

export interface CommercialViewProps {
  designName: string;
  version?: string;
  bom: Bom;
  supply: SupplyList;
  /** Assembly labour, EUR per hour. */
  labourRate: number;
  checks: QuoteCheck[];
  /** Who the quote is for, to start with. */
  customer?: Customer;
  /** Send the quote with a link to the design in 3D. */
  onSend: (quote: { customer: Customer; total: number }) => void;
  /** Make a draft quotation in Odoo from the design (WP-332). */
  onCreateOdoo: () => void;
  onDownloadCsv: () => void;
}

const CHECK_ICON: Record<QuoteCheck['state'], ReactNode> = {
  ok: <CheckCircleOutlineIcon fontSize="small" color="success" />,
  warn: <WarningAmberIcon fontSize="small" color="warning" />,
  later: <HourglassEmptyIcon fontSize="small" sx={{ color: 'text.meta' }} />,
};

/**
 * Commercial (UI-V4 §2, internal only): the quote for the open design. Its
 * bill of materials at list price with what each line costs us, its margin
 * and lead time; a discount and the assembly labour; who it is for; the
 * checks before it goes out; and sending it, with a 3D link, or making it a
 * quotation in Odoo.
 */
export function CommercialView({ designName, version, bom, supply, labourRate, checks, customer: initialCustomer, onSend, onCreateOdoo, onDownloadCsv }: CommercialViewProps) {
  const [terms, setTerms] = useState<QuoteTerms>({ discount: 0, labourHours: 2, labourRate });
  const [customer, setCustomer] = useState<Customer>(initialCustomer ?? { name: '', email: '' });
  const quote = buildQuote(bom, supply, terms);
  const warnings = checks.filter((c) => c.state === 'warn').length;

  return (
    <PageContainer sx={{ pt: 3, pb: 8 }}>
      <Box sx={{ display: 'grid', gap: { xs: 2, md: 6 }, alignItems: 'end', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, mb: 3 }}>
        <Box>
          <Pill>Internal</Pill>
          <Typography variant="display" component="h1" sx={{ mt: 1 }}>
            Quote
          </Typography>
        </Box>
        <Box>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {designName}
            {version && ` v${version}`}: list prices, what the parts cost us and when they ship. Only staff see this tab.
          </Typography>
          <Stack direction="row" useFlexGap sx={{ gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <PillButton disabled={!customer.email.trim()} onClick={() => onSend({ customer, total: quote.total })}>
              Send quote & 3D link
            </PillButton>
            <Button variant="outlined" onClick={onCreateOdoo}>
              Create Odoo quotation
            </Button>
            <Button onClick={onDownloadCsv}>Download CSV</Button>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, alignItems: 'start' }}>
        <Titled title="Lines">
          <QuoteTable quote={quote} terms={terms} onTerms={setTerms} />
        </Titled>

        <Stack sx={{ gap: 3 }}>
          <Titled title="For">
            <Box sx={cardSx}>
              <Stack sx={{ gap: 2 }}>
                <TextField label="Name" size="small" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                <TextField label="Email" size="small" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
                <Typography variant="meta" color="text.meta">
                  Valid for 30 days. The 3D link opens the design read-only.
                </Typography>
              </Stack>
            </Box>
          </Titled>

          <Titled title="Margin and delivery">
            <Box sx={cardSx}>
              <Stack direction="row" sx={{ gap: 4 }}>
                <Box>
                  <Typography variant="headline" sx={{ color: quote.marginShare < LOW_MARGIN ? 'warning.main' : 'text.primary' }}>
                    {percent(quote.marginShare)}
                  </Typography>
                  <Typography variant="meta" color="text.meta" sx={{ display: 'block' }}>
                    {eur(quote.margin)} on the parts
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="headline">{quote.leadDays === null ? '–' : `${quote.leadDays} d`}</Typography>
                  <Typography variant="meta" color="text.meta" sx={{ display: 'block' }}>
                    to ship, working days
                  </Typography>
                </Box>
              </Stack>
              {quote.uncosted > 0 && (
                <Typography variant="meta" color="warning.main" sx={{ display: 'block', mt: 1.5 }}>
                  {quote.uncosted} {quote.uncosted === 1 ? 'line has' : 'lines have'} no cost: the margin leaves {quote.uncosted === 1 ? 'it' : 'them'} out.
                </Typography>
              )}
            </Box>
          </Titled>

          <Titled title={warnings > 0 ? `Before it goes out · ${warnings} to look at` : 'Before it goes out'}>
            <Box sx={cardSx}>
              <Stack component="ul" sx={{ gap: 1.5, p: 0, m: 0, listStyle: 'none' }}>
                {checks.map((c) => (
                  <Stack component="li" key={c.label} direction="row" sx={{ gap: 1.25 }}>
                    <Box sx={{ pt: 0.25 }}>{CHECK_ICON[c.state]}</Box>
                    <Box>
                      <Typography variant="subtitle2">{c.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {c.detail}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Titled>
        </Stack>
      </Box>
    </PageContainer>
  );
}
