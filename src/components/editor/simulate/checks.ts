/**
 * The Simulate pane's summary: for each place light is read (a detector, the
 * sample, where a path runs out), the few numbers that say whether the design
 * works there, each with a tone and the analysis that shows it in full.
 *
 * - Focus: the RMS spot at the plane, against the best focus near it. Where
 *   the light runs out, Collimation: how far the rays leave parallel.
 * - Clipping: the fullest aperture on the path, and rays stopped.
 * - Transmission: what the path passes at its wavelength, from the coatings
 *   it knows.
 *
 * The numbers come from the kernel stand-ins (on axis, one wavelength); in
 * the app they come from oc-wasm. The tones are the UI's reading of them.
 */
import { spectrum } from '../../../standins/kernel/simulate/analysis';
import type { Beam, Target } from '../../../standins/kernel/simulate/beam';
import { planeZ, type Plane } from '../../../standins/kernel/simulate/optimize';
import { results, startRay, trace } from '../../../standins/kernel/simulate/paraxial';
import { bestFocus, realTrace, rmsAngle, rmsAt, type Pupil, type RealTrace } from '../../../standins/kernel/simulate/realtrace';

export type AnalysisId = 'spot' | 'fan' | 'focus' | 'fill' | 'transmission';

export const ANALYSES: { id: AnalysisId; label: string; plane: boolean; rays: boolean }[] = [
  { id: 'spot', label: 'Spot', plane: true, rays: true },
  { id: 'fan', label: 'Ray fan', plane: true, rays: true },
  { id: 'focus', label: 'Through focus', plane: true, rays: true },
  { id: 'fill', label: 'Aperture fill', plane: false, rays: false },
  { id: 'transmission', label: 'Transmission', plane: false, rays: false },
];

/** ok: works; warn: worth a look; bad: does not work as drawn; none: nothing to say (not known). */
export type Tone = 'ok' | 'warn' | 'bad' | 'none';

export interface Check {
  id: 'focus' | 'collimation' | 'clipping' | 'transmission';
  label: string;
  value: string;
  note: string;
  tone: Tone;
  /** The analysis that shows it in full. */
  analysis: AnalysisId;
}

/** A length as it reads: µm when small, mm from a millimetre. */
export const length = (mm: number) => (Math.abs(mm) >= 1 ? `${mm.toFixed(2)} mm` : `${(mm * 1000).toFixed(Math.abs(mm * 1000) >= 100 ? 0 : 1)} µm`);
const signed = (mm: number) => `${mm >= 0 ? '+' : '−'}${Math.abs(mm).toFixed(Math.abs(mm) >= 10 ? 0 : 1)} mm`;

/** In focus: the spot at the plane no more than half again the best one, or within 5 µm of it. */
const IN_FOCUS = (atPlane: number, best: number) => atPlane <= Math.max(best * 1.5, best + 0.005);
/** Nearly full: past this the edge of the beam is close to a part's edge. */
const NEARLY_FULL = 0.85;

/** How far either way to look for the best focus: to the farthest place a ray crosses the axis, and a little more. Parallel rays have no focus: a token reach. */
export function focusReach(t: RealTrace, z: number): number {
  const crossings = t.rays.flatMap((r) => (r && r.rho !== 0 && Math.abs(r.slope) > 1e-9 ? [Math.abs(r.z - r.y / r.slope - z)] : []));
  return Math.min(10_000, Math.max(5, ...crossings) * 1.1 + 1);
}

