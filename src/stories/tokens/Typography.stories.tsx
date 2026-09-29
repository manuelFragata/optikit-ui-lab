import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { fontFamily, typeScale, type TypeScaleVariant } from '../../theme/tokens';

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

export const Families: Story = {
  render: () => (
    <Stack spacing={3}>
      {Object.entries(fontFamily).map(([name, family]) => (
        <Stack key={name} spacing={0.5}>
          <Typography variant="overline" color="text.secondary">
            {name}
          </Typography>
          <Typography variant="h3" component="p" sx={{ fontFamily: family }}>
            AaBbCc 0123456789 ±×÷ λ µm
          </Typography>
          <Typography variant="mono" color="text.secondary">
            {family}
          </Typography>
        </Stack>
      ))}
    </Stack>
  ),
};
