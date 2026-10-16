/**
 * Real rays along a beam, on axis: each ray traced exactly through every
 * spherical surface of a part with a prescription (Snell's law at the true
 * intersection, so spherical aberration shows), through ideal parts as a
 * perfect lens, and stopped where it passes outside a part's aperture. The
 * system is round and the object on its axis, so one fan in a meridian says
 * it all: the spot is that fan turned about the axis.
 *
 * Gives the spot at a plane, its RMS radius, the ray fan, the RMS through
 * focus, and the exit angles. The lab's stand-in for the optics engine:
 * on axis only, one wavelength, no diffraction. Pure.
 */
import { GLASS_ND, opticShape } from '../holders/optic';
import type { Beam } from './beam';

/** What enters: a collimated beam of a radius, or a point on the axis sending a cone of a numerical aperture. */
export type Pupil = { kind: 'collimated'; radiusMm: number } | { kind: 'point'; na: number };

/** One ray where it leaves the last part: position on the axis, height, and slope (dy/dz); `null` once stopped. */
export interface RayOut {
  /** Its place in the pupil, −1 … 1. */
  rho: number;
  z: number;
  y: number;
  slope: number;
}

export interface RealTrace {
  rays: (RayOut | null)[];
  /** The rays' paths, for drawing: (z, y) where each met something. */
  paths: { z: number; y: number }[][];
  /** Rays stopped by an aperture. */
  vignetted: number;
}

/** The pupil of a beam as it starts: a laser's beam, or the emission's cone at the objective's NA. */
export function pupilOf(beam: Beam, beamMm: number, naOverride?: number): Pupil {
  if (!beam.emission) return { kind: 'collimated', radiusMm: beamMm / 2 };
  const objective = beam.elements.find((e) => e.role === 'objective');
  const na = naOverride ?? objective?.symbol?.inputs?.find((i) => i.label === 'Numerical aperture')?.value ?? 0.1;
  return { kind: 'point', na };
}

type Ray = { z: number; y: number; dz: number; dy: number };

/** Refract a unit direction at a unit normal (any orientation), from index n1 to n2; `null` past the critical angle. */
function refract(dz: number, dy: number, nz: number, ny: number, n1: number, n2: number): [number, number] | null {
  let cos = dz * nz + dy * ny;
  if (cos < 0) {
    nz = -nz;
    ny = -ny;
    cos = -cos;
  }
  const mu = n1 / n2;
  const k = 1 - mu * mu * (1 - cos * cos);
  if (k < 0) return null;
  const a = Math.sqrt(k) - mu * cos;
  return [mu * dz + a * nz, mu * dy + a * ny];
}

/** One ray from the start through every part; `null` when stopped. */
function traceRay(beam: Beam, start: Ray, path: { z: number; y: number }[]): Ray | null {
  let r = { ...start };
  const move = (z: number) => {
    r = { ...r, y: r.y + ((z - r.z) * r.dy) / r.dz, z };
  };
  for (const e of beam.elements.slice(1)) {
    const shape = e.surfaces && e.role === 'lens' ? opticShape({ fragmentSurfaces: e.surfaces }) : null;
    if (shape && e.surfaces) {
      let n1 = 1;
      for (let i = 0; i < e.surfaces.length; i++) {
        const s = e.surfaces[i];
        const zv = e.atMm + shape.vertices[i];
        const R = shape.radii[i];
        if (R === null) move(zv);
        else {
          // The sphere through the vertex, centre at zv + R: the nearer crossing to the vertex.
          const cz = zv + R;
          const oz = r.z - cz;
          const b = oz * r.dz + r.y * r.dy;
          const c = oz * oz + r.y * r.y - R * R;
          const disc = b * b - c;
          if (disc < 0) return null;
          const t1 = -b - Math.sqrt(disc);
          const t2 = -b + Math.sqrt(disc);
          const zAt = (t: number) => r.z + t * r.dz;
          const t = Math.abs(zAt(t1) - zv) < Math.abs(zAt(t2) - zv) ? t1 : t2;
          r = { ...r, z: zAt(t), y: r.y + t * r.dy };
        }
        if (Math.abs(r.y) > (s.semi_aperture ?? shape.semiMm) + 1e-9) return null;
        path.push({ z: r.z, y: r.y });
        const n2 = s.material_post ? (GLASS_ND[s.material_post] ?? 1.5) : 1;
        const [nz, ny] = R === null ? [1, 0] : [(r.z - (zv + R)) / R, r.y / R];
        const d = refract(r.dz, r.dy, nz, ny, n1, n2);
        if (!d) return null;
        r = { ...r, dz: d[0], dy: d[1] };
        n1 = n2;
      }
      continue;
    }
    move(e.atMm);
    if (e.apertureMm && Math.abs(r.y) > e.apertureMm / 2 + 1e-9) return null;
    path.push({ z: r.z, y: r.y });
    if (e.focalMm) {
      // A perfect lens: every ray of a slope meets the others in its focal plane.
      const slope = r.dy / r.dz - r.y / e.focalMm;
      const n = Math.hypot(1, slope);
      r = { ...r, dz: 1 / n, dy: slope / n };
    }
  }
  return r;
}

