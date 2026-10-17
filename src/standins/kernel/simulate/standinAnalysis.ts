/**
 * STAND-IN for the analysis port (src/ports/analysis.ts): the lab's kernel
 * answers Simulate and Optimize. Each answer is worked out from the design
 * and its light, here as the beam table (./beam.ts), paraxial and real rays,
 * and the lab's optimizer; in the app oc-wasm reads the same results from its
 * detector hits, and runs the optimizer's loop.
 *
 * Reading is immediate, in the page. A run goes a step at a time in a worker
 * (./optimizeWorker.ts), as oc-wasm's would, so the page stays free while it
 * goes; where there is no worker (tests), in the page between tasks.
 */
import { recordOf } from '../../../components/editor/holders/designs';
import type { SchematicSymbol } from '../../../components/editor/model';
import type { Analysis, Detail, Envelope, Objective, OptimizeAsk, OptimizeJob, OptimizeRun, OptimizeView, Place, PlaceNumbers, Plane, SimulateAsk, Variable } from '../../../ports/analysis';
import type { Library } from '../../../ports/library';
import type { Light } from '../../../ports/light';
import type { Schematic } from '../../../components/editor/model';
import { spectrum } from './analysis';
import { beamOf, DEFAULT_BEAM_MM, startDiameter, targetsOf, type Beam, type Target } from './beam';
import { MERIT_RAYS, measure, OBJECTIVES, planeZ, search, toDesign, variablesOf, withValues } from './optimize';
import { results, startRay, trace } from './paraxial';
import { airyRadius, bestFocus, heightsAt, pupilOf, realTrace, rmsAngle, rmsAt, rmsThroughFocus, spotAt, type Pupil, type RealTrace } from './realtrace';

/** The wavelength taken when the source states none: the middle of the visible. */
export const DEFAULT_NM = 550;

/** How far either way to look for the best focus: to the farthest place a ray crosses the axis, and a little more. Parallel rays have no focus: a token reach. */
export function focusReach(t: RealTrace, z: number): number {
  const crossings = t.rays.flatMap((r) => (r && r.rho !== 0 && Math.abs(r.slope) > 1e-9 ? [Math.abs(r.z - r.y / r.slope - z)] : []));
  return Math.min(10_000, Math.max(5, ...crossings) * 1.1 + 1);
}

/** The parts on a path that take light (not the source, the sample, a detector or an open stop). */
const lossy = (beam: Beam) => beam.elements.filter((e) => e.role === 'lens' || e.role === 'objective' || e.role === 'mirror' || e.role === 'plate');

/** The parts whose focal length can be a target. */
const lensesOf = (beam: Beam) => beam.elements.filter((e) => e.role === 'lens' && (e.surfaces || e.focalMm));

/** The numbers at a place, for a beam as it starts (`pupil`), read at `plane`. */
export function numbersAt(target: Target, pupil: Pupil, beamMm: number, plane: Plane, nm: number | null, rays = 41): PlaceNumbers {
  const beam = target.beam;
  const rt = realTrace(beam, pupil, rays);
  let focus: PlaceNumbers['focus'];
  if (target.part === 'end') focus = { kind: 'collimation', rmsAngleRad: rmsAngle(rt) };
  else {
    const z = planeZ(beam, plane);
    const best = bestFocus(rt, z, focusReach(rt, z));
    const airyNm = nm ?? DEFAULT_NM;
    focus = { kind: 'focus', rmsMm: rmsAt(rt, z), bestDzMm: best - z, rmsBestMm: rmsAt(rt, best), airyMm: airyRadius(rt, airyNm), airyNm };
  }
  // The sample's cone is the objective's own NA: it fills the objective by definition, so the objective is not read for clipping.
  const r = results(beam, trace(beam, startRay(beam, beamMm)), beamMm);
  const sets = (role: string) => beam.fromSample && role === 'objective';
  const fills = beam.elements.flatMap((e, i) => (e.apertureMm && !sets(e.role) ? [{ label: e.label, fill: r.elements[i].beamMm / e.apertureMm }] : []));
  const fullest = fills.reduce<{ label: string; fill: number } | null>((a, b) => (!a || b.fill > a.fill ? b : a), null);
  const curve = spectrum(beam);
  const at = curve && nm ? curve.reduce((a, b) => (Math.abs(b.nm - nm) < Math.abs(a.nm - nm) ? b : a)) : null;
  return {
    focus,
    clipping: { fullest, stopped: rt.vignetted, rays: rt.rays.length },
    transmission: {
      t: at ? at.t : null,
      nm,
      unknown: curve
        ? lossy(beam)
            .filter((e) => !e.record)
            .map((e) => e.label)
        : [],
    },
  };
}

