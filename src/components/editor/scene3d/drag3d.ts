/**
 * The geometry of dragging parts in 3D, in the document frame (mm, z up).
 * Pure; tested in drag3d.test.ts. The gesture itself is in useMoveDrag.ts.
 *
 * Two ways to drag: across the layer (the part slides on the horizontal
 * plane at its height), or along one axis (by an arrow on the selection).
 * Both end as a move in grid steps: cubes in x and y (tenths when free),
 * whole layers in z.
 */
import { GRID_MM, type MoveAxis, type Vec3 } from './layout3d';

/** A pointer ray: from the camera, through the pointer. */
export interface Ray3 {
  origin: Vec3;
  dir: Vec3;
}

/** three.js frame (y up) back to the document's (z up): the inverse of `toThree`. */
export const fromThree = ([x, y, z]: Vec3): Vec3 => [x, -z, y];

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const minus = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** Where a ray meets the horizontal plane at height `z`; null when it never does (parallel to it, or pointing away). */
export function hitPlane(ray: Ray3, z: number): Vec3 | null {
  const dz = ray.dir[2];
  if (Math.abs(dz) < 1e-9) return null;
  const t = (z - ray.origin[2]) / dz;
  if (t < 0) return null;
  return [ray.origin[0] + t * ray.dir[0], ray.origin[1] + t * ray.dir[1], z];
}

const UNIT: Record<MoveAxis, Vec3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

/**
 * How far along an axis (through `through`) the point nearest to the ray is,
 * in mm; null when the ray runs parallel to the axis.
 */
export function alongAxis(ray: Ray3, through: Vec3, axis: MoveAxis): number | null {
  // The closest points of two lines: through + t·u (the axis) and origin + s·v (the ray).
  const u = UNIT[axis];
  const v = ray.dir;
  const w = minus(through, ray.origin);
  const b = dot(u, v);
  const c = dot(v, v);
  const denom = c - b * b; // |u| = 1
  if (Math.abs(denom) < 1e-9) return null;
  return (b * dot(v, w) - c * dot(u, w)) / denom;
}

const tenth = (v: number) => Math.round(v * 10) / 10;

/**
 * The move, in grid steps, for a part at `anchor` (grid units) whose drag
 * went `mm` along `axis`: it lands on whole cubes (on a tenth of one when
 * `free`); along z, on whole layers, always.
 */
export function stepAlong(axis: MoveAxis, anchor: number, mm: number, free: boolean): number {
  if (axis === 'z') return Math.round(mm / GRID_MM.z) || 0; // `|| 0`: no −0
  const to = anchor + mm / GRID_MM[axis];
  return tenth((free ? tenth(to) : Math.round(to)) - anchor) || 0;
}

/** The move across a layer, in grid steps, when the pointer went from `from` to `to` on its plane. */
export function stepAcross(anchor: { x: number; y: number }, from: Vec3, to: Vec3, free: boolean): { x: number; y: number } {
  return { x: stepAlong('x', anchor.x, to[0] - from[0], free), y: stepAlong('y', anchor.y, to[1] - from[1], free) };
}
