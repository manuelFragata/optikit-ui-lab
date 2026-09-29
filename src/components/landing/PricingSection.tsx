import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import type { PricingPlan } from '../../demo/landingContent';
import { PillButton } from './PillButton';
import { SectionHeading } from './SectionHeading';

export interface PricingSectionProps {
  plans: PricingPlan[];
  onChoosePlan?: (id: string) => void;
}

/** The plans side by side. */
export function PricingSection({ plans, onChoosePlan }: PricingSectionProps) {
  return (
    <Stack spacing={{ xs: 4, md: 6 }}>
      <SectionHeading eyebrow="Pricing" title="Designing is free">
        Pay when you need more private projects, or the files to print and order parts.
      </SectionHeading>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          alignItems: 'stretch',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: `repeat(${plans.length}, minmax(0, 1fr))` },
        }}
      >
        {plans.map((plan) => (
          <Paper
            key={plan.id}
            variant="outlined"
            sx={[
              { display: 'flex', flexDirection: 'column', gap: 2.5, p: 3, borderRadius: (t) => `${t.radius.stage}px` },
              // Highlighted plan: a double-weight accent outline.
              plan.highlighted
                ? (t) => ({ borderColor: (t.vars ?? t).palette.primary.main, boxShadow: `inset 0 0 0 ${t.layout.hairline}px ${(t.vars ?? t).palette.primary.main}` })
                : {},
            ]}
          >
            <Box>
              <Typography variant="overline" color={plan.highlighted ? 'primary' : 'text.secondary'}>
                {plan.name}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                <Typography variant="headline" component="div">
                  {plan.price}
                </Typography>
                {plan.period && (
                  <Typography variant="body2" color="text.secondary">
                    {plan.period}
                  </Typography>
                )}
              </Stack>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                {plan.pitch}
              </Typography>
            </Box>

            <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0, flex: 1 }}>
              {plan.features.map((feature) => (
                <Stack component="li" key={feature} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                  <CheckIcon fontSize="small" sx={{ color: 'success.main' }} />
                  <Typography variant="body1">{feature}</Typography>
                </Stack>
              ))}
            </Stack>

            <PillButton tone={plan.highlighted ? 'solid' : 'outline'} size="large" onClick={() => onChoosePlan?.(plan.id)} sx={{ alignSelf: 'flex-start' }}>
              {plan.cta}
            </PillButton>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
}
