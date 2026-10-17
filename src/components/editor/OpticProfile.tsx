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
  return surfacePath(surfaces[0], semi, at);
}

/** One surface across the optic, as a line, in mm. */
function surfacePath(surface: FragmentSurface, semi: number, at: number): string {
  const r0 = surface.geometry?.radius;
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

/**
 * A picture of the optic that fits its box, with its axis. `labels`: each
 * surface named at its rim (R1, R2…) and each thickness as a dimension under
 * it (t1, t2…), as the shape's rows name them; `active` (e.g. "R2", "t1"):
 * the one the pointer is on, drawn in the accent colour.
 */
export function OpticProfileSvg({
  surfaces,
  sx,
  title,
  labels = false,
  active = null,
}: {
  surfaces: FragmentSurface[];
  sx?: SxProps<Theme>;
  title?: string;
  labels?: boolean;
  active?: string | null;
}) {
  const shape = useMemo(() => opticShape({ fragmentSurfaces: surfaces }), [surfaces]);
  if (!shape) return null;
  const front = Math.min(shape.front(0), shape.front(shape.semiMm));
  const back = Math.max(shape.back(0), shape.back(shape.semiMm));
  const pad = shape.semiMm * (labels ? 0.75 : 0.25);
  const w = back - front + 2 * pad;
  const h = 2 * (shape.semiMm + pad);
  // Never narrower than tall: a thin lens still reads as a lens, not a hair.
  const width = Math.max(w, h * (labels ? 1.5 : 0.6));
  const x0 = (front + back) / 2 - width / 2;
  return (
    <Box component="svg" viewBox={`${x0} ${-h / 2} ${width} ${h}`} sx={{ color: 'primary.main', ...sx }} role="img" aria-label={title}>
      <line x1={x0} x2={x0 + width} y1={0} y2={0} stroke="var(--mui-palette-text-meta)" strokeWidth={h / 150} strokeDasharray={`${h / 40} ${h / 60}`} />
      <OpticOutline surfaces={surfaces} strokeWidth={h / 110} />
      {labels && <Dimensions surfaces={surfaces} shape={shape} h={h} active={active} />}
    </Box>
  );
}

/** Positions as close to `xs` (ascending) as they can be, at least `gap` apart, about the same middle: labels that do not overlap. */
function spread(xs: number[], gap: number): number[] {
  const out = [...xs];
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + gap);
  const shift = (xs.reduce((a, b) => a + b, 0) - out.reduce((a, b) => a + b, 0)) / xs.length;
  return out.map((x) => x + shift);
}

/**
 * The R and t labels of a profile (see OpticProfileSvg), in its mm frame:
 * each R over its surface's rim, each t under a dimension line from vertex
 * to vertex. Surfaces lie close together, so the labels are spread apart and
 * a thin leader joins each to what it names.
 */
function Dimensions({ surfaces, shape, h, active }: { surfaces: FragmentSurface[]; shape: NonNullable<ReturnType<typeof opticShape>>; h: number; active: string | null }) {
  const semi = shape.semiMm;
  const font = h / 8.5;
  const gap = font * 1.9;
  const accent = 'var(--mui-palette-primary-main)';
  const meta = 'var(--mui-palette-text-secondary)';
  const leader = h / 220;
  const top = -semi - font * 1.1;
  const below = semi + font * 0.45;
  const tick = font * 0.3;
  const rims = surfaces.map((_, i) => shape.vertices[i] + sag(shape.radii[i], semi));
  const rLabels = spread(rims, gap);
  const mids = surfaces.slice(0, -1).map((_, i) => (shape.vertices[i] + shape.vertices[i + 1]) / 2);
  const tLabels = spread(mids, gap);
  return (
    <g fontFamily="inherit" fontSize={font} textAnchor="middle">
      {surfaces.map((s, i) => {
        const key = `R${i + 1}`;
        const on = active === key;
        const color = on ? accent : meta;
        return (
          <g key={key}>
            {on && <path d={surfacePath(s, semi, shape.vertices[i])} stroke={accent} strokeWidth={h / 45} fill="none" />}
            <line x1={rLabels[i]} y1={top + font * 0.25} x2={rims[i]} y2={-semi} stroke={color} strokeWidth={leader} />
            <text x={rLabels[i]} y={top} fill={color} fontWeight={on ? 700 : 400}>
              {key}
            </text>
          </g>
        );
      })}
      {mids.map((m, i) => {
        const key = `t${i + 1}`;
        const on = active === key;
        const a = shape.vertices[i];
        const b = shape.vertices[i + 1];
        const color = on ? accent : meta;
        const y = below + font * 1.5;
        return (
          <g key={key} stroke={color} strokeWidth={on ? h / 70 : leader * 1.5}>
            {/* From vertex to vertex, under the optic. */}
            <line x1={a} x2={b} y1={below} y2={below} />
            <line x1={a} x2={a} y1={below - tick} y2={below + tick} />
            <line x1={b} x2={b} y1={below - tick} y2={below + tick} />
            <line x1={m} y1={below} x2={tLabels[i]} y2={y - font * 0.85} strokeWidth={leader} />
            <text x={tLabels[i]} y={y} stroke="none" fill={color} fontWeight={on ? 700 : 400}>
              {key}
            </text>
          </g>
        );
      })}
    </g>
  );
}
