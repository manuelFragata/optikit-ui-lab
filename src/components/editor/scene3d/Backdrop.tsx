/**
 * 2D's paper: under the scene, as crisp SVG, what a drawing has and a 3D
 * floor does not: the grid (a line through every cube centre, every fifth
 * one stronger, one pixel wide at any zoom), the origin, and the group boxes
 * with their names. `Backdrop` is the DOM; `BackdropSync`, inside the canvas,
 * moves it with the camera on every frame (directly, not through React
 * state, so it never trails the scene).
 */
import { useFrame } from '@react-three/fiber';
import Box from '@mui/material/Box';
import { Vector3 } from 'three';
import type { RefObject } from 'react';
import { layerShowOfAny, type LayerShow } from '../layers';
import type { Schematic } from '../model';
import { PX_PER_MM } from './Camera';
import { CUBE_MM, GRID_MM, toThree } from './layout3d';

/** How far the grid reaches either way from the origin, in cubes. */
const REACH = 200;
/** Below this size on screen, px, a cube's lines would be a grey wash: only every fifth one shows. */
const MINOR_MIN_PX = 10;
const SHOW_OPACITY: Record<LayerShow, number> = { current: 1, ghost: 0.16, hidden: 0 };
/** A length that is `n` px on screen at 100 %, in mm on paper: the drawing's own marks keep the schematic's sizes. */
const px = (n: number) => n / PX_PER_MM;
/** Room kept round a group's cubes, mm. */
const PAD_MM = px(8);
/** The drawing's own text (group names, the origin): 11 px on screen at any zoom, as the parts' names keep their size. */
const TEXT = { fontSize: 'calc(11px / var(--zoom, 1))' } as const;

/** The lines through the cube centres (the light runs along them, as on the schematic), every `step` cubes, mm, y down. */
function gridPath(step: number) {
  const at = (n: number) => n * GRID_MM.x;
  const lo = at(-REACH);
  const hi = at(REACH);
  let d = '';
  for (let n = -REACH; n <= REACH; n += step) d += `M${at(n)} ${lo}V${hi}M${lo} ${at(n)}H${hi}`;
  return d;
}
const MINOR = gridPath(1);
const MAJOR = gridPath(5);
const line = { fill: 'none', vectorEffect: 'non-scaling-stroke' } as const;

export interface BackdropRefs {
  /** The group drawn in paper mm (y down), placed and scaled by the camera. */
  paper: RefObject<SVGGElement | null>;
  minor: RefObject<SVGPathElement | null>;
}

/** The paper under the 2D scene: the grid, the origin, the groups (dimmed off the current layer, as the parts are). */
export function Backdrop({ refs, schematic, layer, otherLayers }: { refs: BackdropRefs; schematic: Schematic; layer: number; otherLayers: boolean }) {
  const boxes = schematic.groups.flatMap((g) => {
    const members = schematic.symbols.filter((s) => s.group === g.id);
    if (!members.length) return [];
    const xs = members.map((s) => s.x * GRID_MM.x);
    const ys = members.map((s) => -s.y * GRID_MM.y);
    const h = CUBE_MM / 2 + PAD_MM;
    const opacity =
      SHOW_OPACITY[
        layerShowOfAny(
          members.map((s) => s.z),
          layer,
          otherLayers,
        )
      ];
    // Room under the cubes for the parts' names.
    return [{ id: g.id, label: g.label, x: Math.min(...xs) - h, y: Math.min(...ys) - h, w: Math.max(...xs) - Math.min(...xs) + 2 * h, h: Math.max(...ys) - Math.min(...ys) + 2 * h + px(26), opacity }];
  });
  return (
    <Box component="svg" aria-hidden sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}>
      <g ref={refs.paper}>
        <Box component="path" ref={refs.minor} d={MINOR} strokeWidth={1} sx={{ stroke: 'var(--mui-palette-canvas-grid)' }} {...line} />
        <Box component="path" d={MAJOR} strokeWidth={1} sx={{ stroke: 'var(--mui-palette-canvas-gridMajor)' }} {...line} />
        {/* The origin. */}
        <Box component="g" sx={{ color: 'text.meta' }}>
          <path d={`M${-px(11)} 0H${px(11)}M0 ${-px(11)}V${px(11)}`} stroke="currentColor" strokeWidth={1} {...line} />
          <circle r={px(3)} stroke="currentColor" strokeWidth={1} {...line} />
          <text x={px(10)} y={px(21)} style={TEXT} fill="currentColor">
            (0,0)
          </text>
        </Box>
        {boxes.map((g) => (
          <Box component="g" key={g.id} opacity={g.opacity} sx={{ color: 'canvas.group' }}>
            <rect x={g.x} y={g.y} width={g.w} height={g.h} stroke="currentColor" strokeWidth={1} strokeDasharray="5 4" {...line} />
            <Box component="text" x={g.x + px(6)} y={g.y - px(10)} style={TEXT} sx={{ fill: 'var(--mui-palette-text-secondary)', letterSpacing: '0.08em', fontWeight: 500 }}>
              {g.label.toUpperCase()}
            </Box>
          </Box>
        ))}
      </g>
    </Box>
  );
}

/** Inside the canvas: keeps the paper under the scene as the 2D camera pans and zooms. */
export function BackdropSync({ refs }: { refs: BackdropRefs }) {
  useFrame(({ camera, size }) => {
    const paper = refs.paper.current;
    if (!paper) return;
    const o = new Vector3(...toThree([0, 0, 0])).project(camera);
    const x = ((o.x + 1) / 2) * size.width;
    const y = ((1 - o.y) / 2) * size.height;
    // Without perspective, the zoom is pixels per mm.
    paper.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${camera.zoom})`);
    paper.style.setProperty('--zoom', String(camera.zoom));
    refs.minor.current?.setAttribute('opacity', CUBE_MM * camera.zoom < MINOR_MIN_PX ? '0' : '1');
  });
  return null;
}
