/**
 * STAND-IN for the kernel: in the app paraxial numbers come from Optiland
 * (the service) or oc-wasm's surface table (`surfaceTableJSON`).
 *
 * A first-order (paraxial) trace along a beam: the marginal ray, y its height
 * and u its angle, through every part in order. Ideal parts are thin lenses;
 * a part with a prescription is traced surface by surface (n₂u₂ = n₁u₁ −
 * y·c·(n₂ − n₁)), so a real lens's thickness and bending count. What it
 * gives: the beam's size at each part (and whether the part clips it),
 * where it comes to a focus, the magnification or expansion, and, from the
 * coatings, how much light gets through. Real rays (aberrations) are
 * realtrace.ts; the optimizer is optimize.ts.
 *
 * The lab's stand-in for the optics engine, and labelled so: on axis only,
 * no aberrations, no diffraction. Pure.
 */
import { GLASS_ND, opticShape } from '../../../components/editor/holders/optic';
import { surfaceInfo, throughput } from '../coatings';
import type { Beam } from './beam';

export interface RayState {
  y: number;
  u: number;
}

export interface TraceSample {
  z: number;
  y: number;
}

export interface Trace {
  samples: TraceSample[];
  /** The ray where it leaves each part (at `z`: a thick lens's last vertex), and its largest height inside it. */
  at: Record<string, RayState & { z: number; peak: number }>;
  /** Where the path ends. */
  end: RayState & { z: number };
}

/** The ray the beam starts with: a laser's collimated beam of `beamMm`, or the sample's cone at the objective's NA. */
export function startRay(beam: Beam, beamMm: number): RayState {
  if (!beam.fromSample) return { y: beamMm / 2, u: 0 };
  const objective = beam.elements.find((e) => e.role === 'objective');
  const na = objective?.symbol?.inputs?.find((i) => i.label === 'Numerical aperture')?.value ?? 0.1;
  return { y: 0, u: na };
}

const curvature = (r: number | null) => (r ? 1 / r : 0);

/** The marginal ray through the beam. */
export function trace(beam: Beam, start: RayState): Trace {
  const [first, ...rest] = beam.elements;
  let z = first.atMm;
  let { y, u } = start;
  const samples: TraceSample[] = [{ z, y }];
  const at: Trace['at'] = { [first.id]: { y, u, z, peak: Math.abs(y) } };
  const go = (to: number) => {
    y += u * (to - z);
    z = to;
  };
  for (const e of rest) {
    go(e.atMm);
    let peak = Math.abs(y);
    const shape = e.surfaces && e.role === 'lens' ? opticShape({ fragmentSurfaces: e.surfaces }) : null;
    if (shape && e.surfaces) {
      // Surface by surface, from the first vertex to the last.
      let n1 = 1;
      go(e.atMm + shape.vertices[0]);
      e.surfaces.forEach((s, i) => {
        if (i > 0) go(e.atMm + shape.vertices[i]);
        const n2 = s.material_post ? (GLASS_ND[s.material_post] ?? 1.5) : 1;
        u = (n1 * u - y * curvature(shape.radii[i]) * (n2 - n1)) / n2;
        n1 = n2;
        peak = Math.max(peak, Math.abs(y));
        samples.push({ z, y });
      });
    } else {
      if (e.focalMm) u -= y / e.focalMm;
      samples.push({ z, y });
    }
    at[e.id] = { y, u, z, peak };
  }
  if (beam.endMm > z) go(beam.endMm);
  samples.push({ z, y });
  return { samples, at, end: { y, u, z } };
}

/** Where the ray crosses the axis: the foci (or images) along the beam, after its start. */
export function foci(t: Trace): number[] {
  const out: number[] = [];
  for (let i = 1; i < t.samples.length; i++) {
    const a = t.samples[i - 1];
    const b = t.samples[i];
    if (b.z <= a.z) continue;
    if ((a.y > 0 && b.y < 0) || (a.y < 0 && b.y > 0)) out.push(a.z + ((b.z - a.z) * a.y) / (a.y - b.y));
    else if (b.y === 0 && a.y !== 0) out.push(b.z);
  }
  return out;
}

/** Collimated: the ray leaves at less than this angle (0.1 mrad). */
const COLLIMATED = 1e-4;

export interface ElementResult {
  id: string;
  /** The beam's Ø at the part, mm. */
  beamMm: number;
  /** It is wider than the part's clear aperture. */
  clipped: boolean;
  /** What it passes on at the beam's wavelength (surfaces only), or `null` when its coatings are not known. */
  passes: number | null;
}

export interface BeamResult {
  elements: ElementResult[];
  foci: number[];
  /** The light after the last part with power: collimated, or coming to a focus at `focusMm` along the beam. */
  out: { collimated: boolean; focusMm: number | null; beamMm: number };
  /** The image or focus against the detector, mm along the beam: + behind it. `null` with no detector or no focus. */
  focusOffsetMm: number | null;
  /** The sample's light: the image's size over the object's (paraxial, from the ray angles). */
  magnification: number | null;
  /** A laser's beam: Ø out over Ø in, when it leaves collimated. */
  expansion: number | null;
  /** What reaches the end, of what started: the parts whose coatings are known, the rest counted lossless. */
  budget: { fraction: number; known: number; unknown: number; powerMw: number | null };
}

export function results(beam: Beam, t: Trace, startMm: number): BeamResult {
  const elements = beam.elements.map((e): ElementResult => {
    const beamMm = 2 * (t.at[e.id]?.peak ?? 0);
    const passes = e.record && beam.wavelengthNm ? throughput(surfaceInfo(e.record), beam.wavelengthNm) : null;
    return { id: e.id, beamMm, clipped: Boolean(e.apertureMm && beamMm > e.apertureMm + 1e-6), passes };
  });
  const powered = beam.elements.filter((e) => e.focalMm || e.surfaces);
  const last = powered[powered.length - 1];
  const after = last ? t.at[last.id] : t.at[beam.elements[0].id];
  const collimated = Math.abs(after.u) < COLLIMATED;
  const focusMm = collimated ? null : after.z - after.y / after.u;
  const detector = beam.elements.find((e) => e.role === 'detector');
  const start = startRay(beam, startMm);
  const known = elements.filter((e) => e.passes !== null);
  const fraction = known.reduce((f, e) => f * e.passes!, 1);
  return {
    elements,
    foci: foci(t),
    out: { collimated, focusMm, beamMm: 2 * Math.abs(after.y) },
    focusOffsetMm: detector && focusMm !== null ? focusMm - detector.atMm : null,
    magnification: beam.fromSample && !collimated && after.u !== 0 ? start.u / after.u : null,
    expansion: !beam.fromSample && collimated && start.y ? Math.abs(after.y / start.y) : null,
    budget: {
      fraction,
      known: known.length,
      unknown: beam.elements.filter((e) => e.role !== 'source' && e.role !== 'sample' && e.role !== 'detector').length - known.length,
      powerMw: beam.powerMw === null ? null : beam.powerMw * fraction,
    },
  };
}
