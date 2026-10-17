/**
 * The canvas's two ways of pointing at the layer rather than at a part:
 * placing a new part, and measuring. Each lays an invisible plane through
 * the current layer's cube centres that takes the pointer while it lasts.
 * Drawn inside the document group (mm, z up).
 */
import { useState } from 'react';
import { Html, Line } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import Box from '@mui/material/Box';
import type { SymbolKind } from '../model';
import type { SceneColors } from './colors';
import { fromThree } from './drag3d';
import { GRID_MM, type Vec3 } from './layout3d';
import { CubeEdges, Glyph } from './shapes';

/** A new part on its way onto the canvas: what it is, and whether it is dragged in from a list (it lands where the button is let go). */
export interface Placing {
  kind: SymbolKind;
  drag?: boolean;
}

/** A point on the layer, in grid steps (tenths when off the grid). */
type Step = { x: number; y: number };

const tenth = (v: number) => Math.round(v * 10) / 10;

/** Where the pointer is on the layer, in grid steps: whole cubes, or tenths with `free`. */
function stepAt(e: ThreeEvent<PointerEvent | MouseEvent>, snap: boolean): Step {
  const [x, y] = fromThree(e.point.toArray() as Vec3);
  const free = snap === e.nativeEvent.shiftKey;
  const step = (mm: number, axis: 'x' | 'y') => (free ? tenth(mm / GRID_MM[axis]) : Math.round(mm / GRID_MM[axis])) || 0;
  return { x: step(x, 'x'), y: step(y, 'y') };
}

/** The plane that takes the pointer, through the layer at `height`. */
type PointerHandler = (e: ThreeEvent<PointerEvent>) => void;
interface PlaneProps {
  height: number;
  onPointerMove?: PointerHandler;
  onPointerOut?: PointerHandler;
  onPointerUp?: PointerHandler;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}
function Plane({ height, ...handlers }: PlaneProps) {
  return (
    <mesh position={[0, 0, height]} {...handlers}>
      <planeGeometry args={[100000, 100000]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  );
}

export interface PlacingPlaneProps {
  placing: Placing;
  /** The height of the current layer's cube centres, document mm. */
  height: number;
  /** Snap to the grid; Shift does the opposite while held. */
  snap: boolean;
  colors: SceneColors;
  /** Where it lands, in grid steps across the layer; `more` with Ctrl held, to place another. */
  onPlace: (at: Step, more: boolean) => void;
}

/**
 * While a part is being placed, it follows the pointer as a ghost, cell by
 * cell (by tenths with Shift). A click places it; dragged in from a list,
 * letting go does.
 */
export function PlacingPlane({ placing, height, snap, colors, onPlace }: PlacingPlaneProps) {
  const [at, setAt] = useState<Step | null>(null);
  const place = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    e.stopPropagation();
    onPlace(stepAt(e, snap), e.nativeEvent.ctrlKey || e.nativeEvent.metaKey);
  };
  return (
    <>
      <Plane
        height={height}
        onPointerMove={(e) => {
          e.stopPropagation();
          setAt(stepAt(e, snap));
        }}
        onPointerOut={() => setAt(null)}
        onClick={(e) => !placing.drag && place(e)}
        onPointerUp={(e) => placing.drag && place(e)}
      />
      {at && (
        <group position={[at.x * GRID_MM.x, at.y * GRID_MM.y, height]}>
          <CubeEdges color={colors.accent} width={1.5} dashed />
          <Glyph kind={placing.kind} turns={0} color={colors.glyphs[placing.kind]} outline={colors.accent} />
        </group>
      )}
    </>
  );
}

/**
 * The measure tool: a click sets one end, the line follows the pointer, a
 * second click sets the other end; a third starts again. The length shows in
 * mm and in cubes. Whole cubes, or tenths with Shift.
 */
export function MeasurePlane({ height, snap, color }: { height: number; snap: boolean; color: string }) {
  const [ends, setEnds] = useState<{ a: Step; b: Step | null; done: boolean } | null>(null);
  const mm = (p: Step): Vec3 => [p.x * GRID_MM.x, p.y * GRID_MM.y, height];
  const a = ends && mm(ends.a);
  const b = ends?.b && mm(ends.b);
  const length = a && b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0;
  return (
    <>
      <Plane
        height={height}
        onPointerMove={(e) => {
          if (!ends || ends.done) return;
          setEnds({ ...ends, b: stepAt(e, snap) });
        }}
        onClick={(e) => {
          e.stopPropagation();
          const p = stepAt(e, snap);
          setEnds(!ends || ends.done ? { a: p, b: null, done: false } : { ...ends, b: p, done: true });
        }}
      />
      {a && b && length > 0 && (
        <>
          <Line points={[a, b]} color={color} lineWidth={1.5} dashed dashSize={6} gapSize={3} depthTest={false} renderOrder={6} />
          <Html position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, height]} center style={{ pointerEvents: 'none' }}>
            <Box
              sx={{
                transform: 'translateY(-14px)',
                px: 0.75,
                borderRadius: 1,
                typography: 'caption',
                fontWeight: 500,
                color,
                whiteSpace: 'nowrap',
                bgcolor: 'color-mix(in srgb, var(--mui-palette-background-paper) 85%, transparent)',
              }}
            >
              {`${Math.round(length)} mm · ${+(length / GRID_MM.x).toFixed(2)} cubes`}
            </Box>
          </Html>
        </>
      )}
      {a && (
        <mesh position={a} renderOrder={6}>
          <circleGeometry args={[3, 16]} />
          <meshBasicMaterial color={color} depthTest={false} />
        </mesh>
      )}
    </>
  );
}