/** The path unfolded, for the beam envelope. */
function envelopeOf(beam: Beam): Envelope {
  const t = trace(beam, startRay(beam, DEFAULT_BEAM_MM));
  const r = results(beam, t, DEFAULT_BEAM_MM);
  return {
    parts: beam.elements.map((e, i) => ({ id: e.id, label: e.label, role: e.role, atMm: e.atMm, apertureMm: e.apertureMm, focalMm: e.focalMm, clipped: r.elements[i].clipped })),
    endMm: beam.endMm,
    marginal: t.samples.map((s) => ({ z: s.z, y: s.y })),
    foci: r.foci,
    focusMm: r.out.focusMm,
  };
}

/** The plane an objective is read at; else the place itself. */
const planeOf = (o: Objective, target: Target): Plane => (o.kind === 'rms-spot' || o.kind === 'beam-diameter' ? o.plane : { part: target.part, offsetMm: 0 });

function viewOf(beam: Beam, target: Target, objective: Objective): OptimizeView {
  const pupil = pupilOf(beam, DEFAULT_BEAM_MM);
  const plane = planeOf(objective, target);
  const rt = realTrace(beam, pupil, MERIT_RAYS);
  const z = planeZ(beam, plane);
  const at = plane.part === 'end' ? 'the end' : (beam.elements.find((e) => e.id === plane.part)?.label ?? target.label);
  return {
    value: measure(beam, objective, pupil),
    envelope: envelopeOf(beam),
    spot: { points: spotAt(rt, z), rmsMm: rmsAt(rt, z), airyMm: plane.part === 'end' ? null : airyRadius(rt, beam.wavelengthNm ?? DEFAULT_NM), at },
  };
}

type RecordFor = Library['record'];

/** The places a design's light is read at. */
function targetsIn(design: Schematic, light: Light, record: RecordFor): Target[] {
  const recordFor = (s: SchematicSymbol) => recordOf(s, record);
  return targetsOf(light.paths.flatMap((p) => beamOf(design, p, recordFor) ?? []));
}

function find(design: Schematic, light: Light, key: string, record: RecordFor): Target {
  const t = targetsIn(design, light, record).find((x) => x.key === key);
  if (!t) throw new Error('That place no longer gets light in this design.');
  return t;
}

/** What a run asks. */
export type RunAsk = OptimizeAsk & { variables: Variable[] };

/** A run a step at a time: the best so far after each step, then the run. */
export function* optimizeSteps({ design, light, place, objective, variables }: RunAsk, record: RecordFor): Generator<OptimizeRun, OptimizeRun> {
  const t = find(design, light, place, record);
  const pupil = pupilOf(t.beam, DEFAULT_BEAM_MM);
  const before = measure(t.beam, objective, pupil);
  const history = [before];
  const snapshot = (values: Record<string, number>, steps: number): OptimizeRun => {
    const proposed = withValues(t.beam, variables, values);
    const after = measure(proposed, objective, pupil);
    return { values, before, after, history: [...history, after], steps, stopped: false, design: toDesign(design, t.beam, variables, values), proposed: viewOf(proposed, t, objective) };
  };
  const it = search(t.beam, variables, objective, pupil);
  for (let r = it.next(); ; r = it.next()) {
    const best = snapshot(r.value.values, r.value.steps);
    if (r.done) return best;
    history.push(best.after);
    yield best;
  }
}

/** A job's promise, with its two ends. */
function settled() {
  let resolve!: (r: OptimizeRun) => void;
  let reject!: (e: Error) => void;
  const done = new Promise<OptimizeRun>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { done, resolve, reject };
}

const asError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

/** A run in the page, a step per task, for where there is no worker. */
function runHere(ask: RunAsk, record: RecordFor, onStep: (best: OptimizeRun) => void): OptimizeJob {
  const { done, resolve, reject } = settled();
  let stopped = false;
  let last: OptimizeRun | null = null;
  let it: Generator<OptimizeRun, OptimizeRun> | null = null;
  const next = () => {
    if (stopped) return;
    try {
      it ??= optimizeSteps(ask, record);
      const r = it.next();
      if (r.done) return resolve(r.value);
      onStep((last = r.value));
      setTimeout(next, 0);
    } catch (e) {
      reject(asError(e));
    }
  };
  setTimeout(next, 0);
  return {
    done,
    stop: () => {
      if (stopped) return;
      stopped = true;
      if (last) resolve({ ...last, stopped: true });
      else reject(new Error('Stopped before the first step.'));
    },
  };
}

/** What the worker says: a step (the best so far), the run, or why it could not run. */
export type WorkerSays = { kind: 'step'; best: OptimizeRun } | { kind: 'done'; run: OptimizeRun } | { kind: 'error'; message: string };

