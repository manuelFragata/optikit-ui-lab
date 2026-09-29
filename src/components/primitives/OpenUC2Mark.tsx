import Box, { type BoxProps } from '@mui/material/Box';
import type { Theme } from '@mui/material/styles';

/**
 * Geometry of the openUC2 mark: seven isometric cubes on a regular isometric
 * grid, one in the centre and six around it. Units: cube edge = 10, so a cube
 * is 2·W wide (W = 10·cos 30°) and 20 tall; neighbours sit 2·W apart
 * horizontally and 10 apart vertically.
 */
const W = 5 * Math.sqrt(3);
const S = 10;
const CENTRES: [number, number][] = [
  [0, -2 * S],
  [-2 * W, -S],
  [2 * W, -S],
  [0, 0],
  [-2 * W, S],
  [2 * W, S],
  [0, 2 * S],
];
const VIEW_W = 6 * W;
const VIEW_H = 6 * S;

const r = (n: number) => Math.round(n * 1000) / 1000;
const pts = (...p: [number, number][]) => p.map(([x, y]) => `${r(x)},${r(y)}`).join(' ');

function cube([cx, cy]: [number, number]) {
  const T: [number, number] = [cx, cy - S];
  const UL: [number, number] = [cx - W, cy - S / 2];
  const UR: [number, number] = [cx + W, cy - S / 2];
  const C: [number, number] = [cx, cy];
  const LL: [number, number] = [cx - W, cy + S / 2];
  const LR: [number, number] = [cx + W, cy + S / 2];
  const B: [number, number] = [cx, cy + S];
  return {
    top: pts(T, UR, C, UL),
    leftUpper: pts(UL, C, LL),
    rightUpper: pts(UR, LR, C),
    // The lower faces are drawn as whole parallelograms under the upper
    // triangles, so no background shows through the anti-aliased seam.
    leftLower: pts(UL, C, B, LL),
    rightLower: pts(C, UR, LR, B),
  };
}

const FACES = CENTRES.map(cube);
type Face = keyof (typeof FACES)[number];
const FACE_NAMES: Face[] = ['top', 'leftUpper', 'leftLower', 'rightUpper', 'rightLower'];
/** Paint order: lower faces first, their upper triangles on top. */
const PAINT_ORDER: Face[] = ['leftLower', 'rightLower', 'leftUpper', 'rightUpper', 'top'];

/** Width / height of the mark, for sizing it next to text. */
export const OPENUC2_MARK_ASPECT = VIEW_W / VIEW_H;

export interface OpenUC2MarkProps extends Omit<BoxProps<'svg'>, 'component' | 'children'> {
  /**
   * `auto`: full colour in the light scheme, the approved greyscale mark in
   * the dark scheme. `mono`: always the greyscale mark (for dark bars such as
   * the navy header).
   */
  variant?: 'auto' | 'mono';
  /** Accessible name; omit when the mark sits next to a text wordmark. */
  title?: string;
}

/**
 * The openUC2 mark as inline SVG. Size it with `height` (width follows).
 * Brand rules: no shadows, glows, gradients, outlines or rotation, and no
 * colours other than the two approved versions (see `markColors` in tokens).
 */
export function OpenUC2Mark({ variant = 'auto', title, sx, ...rest }: OpenUC2MarkProps) {
  const faceSx = (theme: Theme) => {
    const { mark, markMono } = (theme.vars ?? theme).palette.brand;
    const m = variant === 'mono' ? markMono : mark;
    return Object.fromEntries(FACE_NAMES.map((f) => [`& .${f}`, { fill: m[f] }]));
  };

  return (
    <Box
      component="svg"
      viewBox={`${r(-VIEW_W / 2)} ${-VIEW_H / 2} ${r(VIEW_W)} ${VIEW_H}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      sx={[{ display: 'block', flexShrink: 0, height: '1em', width: 'auto', aspectRatio: `${OPENUC2_MARK_ASPECT}` }, faceSx, ...(Array.isArray(sx) ? sx : [sx])]}
      {...rest}
    >
      {FACES.map((c, i) => (
        <g key={i}>
          {PAINT_ORDER.map((f) => (
            <polygon key={f} className={f} points={c[f]} />
          ))}
        </g>
      ))}
    </Box>
  );
}
