import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { FeatureHighlight } from '../../demo/landingContent';
import { CubeThumbnail } from '../cards/CubeThumbnail';
import { SymbolGlyph } from '../editor/SymbolGlyph';
import { TagChip } from '../primitives/TagChip';

export interface FeatureBenchProps {
  /** Four steps, drawn left to right as cubes on one beam. */
  features: FeatureHighlight[];
}

const BEAM = 2; // beam thickness, in hairlines
const cubeRadius = (t: Theme) => `${t.radius.tile}px`;
const rule = (t: Theme, style: 'dashed' | 'dotted') => `${t.layout.hairline}px ${style} ${(t.vars ?? t).palette.divider}`;
const glyphStroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke' } as const;

/* ---- What each cube shows: a real piece of the workflow, not an icon. ---- */

function SketchFace() {
  return (
    <Box component="svg" viewBox="-3.2 -2 13.4 4" aria-hidden sx={{ width: '100%', height: 'auto', display: 'block', color: 'text.primary' }}>
      <Box component="g" sx={{ color: 'rays.ray1' }}>
        <line x1={0} y1={0} x2={6.6} y2={0} stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </Box>
      <Box component="g" sx={{ '& *': glyphStroke }}>
        <SymbolGlyph kind="laser" />
        <g transform="translate(3.6 0)">
          <SymbolGlyph kind="lens" />
        </g>
        <g transform="translate(9 0)">
          <SymbolGlyph kind="camera" />
        </g>
      </Box>
    </Box>
  );
}

