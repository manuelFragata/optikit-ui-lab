import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { typeScale, type TypeScaleVariant } from '../../theme/tokens';

const SAMPLE = 'Paraxial focus at 49.87 mm';

const meta = {
  title: 'Tokens/Typography',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const TypeScale: Story = {
  render: () => (
    <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
      {(Object.keys(typeScale) as TypeScaleVariant[]).map((variant) => {
        const spec = typeScale[variant];
        return (
          <Box
            key={variant}
            sx={{
              display: 'grid',
              gridTemplateColumns: (theme) => `${theme.spacing(26)} 1fr`,
              gap: 2,
              alignItems: 'baseline',
              py: 1.5,
            }}
          >
            <Stack>
              <Typography variant="subtitle2">{variant}</Typography>
              <Typography variant="mono" color="text.secondary">
                {spec.fontSize} · {spec.fontWeight} · {spec.lineHeight}
              </Typography>
            </Stack>
            <Typography variant={variant}>{SAMPLE}</Typography>
          </Box>
        );
      })}
    </Stack>
  ),
};

/** The two typefaces and what each is for. Both self-hosted, SIL OFL 1.1 (src/theme/fonts). */
export const Fonts: Story = {
  render: () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="text.secondary">
          Objectivity · everything that is read
        </Typography>
        <Typography variant="h1">openUC2 light sheet microscope</Typography>
        <Typography variant="body1" sx={{ mt: 0.5 }}>
          A brightfield core that drops into any FRAME chassis. Dichroic + filters, Tube lens, Objective.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Geometric sans. The openUC2 brand guide names it as the free stand-in for Stolzl.
        </Typography>
      </Box>
      <Box>
        <Typography variant="overline" color="text.secondary">
          JetBrains Mono · values, versions, coordinates, prices
        </Typography>
        <Typography variant="mono" component="div" sx={{ fontSize: '0.875rem' }}>
          v0.4.2 8dc01b2 · x 6 y 3 z 1 · λ 488 nm · €284.50 · 0O1lI
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tall x-height and figures that are easy to tell apart.
        </Typography>
      </Box>
    </Stack>
  ),
};