export function focusCheck(target: Target, t: RealTrace, plane: Plane): Check {
  const beam = target.beam;
  if (target.part === 'end') {
    const mrad = rmsAngle(t) * 1000;
    return {
      id: 'collimation',
      label: 'Collimation',
      value: `${mrad < 0.1 ? mrad.toFixed(3) : mrad.toFixed(2)} mrad`,
      note: mrad < 0.5 ? 'Leaves parallel' : 'Leaves spreading or converging',
      tone: mrad < 0.5 ? 'ok' : mrad < 5 ? 'warn' : 'bad',
      analysis: 'fan',
    };
  }
  const z = planeZ(beam, plane);
  const best = bestFocus(t, z, focusReach(t, z));
  const atPlane = rmsAt(t, z);
  const atBest = rmsAt(t, best);
  const dz = best - z;
  const ok = IN_FOCUS(atPlane, atBest);
  return {
    id: 'focus',
    label: 'Focus',
    value: length(atPlane),
    note: ok ? 'In focus' : `Best focus ${signed(dz)} from here, ${length(atBest)} RMS`,
    tone: ok ? 'ok' : Math.abs(dz) < 5 ? 'warn' : 'bad',
    analysis: ok ? 'spot' : 'focus',
  };
}

export function clippingCheck(beam: Beam, t: RealTrace, beamMm: number): Check {
  const r = results(beam, trace(beam, startRay(beam, beamMm)), beamMm);
  // The emission's cone is the objective's own NA: it fills the objective by definition, so the objective is not read for clipping.
  const sets = (role: string) => beam.emission && role === 'objective';
  const fills = beam.elements.flatMap((e, i) => (e.apertureMm && !sets(e.role) ? [{ label: e.label, fill: r.elements[i].beamMm / e.apertureMm }] : []));
  const fullest = fills.reduce<{ label: string; fill: number } | null>((a, b) => (!a || b.fill > a.fill ? b : a), null);
  const stopped = t.vignetted;
  const rays = t.rays.length;
  if (!fullest) return { id: 'clipping', label: 'Clipping', value: '—', note: 'No part states an aperture', tone: 'none', analysis: 'fill' };
  const clips = fullest.fill > 1 || stopped > 0;
  return {
    id: 'clipping',
    label: 'Clipping',
    value: `${Math.round(fullest.fill * 100)}%`,
    note: stopped ? `${stopped} of ${rays} rays stopped · fullest at ${fullest.label}` : `Fullest at ${fullest.label}`,
    tone: clips ? 'bad' : fullest.fill > NEARLY_FULL ? 'warn' : 'ok',
    analysis: 'fill',
  };
}

export function transmissionCheck(beam: Beam, nm: number | null): Check {
  const curve = spectrum(beam);
  const base = { id: 'transmission' as const, label: 'Transmission', analysis: 'transmission' as const };
  if (!curve) return { ...base, value: '—', note: 'No coatings known on this path', tone: 'none' };
  if (!nm) return { ...base, value: '—', note: 'The source states no wavelength', tone: 'none' };
  const at = curve.reduce((a, b) => (Math.abs(b.nm - nm) < Math.abs(a.nm - nm) ? b : a));
  return { ...base, value: `${(at.t * 100).toFixed(at.t >= 0.995 ? 0 : 1)}%`, note: `At ${nm} nm`, tone: at.t >= 0.8 ? 'ok' : at.t >= 0.5 ? 'warn' : 'bad' };
}

/** The three checks at a target, for its beam as it starts (`pupil`) and the plane it is read at. */
export function checksAt(target: Target, pupil: Pupil, beamMm: number, plane: Plane, nm: number | null, rays = 41): Check[] {
  const t = realTrace(target.beam, pupil, rays);
  return [focusCheck(target, t, plane), clippingCheck(target.beam, t, beamMm), transmissionCheck(target.beam, nm)];
}

/** The worst tone of some checks: what a target's row shows at a glance. */
export function worst(checks: Check[]): Tone {
  const order: Tone[] = ['bad', 'warn', 'ok', 'none'];
  return order.find((tone) => checks.some((c) => c.tone === tone)) ?? 'none';
}

/** What the beam assumed where the design does not say, by part: shown under the results, so they can be trusted for what they are. */
export const assumptionsOf = (beam: Beam) => beam.elements.flatMap((e) => (e.assumed.length ? [{ id: e.id, label: e.label, assumed: e.assumed }] : []));
