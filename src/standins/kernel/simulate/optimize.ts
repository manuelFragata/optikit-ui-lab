/**
 * STAND-IN for the optimizer: in the app it is Optiland's, on the service
 * (WP-93, WP-151), or oc-wasm's singlet fit (`fitSingletFace`).
 *
 * The optimizer: an objective (what to make small, or what to hit), the
 * variables a beam's parts offer (what each part lets change: where a free
 * lens sits, a designed lens's radii and thicknesses, an ideal lens's focal
 * length, the lens's place in a frozen cartridge), each between bounds, and
 * a run that moves them within their bounds. Then the variables written back
 * into the design. Pure.
 *
 * Optiland does this in the product; this is the lab's stand-in, a bounded
 * coordinate search, with merits from the real-ray and paraxial traces.
 */
import { CARTRIDGE } from '../../service/cartridge';
import { designedValues, focalLength } from '../../../components/editor/holders/designs';
import type { FragmentSurface } from '../../../components/editor/holders/optic';
import type { Schematic, SchematicSymbol } from '../../../components/editor/model';
import type { Beam, BeamElement } from './beam';
import { results, startRay, trace } from './paraxial';
import { realTrace, rmsAngle, rmsAt, heightsAt, type Pupil } from './realtrace';

/* -------------------------------------------------------------------- */
/* Objectives                                                            */
/* -------------------------------------------------------------------- */

/** A plane along the beam: at a part (a detector, the sample, any part) or where the path ends, shifted by `offsetMm`. */
export interface Plane {
  part: string | 'end';
  offsetMm: number;
}

export type Objective =
  | { kind: 'rms-spot'; plane: Plane }
  | { kind: 'collimation' }
  | { kind: 'beam-diameter'; plane: Plane; targetMm: number }
  | { kind: 'magnification'; target: number }
  | { kind: 'focal-length'; part: string; targetMm: number };

export const OBJECTIVES: { kind: Objective['kind']; label: string; unit: string }[] = [
  { kind: 'rms-spot', label: 'RMS spot size', unit: 'µm' },
  { kind: 'collimation', label: 'Collimation (RMS angle)', unit: 'mrad' },
  { kind: 'beam-diameter', label: 'Beam diameter', unit: 'mm' },
  { kind: 'magnification', label: 'Magnification', unit: '×' },
  { kind: 'focal-length', label: 'Focal length of a part', unit: 'mm' },
];

/** Where a plane is, mm along the beam. */
export function planeZ(beam: Beam, plane: Plane): number {
  const at = plane.part === 'end' ? beam.endMm : (beam.elements.find((e) => e.id === plane.part)?.atMm ?? beam.endMm);
  return at + plane.offsetMm;
}

/** Rays per fan for the optimizer's merit, and the pane's spots: the same, so the numbers agree. */
export const MERIT_RAYS = 41;

/** The objective's value, in its unit (`OBJECTIVES`), as the panel shows it. */
export function measure(beam: Beam, o: Objective, pupil: Pupil): number {
  switch (o.kind) {
    case 'rms-spot':
      return rmsAt(realTrace(beam, pupil, MERIT_RAYS), planeZ(beam, o.plane)) * 1000;
    case 'collimation':
      return rmsAngle(realTrace(beam, pupil, MERIT_RAYS)) * 1000;
    case 'beam-diameter': {
      const h = heightsAt(realTrace(beam, pupil, MERIT_RAYS), planeZ(beam, o.plane));
      return 2 * Math.max(0, ...h.map((p) => Math.abs(p.y)));
    }
    case 'magnification': {
      const r = results(beam, trace(beam, startRay(beam, pupil.kind === 'collimated' ? pupil.radiusMm * 2 : 2)), 2);
      return Math.abs(r.magnification ?? r.expansion ?? 0);
    }
    case 'focal-length': {
      const e = beam.elements.find((x) => x.id === o.part);
      return (e?.surfaces ? focalLength(e.surfaces) : e?.focalMm) ?? 0;
    }
  }
}

/** How far from the objective: what is minimized. Rays lost to an aperture count against it. */
export function merit(beam: Beam, o: Objective, pupil: Pupil): number {
  const value = measure(beam, o, pupil);
  const lost = o.kind === 'rms-spot' || o.kind === 'collimation' || o.kind === 'beam-diameter' ? realTrace(beam, pupil, MERIT_RAYS).vignetted / MERIT_RAYS : 0;
  const off =
    o.kind === 'rms-spot' || o.kind === 'collimation'
      ? value
      : o.kind === 'beam-diameter'
        ? Math.abs(value - o.targetMm)
        : o.kind === 'magnification'
          ? Math.abs(value - o.target)
          : Math.abs(value - o.targetMm);
  return off + lost * 1000;
}

