/**
 * A real optic drawn as it is: its cross-section through the axis, from its
 * prescription, at its true shape (holders/optic.ts `profilePaths`). Glass
 * is a pale fill with a hairline; a mirror's face is the heavier line.
 * `OpticOutline` draws in mm into whatever frame it is given (the
 * schematic); `OpticProfileSvg` is a picture of it that fits its box.
 */
import { useMemo } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { opticShape, profilePaths, sag, type FragmentSurface } from './holders/optic';

const GLASS = 'color-mix(in srgb, var(--mui-palette-primary-main) 16%, transparent)';

/** The face of a mirror (its first surface), as a line, in mm. */
function facePath(surfaces: FragmentSurface[], semi: number, at: number): string {
  const r0 = surfaces[0].geometry?.radius;
  const radius = typeof r0 === 'number' ? r0 : null;
  const steps = 24;
  const pts = Array.from({ length: 2 * steps + 1 }, (_, k) => -semi + (semi * k) / steps).map((r) => `${(at + sag(radius, r)).toFixed(3)} ${r.toFixed(3)}`);
  return `M${pts.join('L')}`;
}

export interface OpticOutlineProps {
  surfaces: FragmentSurface[];
  /** Stroke width, in the frame's units, or in px when `nonScaling`. */
  strokeWidth?: number;
  color?: string;
  /** Strokes keep their width at any zoom (the schematic). */
  nonScaling?: boolean;
}

/** The cross-section in mm, centred on the stack's middle, the axis along x. */
export function OpticOutline({ surfaces, strokeWidth = 0.3, color = 'currentColor', nonScaling = false }: OpticOutlineProps) {
  const drawn = useMemo(() => {
    const shape = opticShape({ fragmentSurfaces: surfaces });
    return shape && { paths: profilePaths(shape), face: surfaces[0]?.is_reflective ? facePath(surfaces, shape.semiMm, shape.vertices[0]) : null };
  }, [surfaces]);
  if (!drawn) return null;
  return (
    <g stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round">
      {drawn.paths.map((d, i) => (
        <path key={i} d={d} fill={GLASS} vectorEffect={nonScaling ? 'non-scaling-stroke' : undefined} />
      ))}
      {drawn.face && <path d={drawn.face} fill="none" strokeWidth={strokeWidth * 2.5} vectorEffect={nonScaling ? 'non-scaling-stroke' : undefined} />}
    </g>
  );
}

/** A picture of the optic that fits its box, with its axis. */
export function OpticProfileSvg({ surfaces, sx, title }: { surfaces: FragmentSurface[]; sx?: SxProps<Theme>; title?: string }) {
  const shape = useMemo(() => opticShape({ fragmentSurfaces: surfaces }), [surfaces]);
  if (!shape) return null;
  const front = Math.min(shape.front(0), shape.front(shape.semiMm));
  const back = Math.max(shape.back(0), shape.back(shape.semiMm));
  const pad = shape.semiMm * 0.25;
  const w = back - front + 2 * pad;
  const h = 2 * (shape.semiMm + pad);
  // Never narrower than tall: a thin lens still reads as a lens, not a hair.
  const width = Math.max(w, h * 0.6);
  const x0 = (front + back) / 2 - width / 2;
  return (
    <Box component="svg" viewBox={`${x0} ${-h / 2} ${width} ${h}`} sx={{ color: 'primary.main', ...sx }} role="img" aria-label={title}>
      <line x1={x0} x2={x0 + width} y1={0} y2={0} stroke="var(--mui-palette-text-meta)" strokeWidth={h / 150} strokeDasharray={`${h / 40} ${h / 60}`} />
      <OpticOutline surfaces={surfaces} strokeWidth={h / 110} />
    </Box>
  );
}