/** The two placement states and the move between them (UI-V4: realize / freeze). */
function MountFace() {
  return (
    <Stack spacing={1} sx={{ width: '100%' }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <Box component="svg" viewBox="-0.8 -1.6 1.6 3.2" aria-hidden sx={{ width: (t) => t.spacing(2), flexShrink: 0, color: 'text.primary', '& *': glyphStroke }}>
          <SymbolGlyph kind="lens" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            Tube lens, f = 50
          </Typography>
          <Typography variant="meta" color="text.meta" component="div" noWrap>
            AC254-050-A · Thorlabs
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
        <TagChip label="Not mounted yet" tone="warning" dot size="small" />
        <ArrowForwardIcon sx={{ fontSize: '0.875rem', color: 'text.meta' }} />
        <TagChip label="In a cube" tone="success" dot size="small" />
      </Stack>
      <Typography variant="meta" color="text.meta" component="div" noWrap>
        Realize · Lens holder, f = 50
      </Typography>
    </Stack>
  );
}

function AssembleFace() {
  return (
    <Box sx={{ width: '100%', borderRadius: cubeRadius, overflow: 'hidden' }}>
      <CubeThumbnail cubes={3} size="tile" />
    </Box>
  );
}

const PARTS = [
  { qty: 3, name: 'Cube, 50 mm' },
  { qty: 1, name: 'Dichroic holder' },
  { qty: 1, name: 'IMX477 camera' },
];

function BuildFace() {
  return (
    <Stack spacing={0.5} sx={{ width: '100%' }}>
      {PARTS.map((p) => (
        <Stack key={p.name} direction="row" spacing={1} sx={(t) => ({ alignItems: 'baseline', borderBottom: rule(t, 'dotted'), pb: 0.5 })}>
          <Typography variant="meta" color="text.meta" sx={{ width: (t) => t.spacing(3) }}>
            {p.qty}×
          </Typography>
          <Typography variant="body2" noWrap>
            {p.name}
          </Typography>
        </Stack>
      ))}
      <Stack direction="row" spacing={0.75} sx={{ pt: 0.75 }}>
        <TagChip label="parts.csv" size="small" />
        <TagChip label="assembly.step" size="small" />
      </Stack>
    </Stack>
  );
}

const FACES: Record<FeatureHighlight['id'], () => ReactNode> = {
  schematic: SketchFace,
  parts: MountFace,
  assembly: AssembleFace,
  export: BuildFace,
};

/** A cube on the plate: hairline body, a screw in each corner, beam ports left and right. */
function Cube({ children }: { children: ReactNode }) {
  const screw = { position: 'absolute', width: (t: Theme) => t.spacing(0.75), height: (t: Theme) => t.spacing(0.75), borderRadius: '50%', border: 1, borderColor: 'text.meta' } as const;
  const port = {
    position: 'absolute',
    top: '50%',
    width: (t: Theme) => t.spacing(1),
    height: (t: Theme) => t.spacing(1),
    mt: -0.5,
    borderRadius: '50%',
    bgcolor: 'rays.ray1',
    display: { xs: 'none', md: 'block' },
  } as const;
  const inset = 0.75;
  return (
    <Box
      sx={{
        position: 'relative',
        height: (t) => t.spacing(t.layout.featureCubeHeight),
        display: 'flex',
        alignItems: 'center',
        px: 2.5,
        border: 1,
        borderColor: 'text.secondary',
        borderRadius: cubeRadius,
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ ...screw, top: (t) => t.spacing(inset), left: (t) => t.spacing(inset) }} />
      <Box sx={{ ...screw, top: (t) => t.spacing(inset), right: (t) => t.spacing(inset) }} />
      <Box sx={{ ...screw, bottom: (t) => t.spacing(inset), left: (t) => t.spacing(inset) }} />
      <Box sx={{ ...screw, bottom: (t) => t.spacing(inset), right: (t) => t.spacing(inset) }} />
      <Box sx={{ ...port, left: (t) => t.spacing(-0.5) }} />
      <Box sx={{ ...port, right: (t) => t.spacing(-0.5) }} />
      {children}
    </Box>
  );
}

/**
 * The features as a small optical bench: four cubes on a dotted baseplate,
 * one laser beam running through all of them, a photon travelling along it.
 * Each cube shows a real piece of that step instead of an icon.
 */
export function FeatureBench({ features }: FeatureBenchProps) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  return (
    <Box
      sx={(t) => ({
        position: 'relative',
        p: { xs: 2.5, md: 4 },
        borderRadius: `${t.radius.card}px`,
        border: 1,
        borderColor: 'divider',
        // The baseplate: a dot every half cube.
        backgroundColor: (t.vars ?? t).palette.background.sunken,
        backgroundImage: `radial-gradient(${(t.vars ?? t).palette.canvas.gridMajor} ${t.layout.hairline * 1.5}px, transparent ${t.layout.hairline * 1.5}px)`,
        backgroundSize: `${t.spacing(2)} ${t.spacing(2)}`,
      })}
    >
      <Box sx={{ position: 'relative', display: 'grid', gap: { xs: 3, md: 5 }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', md: `repeat(${features.length}, minmax(0, 1fr))` } }}>
        {/* The beam, from the plate's left edge to its right, through the cube row. */}
        <Box
          aria-hidden
          sx={(t) => ({
            display: { xs: 'none', md: 'block' },
            position: 'absolute',
            left: t.spacing(-4),
            right: t.spacing(-4),
            top: `calc(${t.spacing(t.layout.featureCubeHeight / 2)} - ${(t.layout.hairline * BEAM) / 2}px)`,
            height: `${t.layout.hairline * BEAM}px`,
            bgcolor: 'rays.ray1',
            overflow: 'hidden',
          })}
        >
          {!reducedMotion && (
            <Box
              sx={(t) => ({
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: t.spacing(12),
                background: `linear-gradient(90deg, transparent, ${(t.vars ?? t).palette.background.paper}, transparent)`,
                animation: 'benchPhoton 3.2s linear infinite',
                '@keyframes benchPhoton': { from: { left: '-10%' }, to: { left: '110%' } },
              })}
            />
          )}
        </Box>

        {features.map((feature) => {
          const Face = FACES[feature.id];
          return (
            <Stack key={feature.id} spacing={2} sx={{ position: 'relative', minWidth: 0 }}>
              <Cube>
                <Face />
              </Cube>
              <Box sx={{ px: 0.5 }}>
                <Typography variant="h1" component="h3">
                  {feature.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                  {feature.text}
                </Typography>
              </Box>
            </Stack>
          );
        })}
      </Box>
    </Box>
  );
}
