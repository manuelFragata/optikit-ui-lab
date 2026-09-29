import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { getContrastRatio, type Theme } from '@mui/material/styles';
import { TagChip, type TagTone } from '../../components/primitives/TagChip';
import {
  brand,
  canvasColors,
  colorRoles,
  colors,
  rayColors,
  type ColorRoles,
  type SchemeColors,
} from '../../theme/tokens';

// Token stories read tokens.ts directly: their job is to document the raw values.

type Mode = 'light' | 'dark';
const MODES: Mode[] = ['light', 'dark'];

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

const gridSx = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: (theme: Theme) => `repeat(auto-fill, minmax(${theme.spacing(26)}, 1fr))`,
} as const;

function Swatch({ name, color, against }: { name: string; color: string; against?: { label: string; bg: string } }) {
  return (
    <Box sx={cardSx}>
      <Box sx={{ bgcolor: color, height: (theme) => theme.spacing(8), borderBottom: 1, borderColor: 'divider' }} />
      <Stack spacing={0.5} sx={{ p: 1.5 }}>
        <Typography variant="subtitle2">{name}</Typography>
        <Typography variant="mono" color="text.secondary">
          {color}
        </Typography>
        {against && <ContrastRow label={`vs ${against.label}`} fg={color} bg={against.bg} />}
      </Stack>
    </Box>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <Stack spacing={1.5} sx={{ mb: 5 }}>
      <Box>
        <Typography variant="h2">{title}</Typography>
        {note && (
          <Typography variant="body2" color="text.secondary">
            {note}
          </Typography>
        )}
      </Box>
      {children}
    </Stack>
  );
}

function SchemeSwatches({ mode }: { mode: Mode }) {
  const c = colors[mode];
  return (
    <Box sx={gridSx}>
      {(Object.keys(c) as (keyof SchemeColors)[]).map((key) => (
        <Swatch key={key} name={key} color={c[key]} against={{ label: 'surface', bg: c.surface }} />
      ))}
    </Box>
  );
}

function pairsFor(r: ColorRoles): { name: string; bg: string; fg: string }[] {
  return [
    { name: 'button: onAccent / accent', bg: r.primary.main, fg: r.primary.contrastText },
    { name: 'selected: onAccentSoft / accentSoft', bg: r.primary.soft, fg: r.primary.onSoft },
    { name: 'badge: onStatusSoft / statusSoft', bg: r.success.soft, fg: r.success.onSoft },
    { name: 'link: accent / surface', bg: r.background.paper, fg: r.primary.main },
    { name: 'ink / page', bg: r.background.default, fg: r.text.primary },
    { name: 'ink 2 / surface', bg: r.background.paper, fg: r.text.secondary },
    { name: 'ink 3 / surface (meta floor)', bg: r.background.paper, fg: r.text.meta },
    { name: 'ink 2 / sunken (fields)', bg: r.background.sunken, fg: r.text.secondary },
    { name: 'header bar: white / anchor', bg: r.header.main, fg: r.header.contrastText },
  ];
}

function RolePairs({ mode }: { mode: Mode }) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="h5">{mode === 'light' ? 'Light' : 'Dark'}</Typography>
      {pairsFor(colorRoles[mode]).map((pair) => (
        <Box key={pair.name} sx={{ ...cardSx, display: 'flex' }}>
          <Box
            sx={{
              bgcolor: pair.bg,
              color: pair.fg,
              width: (theme) => theme.spacing(12),
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              borderRight: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="h5" component="span">
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

const twoColSx = { display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } } as const;

const meta = {
  title: 'Tokens/Colours',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SchemeColours: Story = {
  name: 'Scheme colours',
  render: () => (
    <>
      {MODES.map((mode) => (
        <Section
          key={mode}
          title={mode === 'light' ? 'Light' : 'Dark'}
          note="Accent for buttons, selection, focus and links; status fills only; ink 3 is the 4.5:1 floor. Contrast is against this scheme's surface."
        >
          <SchemeSwatches mode={mode} />
        </Section>
      ))}
    </>
  ),
};

export const Brand: Story = {
  render: () => (
    <Section title="Brand" note="Identity only. Anchor: wordmark and page titles, light mode only. Lime: logo and landing page only.">
      <Box sx={gridSx}>
        <Swatch name="anchor" color={brand.anchor} against={{ label: 'white', bg: colors.light.surface }} />
        <Swatch name="lime" color={brand.lime} against={{ label: 'white', bg: colors.light.surface }} />
      </Box>
    </Section>
  ),
};

export const Canvas: Story = {
  render: () => (
    <>
      {MODES.map((mode) => (
        <Section key={mode} title={`Canvas · ${mode}`} note="No brand colour on the drawing surface. Rays are drawn 2px with an arrow and a label.">
          <Box sx={gridSx}>
            {Object.entries(canvasColors[mode]).map(([name, color]) => (
              <Swatch key={name} name={name} color={color} />
            ))}
            {Object.entries(rayColors[mode]).map(([name, color]) => (
              <Swatch key={name} name={name} color={color} against={{ label: 'ground', bg: canvasColors[mode].ground }} />
            ))}
          </Box>
        </Section>
      ))}
    </>
  ),
};

export const SemanticPairs: Story = {
  name: 'Semantic pairs',
  render: () => (
    <Box sx={twoColSx}>
      <RolePairs mode="light" />
      <RolePairs mode="dark" />
    </Box>
  ),
};
