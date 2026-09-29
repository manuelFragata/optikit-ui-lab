import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import type { FeatureHighlight, PricingPlan } from '../../demo/landingContent';
import { FeatureBench } from './FeatureBench';
import { SectionHeading } from './SectionHeading';

export interface PricingSectionProps {
  features: FeatureHighlight[];
  plans: PricingPlan[];
  onChoosePlan?: (id: string) => void;
}

/** How it works (the feature bench), then the plans side by side. */
export function PricingSection({ features, plans, onChoosePlan }: PricingSectionProps) {
  return (
    <Stack spacing={{ xs: 5, md: 7 }}>
      <SectionHeading eyebrow="How it works" title="From a sketch to a box of parts" />
      <FeatureBench features={features} />

      <Box sx={{ pt: { xs: 2, md: 4 } }}>
        <SectionHeading eyebrow="Pricing" title="Designing is free">
          Pay when you need more private projects, or the files to print and order parts.
        </SectionHeading>
      </Box>

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
              { display: 'flex', flexDirection: 'column', gap: 2.5, p: 3, borderRadius: (t) => `${t.radius.card}px` },
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

            <Button variant={plan.highlighted ? 'contained' : 'outlined'} size="large" onClick={() => onChoosePlan?.(plan.id)}>
              {plan.cta}
            </Button>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
}