/* -------------------------------------------------------------------- */
/* Variables                                                             */
/* -------------------------------------------------------------------- */

export type VariableKind = 'position' | 'holder' | 'focal' | 'radius' | 'thickness';

export interface Variable {
  id: string;
  part: string;
  kind: VariableKind;
  /** The surface a radius or thickness belongs to. */
  surface?: number;
  /** Short, as the list shows it: "Position", "R1", "CT1", "f", "In holder". */
  label: string;
  value: number;
  /** Default bounds, before the user sets their own. */
  min: number;
  max: number;
}

export interface PartVariables {
  part: BeamElement;
  variables: Variable[];
  /** Why the part offers none. */
  fixed?: string;
}

const designed = (e: BeamElement) => Boolean(e.record?.id.startsWith('designed.'));
const finite = (s: FragmentSurface) => (typeof s.geometry?.radius === 'number' ? s.geometry.radius : null);
const range = (v: number, lo: number, hi: number): [number, number] => {
  const [a, b] = [v * lo, v * hi];
  return [Math.min(a, b), Math.max(a, b)];
};

/** What each optic on the beam lets change, and the bounds to start from. */
export function variablesOf(beam: Beam): PartVariables[] {
  return beam.elements.flatMap((e, i): PartVariables[] => {
    if (!e.symbol || !['lens', 'objective', 'mirror'].includes(e.role)) return [];
    const vars: Variable[] = [];
    const v = (kind: VariableKind, label: string, value: number, [min, max]: [number, number], surface?: number) =>
      vars.push({ id: `${e.id}:${kind}${surface ?? ''}`, part: e.id, kind, label, value, min, max, surface });
    const unmounted = e.state !== 'in-cube';
    if (unmounted && !e.fixed) {
      const prev = beam.elements[i - 1];
      const next = beam.elements[i + 1];
      // Clear of its neighbours: a part in a cube takes half a cube each side.
      const room = (n: BeamElement) => (n.state === 'in-cube' ? 27 : 10);
      v('position', 'Position', e.atMm, [prev ? prev.atMm + room(prev) : e.atMm - 100, next ? next.atMm - room(next) : e.atMm + 100]);
    }
    const cartridge = e.symbol.placement.state === 'in-cube' && e.symbol.placement.holder?.generator === 'lens_cartridge_v4';
    if (cartridge) v('holder', 'In holder', e.holderOffsetMm, [-CARTRIDGE.jointLimitMm, CARTRIDGE.jointLimitMm]);
    if (e.role === 'lens' && !e.surfaces && e.focalMm) v('focal', 'f', e.focalMm, range(e.focalMm, 0.5, 2));
    if (designed(e) && e.record) {
      const s = e.record.fragmentSurfaces;
      if (e.role === 'mirror') {
        const r = finite(s[0]);
        if (r !== null) v('radius', 'R', r, range(r, 0.5, 2), 0);
      } else {
        s.forEach((surface, k) => {
          const r = finite(surface);
          if (r !== null) v('radius', `R${k + 1}`, r, range(r, 0.5, 2), k);
        });
        s.slice(0, -1).forEach((surface, k) => surface.thickness !== undefined && v('thickness', `CT${k + 1}`, surface.thickness, [Math.max(0.5, surface.thickness * 0.5), surface.thickness * 2], k));
      }
    }
    if (vars.length) return [{ part: e, variables: vars }];
    const fixed =
      e.record && !designed(e) ? 'Catalogue glass' : e.fixed && unmounted ? 'Locked in View' : e.state === 'in-cube' ? 'In a cube: move it in View' : e.role === 'mirror' ? 'Flat' : 'Nothing to vary';
    return [{ part: e, variables: [], fixed }];
  });
}

/** The beam with the variables at these values. */
export function withValues(beam: Beam, vars: Variable[], values: Readonly<Record<string, number>>): Beam {
  return {
    ...beam,
    elements: beam.elements.map((e) => {
      const mine = vars.filter((x) => x.part === e.id && values[x.id] !== undefined);
      if (!mine.length) return e;
      let out: BeamElement = { ...e, surfaces: e.surfaces?.map((s) => ({ ...s, geometry: s.geometry && { ...s.geometry } })) };
      for (const x of mine) {
        const val = values[x.id];
        if (x.kind === 'position') out.atMm = val;
        else if (x.kind === 'holder') out = { ...out, atMm: out.atMm + val - e.holderOffsetMm, holderOffsetMm: val };
        else if (x.kind === 'focal') out.focalMm = val;
        else if (x.kind === 'radius' && e.role === 'mirror') out.focalMm = -val / 2;
        else if (x.kind === 'radius' && out.surfaces) out.surfaces[x.surface!] = { ...out.surfaces[x.surface!], geometry: { radius: val } };
        else if (x.kind === 'thickness' && out.surfaces) out.surfaces[x.surface!] = { ...out.surfaces[x.surface!], thickness: val };
      }
      if (out.surfaces && e.role === 'lens') out.focalMm = focalLength(out.surfaces);
      return out;
    }),
  };
}

