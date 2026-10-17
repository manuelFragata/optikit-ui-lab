/**
 * An ideal part's line art (sketchShapes.ts) in SVG: in a drawing, where the
 * caller sets the scale, or as a picture that fits its box (a sketch tile).
 */
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import type { SchematicSymbol } from './model';
import { sketchShape, type SketchShape } from './sketchShapes';

/** SVG's y runs down; the shape's runs up. A 45° part turns clockwise on screen, as in 3D seen from the top. */
const path = (points: [number, number][], closed?: boolean) => `M${points.map(([x, y]) => `${x} ${-y}`).join('L')}${closed ? 'Z' : ''}`;

/** The lines, in mm; `strokeWidth` in screen pixels when `nonScaling`. */
export function SketchLines({ shape, strokeWidth = 1.5, nonScaling = false, color = 'currentColor' }: { shape: SketchShape; strokeWidth?: number; nonScaling?: boolean; color?: string }) {
  const effect = nonScaling ? 'non-scaling-stroke' : undefined;
  return (
    <g transform={shape.at45 ? 'rotate(45)' : undefined} stroke={color} fill="none" strokeLinejoin="round" strokeLinecap="round">
      {shape.cone && (
        <path
          d={path(
            [
              [shape.cone.x, shape.cone.r0],
              [shape.cone.x + shape.cone.length, shape.cone.r1],
              [shape.cone.x + shape.cone.length, -shape.cone.r1],
              [shape.cone.x, -shape.cone.r0],
            ],
            true,
          )}
          fill={shape.cone.color}
          fillOpacity={0.3}
          stroke="none"
        />
      )}
      {shape.lines.map((l, i) => (
        <path
          key={i}
          d={path(l.points, l.closed)}
          fill={l.fill ?? 'none'}
          fillOpacity={0.45}
          strokeWidth={l.faint ? strokeWidth * 0.65 : strokeWidth}
          strokeOpacity={l.faint ? 0.6 : 1}
          strokeDasharray={l.dashed ? (nonScaling ? '3 2' : `${strokeWidth * 2} ${strokeWidth * 1.5}`) : undefined}
          vectorEffect={effect}
        />
      ))}
    </g>
  );
}

/** The part's line art fitted to its box, at the scale `mmAcross` fills (so tiles of one kind compare by size). */
export function SketchPicture({ part, mmAcross = 40, sx }: { part: Pick<SchematicSymbol, 'kind' | 'inputs'>; mmAcross?: number; sx?: SxProps<Theme> }) {
  const shape = sketchShape(part);
  const h = mmAcross;
  return (
    <Box component="svg" viewBox={`${-h * 0.75} ${-h / 2} ${h * 1.5} ${h}`} sx={{ color: 'primary.main', ...sx }} aria-hidden>
      <line x1={-h * 0.75} x2={h * 0.75} y1={0} y2={0} stroke="var(--mui-palette-text-meta)" strokeWidth={h / 160} strokeDasharray={`${h / 40} ${h / 60}`} />
      <SketchLines shape={shape} strokeWidth={h / 26} />
    </Box>
  );
}
