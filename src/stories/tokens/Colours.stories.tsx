import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { getContrastRatio, type Theme } from '@mui/material/styles';
import { TagChip, type TagTone } from '../../components/primitives/TagChip';
import { brand, colorRoles, grey, white, type ColorRoles } from '../../theme/tokens';

// Token stories read tokens.ts directly: their job is to document the raw values.

function grade(ratio: number): { label: string; tone: TagTone } {
  if (ratio >= 7) return { label: 'AAA', tone: 'success' };
  if (ratio >= 4.5) return { label: 'AA', tone: 'success' };
  if (ratio >= 3) return { label: 'AA large', tone: 'warning' };
  return { label: 'Fail', tone: 'error' };
}

function ContrastRow({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  const ratio = getContrastRatio(fg, bg);
  const { label: gradeLabel, tone } = grade(ratio);
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="mono">{ratio.toFixed(2)}:1</Typography>
        <TagChip label={gradeLabel} tone={tone} />
      </Stack>
    </Stack>
  );
}

const cardSx = {
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  overflow: 'hidden',
  bgcolor: 'background.paper',
} as const;

function Swatch({ name, color }: { name: string; color: string }) {
  return (
    <Box sx={cardSx}>
      <Box sx={{ bgcolor: color, height: (theme) => theme.spacing(10) }} />
      <Stack spacing={0.5} sx={{ p: 1.5 }}>
        <Typography variant="subtitle2">{name}</Typography>
        <Typography variant="mono" color="text.secondary">
          {color}
        </Typography>
        <ContrastRow label="vs white" fg={color} bg={white} />
        <ContrastRow label={`vs grey 900`} fg={color} bg={grey[900]} />
      </Stack>
    </Box>
  );
}

const gridSx = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: (theme: Theme) => `repeat(auto-fill, minmax(${theme.spacing(30)}, 1fr))`,
} as const;

function pairsFor(roles: ColorRoles): { name: string; bg: string; fg: string }[] {
  return [
    { name: 'primary', bg: roles.primary.main, fg: roles.primary.contrastText },
    { name: 'secondary', bg: roles.secondary.main, fg: roles.secondary.contrastText },
    { name: 'accent', bg: roles.accent.main, fg: roles.accent.contrastText },
    { name: 'header', bg: roles.header.main, fg: roles.header.contrastText },
    { name: 'text.primary / default', bg: roles.background.default, fg: roles.text.primary },
    { name: 'text.primary / paper', bg: roles.background.paper, fg: roles.text.primary },
    { name: 'text.secondary / paper', bg: roles.background.paper, fg: roles.text.secondary },
    { name: 'primary / paper (links, icons)', bg: roles.background.paper, fg: roles.primary.main },
  ];
}

function RolePairs({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="h5">{mode === 'light' ? 'Light' : 'Dark'}</Typography>
      {pairsFor(colorRoles[mode]).map((pair) => (
        <Box key={pair.name} sx={{ ...cardSx, display: 'flex' }}>
          <Box
            sx={{
              bgcolor: pair.bg,
              color: pair.fg,
              width: (theme) => theme.spacing(14),
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Typography variant="h6" component="span">
              Aa
            </Typography>
          </Box>
          <Stack spacing={0.25} sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2">{pair.name}</Typography>
            <Typography variant="mono" color="text.secondary">
              {pair.fg} on {pair.bg}
            </Typography>
            <ContrastRow label="contrast" fg={pair.fg} bg={pair.bg} />
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

const meta = {
  title: 'Tokens/Colours',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Brand: Story = {
  render: () => (
    <Box sx={gridSx}>
      {Object.entries(brand).map(([name, color]) => (
        <Swatch key={name} name={name} color={color} />
      ))}
    </Box>
  ),
};

export const Greys: Story = {
  render: () => (
    <Box sx={gridSx}>
      {Object.entries(grey).map(([step, color]) => (
        <Swatch key={step} name={`grey ${step}`} color={color} />
      ))}
    </Box>
  ),
};

export const SemanticRoles: Story = {
  render: () => (
    <Box sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      <RolePairs mode="light" />
      <RolePairs mode="dark" />
    </Box>
  ),
};