/** The design with the variables at these values: parts moved, prescriptions and inputs changed, holders given their new offsets. */
export function toDesign(design: Schematic, beam: Beam, vars: Variable[], values: Readonly<Record<string, number>>): Schematic {
  const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
  return {
    ...design,
    symbols: design.symbols.map((s): SchematicSymbol => {
      const mine = vars.filter((x) => x.part === s.id && values[x.id] !== undefined);
      const e = beam.elements.find((x) => x.id === s.id);
      if (!mine.length || !e) return s;
      let out: SchematicSymbol = { ...s };
      const prescription = s.prescription?.map((p) => ({ ...p }));
      for (const x of mine) {
        const val = values[x.id];
        if (x.kind === 'position' && e.axis) {
          const by = (val - e.atMm) / design.unitMm;
          out = { ...out, x: round(out.x + e.axis.x * by), y: round(out.y + e.axis.y * by) };
        } else if (x.kind === 'holder' && out.placement.state === 'in-cube' && out.placement.holder) {
          const params = out.placement.holder.params as { part_position_mm?: { x: number; y: number; z: number } };
          const position = { x: 0, y: 0, ...params.part_position_mm, z: round(val, 1) };
          out = { ...out, placement: { ...out.placement, holder: { ...out.placement.holder, params: { ...params, part_position_mm: position } } } };
        } else if (x.kind === 'focal') {
          out = { ...out, inputs: out.inputs?.map((i) => (i.label === 'Focal length' ? { ...i, value: round(val, 1) } : i)) };
        } else if (prescription && (x.kind === 'radius' || x.kind === 'thickness')) {
          prescription[x.surface!] = x.kind === 'radius' ? { ...prescription[x.surface!], geometry: { radius: round(val, 2) } } : { ...prescription[x.surface!], thickness: round(val, 2) };
        }
      }
      if (prescription && s.prescription) {
        const values2 = designedValues(prescription);
        out = { ...out, prescription, inputs: out.inputs?.map((i) => (i.label in values2 ? { ...i, value: values2[i.label] } : i)) };
      }
      return out;
    }),
  };
}

/* -------------------------------------------------------------------- */
/* The run                                                               */
/* -------------------------------------------------------------------- */

export interface Run {
  values: Record<string, number>;
  /** The objective's value before and after, in its unit. */
  before: number;
  after: number;
  /** The merit after each step. */
  history: number[];
  steps: number;
}

/**
 * Bounded coordinate search: one variable at a time, a coarse scan within
 * its bounds and a golden-section refine about the best, round after round
 * until the merit stops falling.
 */
export function run(beam: Beam, vars: Variable[], o: Objective, pupil: Pupil, rounds = 12): Run {
  const values: Record<string, number> = Object.fromEntries(vars.map((x) => [x.id, Math.min(x.max, Math.max(x.min, x.value))]));
  const f = (v: Record<string, number>) => merit(withValues(beam, vars, v), o, pupil);
  let best = f(values);
  const history = [best];
  let steps = 0;
  for (let round = 0; round < rounds && vars.length; round++) {
    const was = best;
    for (const x of vars) {
      const at = (val: number) => f({ ...values, [x.id]: val });
      let x0 = values[x.id];
      let c0 = best;
      for (let k = 0; k <= 24; k++) {
        const val = x.min + ((x.max - x.min) * k) / 24;
        const c = at(val);
        if (c < c0) [x0, c0] = [val, c];
      }
      const step = (x.max - x.min) / 24;
      let a = Math.max(x.min, x0 - step);
      let b = Math.min(x.max, x0 + step);
      const g = (Math.sqrt(5) - 1) / 2;
      for (let k = 0; k < 30; k++) {
        const c = b - g * (b - a);
        const d = a + g * (b - a);
        if (at(c) < at(d)) b = d;
        else a = c;
      }
      const mid = (a + b) / 2;
      const cm = at(mid);
      if (cm < c0) [x0, c0] = [mid, cm];
      values[x.id] = x0;
      best = c0;
      history.push(best);
      steps++;
    }
    if (was - best < 1e-9 * Math.max(1, was)) break;
  }
  return { values, before: measure(beam, o, pupil), after: measure(withValues(beam, vars, values), o, pupil), history, steps };
}
