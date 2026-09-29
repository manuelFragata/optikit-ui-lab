import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { loadAllFontCandidates } from '../../theme/fonts';
import { defaultFonts, monoFonts, typeScale, uiFonts, type TypeScaleVariant } from '../../theme/tokens';

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

function Candidate({ label, note, family, mono, active, isDefault }: { label: string; note: string; family: string; mono: string; active: boolean; isDefault: boolean }) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: active ? 'primary.main' : 'divider',
        borderRadius: 1,
        p: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mb: 1.5 }}>
        <Typography variant="subtitle2">{label}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {note}
        </Typography>
        {isDefault && (
          <Typography variant="overline" color="text.secondary">
            default
          </Typography>
        )}
        {active && (
          <Typography variant="overline" color="primary">
            in use
          </Typography>
        )}
      </Stack>
      {/* `typography` must come before `fontFamily`, or the variant's own family wins. */}
      <Box>
        <Typography sx={{ typography: 'h1', fontFamily: family }}>openUC2 light sheet microscope</Typography>
        <Typography sx={{ typography: 'h2', fontFamily: family, mt: 0.5 }}>Devices you can build with a core BOX</Typography>
        <Typography sx={{ typography: 'body1', fontFamily: family, mt: 1 }}>
          A brightfield core that drops into any FRAME chassis. Dichroic + filters, Tube lens, Objective.
        </Typography>
        <Typography sx={{ typography: 'body2', fontFamily: family, color: 'text.secondary' }}>
          Add to collection · Export BOM · Open in editor · Symbol palette · Share…
        </Typography>
        <Typography sx={{ typography: 'overline', fontFamily: family, color: 'text.secondary', mt: 1 }}>
          Laser module · Fluor box · Maintainer
        </Typography>
      </Box>
      <Typography sx={{ typography: 'mono', fontFamily: mono, color: 'text.secondary', mt: 0.5 }}>
        v0.4.2 8dc01b2 x 6 y 3 z 1 DMLP505 · 1 unit = 50 mm
      </Typography>
    </Box>
  );
}

/** Every UI font candidate with the current mono font; switch the mono in the toolbar. */
export const FontCandidates: Story = {
  name: 'Font candidates',
  render: function Render() {
    const theme = useTheme();
    useEffect(() => loadAllFontCandidates(), []);
    const mono = monoFonts[theme.fonts.mono].family;
    return (
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          UI fonts from <code>uiFonts</code> in src/theme/tokens.ts, each with the mono font picked in the toolbar. To use one
          everywhere, pick it in the toolbar's "Font" menu; to make it the default, set <code>defaultFonts.ui</code>.
        </Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          {Object.entries(uiFonts).map(([name, f]) => (
            <Candidate
              key={name}
              label={f.label}
              note={f.note}
              family={f.family}
              mono={mono}
              active={theme.fonts.ui === name}
              isDefault={defaultFonts.ui === name}
            />
          ))}
        </Box>
      </Stack>
    );
  },
};

export const MonoCandidates: Story = {
  name: 'Mono candidates',
  render: function Render() {
    const theme = useTheme();
    useEffect(() => loadAllFontCandidates(), []);
    return (
      <Stack spacing={1.5}>
        {Object.entries(monoFonts).map(([name, f]) => (
          <Stack key={name} direction="row" spacing={2} sx={{ alignItems: 'baseline' }}>
            <Typography variant="subtitle2" sx={{ width: (t) => t.spacing(20), flexShrink: 0 }}>
              {f.label}
              {theme.fonts.mono === name ? ' ·  in use' : ''}
            </Typography>
            <Typography sx={{ fontSize: '0.875rem' }} style={{ fontFamily: f.family }}>
              v0.4.2 8dc01b2 · x 6 y 3 z 1 · 505 nm · 0O1lI · 1 unit = 50 mm
            </Typography>
          </Stack>
        ))}
      </Stack>
    );
  },
};
