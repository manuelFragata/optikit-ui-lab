import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { density, layout, radius } from '../../theme/tokens';

const STEPS = [0.5, 1, 1.5, 2, 3, 4, 6, 8, 10, 12];

const meta = {
  title: 'Tokens/Spacing',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Row({ label, detail, units }: { label: string; detail: string; units: number }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: (theme) => `${theme.spacing(22)} ${theme.spacing(14)} 1fr`,
        gap: 2,
        alignItems: 'center',
      }}
    >
      <Typography variant="mono">{label}</Typography>
      <Typography variant="mono" color="text.secondary">
        {detail}
      </Typography>
      <Box sx={{ height: (theme) => theme.spacing(1.5), width: (theme) => theme.spacing(units), bgcolor: 'primary.main', borderRadius: 0.5 }} />
    </Box>
  );
}

export const Scale: Story = {
  render: function Render() {
    const theme = useTheme();
    const base = density[theme.density].spacing;
    return (
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Base unit {base}px ({theme.density}). Switch density in the toolbar.
        </Typography>
        {STEPS.map((n) => (
          <Row key={n} label={`spacing(${n})`} detail={`${n * base}px`} units={n} />
        ))}
      </Stack>
    );
  },
};

export const LayoutDimensions: Story = {
  render: function Render() {
    const theme = useTheme();
    const base = density[theme.density].spacing;
    return (
      <Stack spacing={1}>
        {Object.entries(layout)
          .filter(([key]) => key !== 'hairline')
          .map(([key, units]) => (
            <Row key={key} label={key} detail={`${units}u · ${units * base}px`} units={units} />
          ))}
      </Stack>
    );
  },
};

export const Radius: Story = {
  render: () => (
    <Stack direction="row" spacing={3}>
      {[0.5, 1, 2].map((multiple) => (
        <Stack key={multiple} spacing={1} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: (theme) => theme.spacing(10),
              height: (theme) => theme.spacing(10),
              borderRadius: multiple,
              bgcolor: 'secondary.main',
            }}
          />
          <Typography variant="mono">
            {multiple}× = {multiple * radius.base}px
          </Typography>
        </Stack>
      ))}
    </Stack>
  ),
};
