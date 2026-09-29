import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import type { PricingPlan } from '../../demo/landingContent';
import { PillButton } from './PillButton';
import { SectionHeading } from './SectionHeading';

export interface KitOffer {
  id: string;
  name: string;
  price: string;
  note: string;
}

export interface PricingSectionProps {
  plans: PricingPlan[];
  /** Ready-made cube kits, for people who would rather not print. */
  kits?: KitOffer[];
  onChoosePlan?: (id: string) => void;
  onChooseKit?: (id: string) => void;
}

const rule = (t: Theme) => `${t.layout.hairline}px solid ${(t.vars ?? t).palette.divider}`;

/** A plan's features as outlined tags. */
function FeatureTags({ features, inverted }: { features: string[]; inverted: boolean }) {
  return (
    <Stack component="ul" direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: 'wrap', listStyle: 'none', m: 0, p: 0 }}>
      {features.map((f) => (
        <Box
          component="li"
          key={f}
          sx={(t) => ({
            px: 1.5,
            py: 0.5,
            borderRadius: `${t.radius.pill}px`,
            border: `${t.layout.hairline}px solid`,
            borderColor: inverted ? `color-mix(in srgb, ${(t.vars ?? t).palette.header.contrastText} 35%, transparent)` : 'divider',
            typography: 'meta',
          })}
        >
          {f}
        </Box>
      ))}
    </Stack>
  );
}

/**
 * Pricing as one panel split into columns by hairlines; the highlighted plan
 * is inverted. Features read as tags. Below, the real kits for people who
 * would rather not print.
 */
export function PricingSection({ plans, kits = [], onChoosePlan, onChooseKit }: PricingSectionProps) {
  return (
    <Stack spacing={{ xs: 4, md: 5 }}>
      <SectionHeading title="Designing is free">
        Pay when you need more private projects, or the files to print and order parts.
      </SectionHeading>

      <Box
        sx={(t) => ({
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: `repeat(${plans.length}, minmax(0, 1fr))` },
          border: rule(t),
          borderRadius: `${t.radius.stage}px`,
          overflow: 'hidden',
          bgcolor: 'background.paper',
        })}
      >
        {plans.map((plan, i) => {
          const inverted = Boolean(plan.highlighted);
          return (
            <Stack
              key={plan.id}
              spacing={3}
              sx={(t) => ({
                p: { xs: 3, md: 4 },
                minHeight: { md: t.spacing(64) },
                // Hairlines between columns (between rows on phones).
                borderLeft: { xs: 'none', md: i > 0 ? rule(t) : 'none' },
                borderTop: { xs: i > 0 ? rule(t) : 'none', md: 'none' },
                // The highlighted plan sits on the deep brand blue in both schemes.
                ...(inverted ? { bgcolor: 'header.main', color: 'header.contrastText' } : {}),
              })}
            >
              <Typography variant="meta" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75 }}>
                {plan.name}
              </Typography>

              <Box>
                <Typography variant="display" component="div">
                  {plan.price}
                </Typography>
                {plan.period && (
                  <Typography variant="meta" component="div" sx={{ mt: 0.5, opacity: 0.7 }}>
                    {plan.period}
                  </Typography>
                )}
              </Box>

              <Typography variant="body1" sx={{ opacity: 0.8, maxWidth: (t) => t.spacing(44) }}>
                {plan.pitch}
              </Typography>

              <Box sx={{ flex: 1 }}>
                <FeatureTags features={plan.features} inverted={inverted} />
              </Box>

              <PillButton
                size="large"
                tone={inverted ? 'paper' : 'outline'}
                onClick={() => onChoosePlan?.(plan.id)}
                sx={{ alignSelf: 'flex-start' }}
              >
                {plan.cta}
              </PillButton>
            </Stack>
          );
        })}
      </Box>

      {kits.length > 0 && (
        <Box
          sx={(t) => ({
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: `minmax(0, 1fr) repeat(${kits.length}, minmax(0, 1fr))` },
            border: rule(t),
            borderRadius: `${t.radius.pill}px`,
            overflow: 'hidden',
            [t.breakpoints.down('md')]: { borderRadius: `${t.radius.stage}px` },
          })}
        >
          <Box sx={{ px: { xs: 3, md: 4 }, py: 2.5, display: 'flex', alignItems: 'center' }}>
            <Typography variant="subtitle1">Rather not print? Get the cubes as a kit.</Typography>
          </Box>
          {kits.map((kit) => (
            <ButtonBase
              key={kit.id}
              onClick={() => onChooseKit?.(kit.id)}
              sx={(t) => ({
                justifyContent: 'space-between',
                gap: 2,
                px: { xs: 3, md: 3.5 },
                py: 2,
                textAlign: 'left',
                borderLeft: { xs: 'none', md: rule(t) },
                borderTop: { xs: rule(t), md: 'none' },
                '&:hover .kit-arrow': { transform: 'rotate(45deg)' },
              })}
            >
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                  <Typography variant="subtitle1" noWrap>
                    {kit.name}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    {kit.price}
                  </Typography>
                </Stack>
                <Typography variant="meta" color="text.meta" component="div" noWrap>
                  {kit.note}
                </Typography>
              </Box>
              <Box
                className="kit-arrow"
                aria-hidden
                sx={(t) => ({
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  width: t.spacing(4.5),
                  height: t.spacing(4.5),
                  borderRadius: '50%',
                  border: rule(t),
                  transition: t.transitions.create('transform', { duration: t.transitions.duration.shorter }),
                })}
              >
                <NorthEastIcon fontSize="small" />
              </Box>
            </ButtonBase>
          ))}
        </Box>
      )}
    </Stack>
  );
}
