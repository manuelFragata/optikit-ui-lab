import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import LinkIcon from '@mui/icons-material/Link';
import SchemaOutlinedIcon from '@mui/icons-material/SchemaOutlined';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import type { FeatureHighlight, PricingPlan } from '../../demo/landingContent';
import { SectionHeading } from './SectionHeading';

export interface PricingSectionProps {
  features: FeatureHighlight[];
  plans: PricingPlan[];
  onChoosePlan?: (id: string) => void;
}

const FEATURE_ICONS = {
  schematic: SchemaOutlinedIcon,
  parts: LinkIcon,
  assembly: ViewInArOutlinedIcon,
  export: FileDownloadOutlinedIcon,
} as const;

const tileRadius = (t: { radius: { tile: number } }) => `${t.radius.tile}px`;

/** What Optikit does (four features), then the plans side by side. */
export function PricingSection({ features, plans, onChoosePlan }: PricingSectionProps) {
  return (
    <Stack spacing={{ xs: 5, md: 7 }}>
      <SectionHeading eyebrow="Features and pricing" title="Designing is free">
        Pay when you need more private projects, or the files to print and order parts.
      </SectionHeading>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' } }}>
        {features.map((feature) => {
          const Icon = FEATURE_ICONS[feature.id];
          return (
            <Stack key={feature.id} spacing={1}>
              <Box
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  width: (t) => t.spacing(5),
                  height: (t) => t.spacing(5),
                  borderRadius: tileRadius,
                  bgcolor: 'primary.soft',
                  color: 'primary.onSoft',
                }}
              >
                <Icon fontSize="small" />
              </Box>
              <Typography variant="h3">{feature.title}</Typography>
              <Typography variant="body1" color="text.secondary">
                {feature.text}
              </Typography>
            </Stack>
          );
        })}
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