/** `n` rays across the pupil, −1 … 1 (a fan in one meridian). */
export function realTrace(beam: Beam, pupil: Pupil, n = 41): RealTrace {
  const z0 = beam.elements[0].atMm;
  const rays: (RayOut | null)[] = [];
  const paths: { z: number; y: number }[][] = [];
  for (let k = 0; k < n; k++) {
    const rho = n === 1 ? 0 : -1 + (2 * k) / (n - 1);
    const start: Ray =
      pupil.kind === 'collimated'
        ? { z: z0, y: rho * pupil.radiusMm, dz: 1, dy: 0 }
        : (() => {
            const s = rho * pupil.na;
            return { z: z0, y: 0, dz: Math.sqrt(1 - s * s), dy: s };
          })();
    const path = [{ z: start.z, y: start.y }];
    const out = traceRay(beam, start, path);
    paths.push(path);
    rays.push(out && { rho, z: out.z, y: out.y, slope: out.dy / out.dz });
  }
  return { rays, paths, vignetted: rays.filter((r) => r === null).length };
}

/** Where each ray crosses the plane at `z`, by its place in the pupil. */
export const heightsAt = (t: RealTrace, z: number) => t.rays.flatMap((r) => (r ? [{ rho: r.rho, y: r.y + r.slope * (z - r.z) }] : []));

/**
 * The RMS spot radius at a plane, mm: the fan turned about the axis, each
 * ray weighted by the ring of the pupil it stands for (|ρ|).
 */
export function rmsAt(t: RealTrace, z: number): number {
  const h = heightsAt(t, z);
  const w = h.reduce((s, p) => s + Math.abs(p.rho), 0);
  if (!w) return 0;
  return Math.sqrt(h.reduce((s, p) => s + Math.abs(p.rho) * p.y * p.y, 0) / w);
}

/** The spot at a plane as points: each ray of the fan turned to `arms` angles about the axis. */
export function spotAt(t: RealTrace, z: number, arms = 24): { x: number; y: number }[] {
  const h = heightsAt(t, z).filter((p) => p.rho >= 0);
  return h.flatMap((p) => Array.from({ length: p.rho === 0 ? 1 : arms }, (_, a) => ({ x: p.y * Math.cos((2 * Math.PI * a) / arms), y: p.y * Math.sin((2 * Math.PI * a) / arms) })));
}

/** The RMS spot about a plane: against a shift of it, mm. */
export const rmsThroughFocus = (t: RealTrace, z: number, reach: number, steps = 80) =>
  Array.from({ length: steps + 1 }, (_, k) => {
    const dz = -reach + (2 * reach * k) / steps;
    return { dz, rms: rmsAt(t, z + dz) };
  });

/** Where the RMS spot is smallest, near `z` (golden-section within ±reach). */
export function bestFocus(t: RealTrace, z: number, reach: number): number {
  let a = z - reach;
  let b = z + reach;
  const g = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 60; i++) {
    const c = b - g * (b - a);
    const d = a + g * (b - a);
    if (rmsAt(t, c) < rmsAt(t, d)) b = d;
    else a = c;
  }
  return (a + b) / 2;
}

/** The RMS of the rays' exit angles, rad: 0 for a perfectly collimated beam. */
export function rmsAngle(t: RealTrace): number {
  const live = t.rays.filter((r): r is RayOut => r !== null);
  const w = live.reduce((s, r) => s + Math.abs(r.rho), 0);
  if (!w) return 0;
  return Math.sqrt(live.reduce((s, r) => s + Math.abs(r.rho) * Math.atan(r.slope) ** 2, 0) / w);
}