/** A run in a worker of its own: the page stays free. Stop ends the worker and keeps the best so far. */
function runInWorker(ask: RunAsk, onStep: (best: OptimizeRun) => void): OptimizeJob {
  const { done, resolve, reject } = settled();
  const worker = new Worker(new URL('./optimizeWorker.ts', import.meta.url), { type: 'module' });
  let last: OptimizeRun | null = null;
  worker.onmessage = (e: MessageEvent<WorkerSays>) => {
    const m = e.data;
    if (m.kind === 'step') return onStep((last = m.best));
    worker.terminate();
    if (m.kind === 'done') resolve(m.run);
    else reject(new Error(m.message));
  };
  worker.onerror = (e) => {
    worker.terminate();
    reject(new Error(e.message || 'The optimizer stopped with an error.'));
  };
  worker.postMessage(ask);
  return {
    done,
    stop: () => {
      worker.terminate();
      if (last) resolve({ ...last, stopped: true });
      else reject(new Error('Stopped before the first step.'));
    },
  };
}

/** The lab's kernel as the app's analysis: the parts' optics from `library`. */
export function standinAnalysis(library: Pick<Library, 'record'>): Analysis {
  const targets = (design: Schematic, light: Light) => targetsIn(design, light, library.record);
  const read = (t: Target, { settings }: SimulateAsk) => ({
    pupil: pupilOf(t.beam, startDiameter(t.beam, settings.beamMm), settings.na ?? undefined),
    beamMm: startDiameter(t.beam, settings.beamMm),
    plane: { part: t.part, offsetMm: settings.shiftMm[t.key] ?? 0 },
    nm: settings.nm ?? t.beam.wavelengthNm,
  });

  return {
    places: (ask) =>
      targets(ask.design, ask.light).map((t): Place => {
        const { pupil, plane, nm, beamMm } = read(t, ask);
        return {
          key: t.key,
          label: t.label,
          part: t.part,
          ray: t.beam.ray,
          start: pupil.kind === 'collimated' ? { kind: 'collimated', beamMm, divergenceRad: t.beam.divergenceRad } : { kind: 'point', na: pupil.na },
          wavelengthNm: t.beam.wavelengthNm,
          numbers: numbersAt(t, pupil, beamMm, plane, nm, ask.settings.rays),
          assumed: t.beam.elements.flatMap((e) => (e.assumed.length ? [{ id: e.id, label: e.label, assumed: e.assumed, apertureAssumed: e.apertureAssumed }] : [])),
        };
      }),

    detail: (ask): Detail => {
      const t = find(ask.design, ask.light, ask.place, library.record);
      const { pupil, plane, nm } = read(t, ask);
      const beam = t.beam;
      if (ask.of === 'fill') {
        const d = startDiameter(beam, ask.settings.beamMm);
        const r = results(beam, trace(beam, startRay(beam, d)), d);
        return { of: 'fill', rows: beam.elements.flatMap((e, i) => (e.apertureMm ? [{ id: e.id, label: e.label, fill: r.elements[i].beamMm / e.apertureMm, selectable: Boolean(e.symbol) }] : [])) };
      }
      if (ask.of === 'transmission') return { of: 'transmission', curve: spectrum(beam), nm };
      const rt = realTrace(beam, pupil, ask.settings.rays);
      const z = planeZ(beam, plane);
      const airy = t.part === 'end' ? null : airyRadius(rt, nm ?? DEFAULT_NM);
      if (ask.of === 'fan') return { of: 'fan', fan: heightsAt(rt, z) };
      if (ask.of === 'focus') {
        const best = bestFocus(rt, z, focusReach(rt, z));
        const reach = Math.max(2, Math.abs(best - z) * 1.6, 5);
        return { of: 'focus', samples: rmsThroughFocus(rt, z, reach), bestDzMm: best - z, rmsBestMm: rmsAt(rt, best), airyMm: airy };
      }
      const geo = Math.max(0, ...heightsAt(rt, z).map((h) => Math.abs(h.y)));
      return { of: 'spot', points: spotAt(rt, z), rmsMm: rmsAt(rt, z), geoMm: geo, airyMm: airy, stopped: rt.vignetted, rays: rt.rays.length };
    },

    setup: ({ design, light, place }) => {
      const t = find(design, light, place, library.record);
      const r = results(t.beam, trace(t.beam, startRay(t.beam, DEFAULT_BEAM_MM)), DEFAULT_BEAM_MM);
      return {
        objectives: OBJECTIVES,
        objective: t.part === 'end' ? { kind: 'collimation' } : { kind: 'rms-spot', plane: { part: t.part, offsetMm: 0 } },
        groups: variablesOf(t.beam).map((g) => ({ part: { id: g.part.id, label: g.part.label }, variables: g.variables, fixed: g.fixed })),
        lenses: lensesOf(t.beam).map((e) => ({ id: e.id, label: e.label, focalMm: e.focalMm })),
        magnification: r.magnification ?? r.expansion ?? null,
      };
    },

    view: ({ design, light, place, objective }) => {
      const t = find(design, light, place, library.record);
      return viewOf(t.beam, t, objective);
    },

    // The worker reads the parts from the lab's library itself: the same records as the page's.
    run: (ask, onStep) => (typeof Worker === 'undefined' ? runHere(ask, library.record, onStep) : runInWorker(ask, onStep)),
  };
}
