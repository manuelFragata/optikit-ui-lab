/**
 * What Simulate and Optimize show, asked of the optics engine: results, not
 * the engine's workings. The views never trace: they ask the analysis the
 * app provides (`AnalysisProvider`) for numbers and curves, and read them.
 * In the lab the stand-in kernel answers (src/standins/kernel/simulate); in
 * the app, oc-wasm (spots, fans and maps from its detector hits, and the
 * optimizer's loop), swapped in at the app root. Both run in the page, on
 * the person's computer.
 *
 * Reading the light is immediate: oc-wasm traces on the main thread, well
 * inside a frame, so every number follows every edit at once. A call throws
 * when it cannot answer. An optimizer run is the one thing that takes time:
 * it runs in a worker, says how it goes after each step, and can be stopped
 * with the best it has so far.
 *
 * Lengths in mm, angles in rad, wavelengths in nm.
 */
import { createContext, useContext } from 'react';
import type { Light, LightRay } from './light';
import type { Schematic } from '../components/editor/model';

/* -------------------------------------------------------------------- */
/* Simulate                                                              */
/* -------------------------------------------------------------------- */

/** The analyses one place can be looked at with. */
export type AnalysisId = 'spot' | 'fan' | 'focus' | 'fill' | 'transmission';

/** How the light is sent in and read, as the person sets it in Simulate. */
export interface SimulateSettings {
  /** The source's beam Ø; `null`: each source's own (a laser's waist, an LED's emitter). */
  beamMm: number | null;
  /** The sample's cone NA; `null`: the objective's own. */
  na: number | null;
  /** Rays across the pupil (one meridian fan). */
  rays: number;
  /** The wavelength; `null`: each source's own. */
  nm: number | null;
  /** How far each place's plane is shifted along the light, by place key. */
  shiftMm: Readonly<Record<string, number>>;
}

/** One question to the analysis: a design, its light, and how to read it. */
export interface SimulateAsk {
  design: Schematic;
  light: Light;
  settings: SimulateSettings;
}

/** What the analysis took for a part where the design does not say. */
export interface Assumed {
  /** The part, or 'sample'. */
  id: string;
  label: string;
  /** In words: "an ideal thin lens", "one inch across". */
  assumed: string[];
  /** Its clear Ø is among them. */
  apertureAssumed: boolean;
}

/** The raw numbers at a place, for the UI to read (simulate/checks.ts). */
export interface PlaceNumbers {
  /** At a plane: the RMS spot there and at the best focus near it, and the diffraction limit (the Airy radius, at `airyNm`). Where light runs out: how far it leaves parallel. */
  focus: { kind: 'focus'; rmsMm: number; bestDzMm: number; rmsBestMm: number; airyMm: number | null; airyNm: number } | { kind: 'collimation'; rmsAngleRad: number };
  /** The fullest aperture on the path (beam Ø over clear Ø), and the rays stopped. */
  clipping: { fullest: { label: string; fill: number } | null; stopped: number; rays: number };
  /** What the path passes at `nm`; `t` is `null` when no coating on it is known. `unknown`: parts that take light with no data (counted lossless). */
  transmission: { t: number | null; nm: number | null; unknown: string[] };
}

/** Where light is read: a detector, the sample, or where a path runs out, with the light that reaches it. */
export interface Place {
  key: string;
  label: string;
  /** The part it is at, 'sample', or 'end'. */
  part: string;
  ray: LightRay;
  /** How the light starts: a source's beam (its Ø, as asked or the source's own, and its full divergence, rad), or the sample's cone. */
  start: { kind: 'collimated'; beamMm: number; divergenceRad: number } | { kind: 'point'; na: number };
  /** The source's wavelength, when it states one. */
  wavelengthNm: number | null;
  numbers: PlaceNumbers;
  assumed: Assumed[];
}

/** One analysis of one place, in full. */
export type Detail =
  | { of: 'spot'; points: { x: number; y: number }[]; rmsMm: number; geoMm: number; airyMm: number | null; stopped: number; rays: number }
  | { of: 'fan'; fan: { rho: number; y: number }[] }
  | { of: 'focus'; samples: { dz: number; rms: number }[]; bestDzMm: number; rmsBestMm: number; airyMm: number | null }
  | { of: 'fill'; rows: { id: string; label: string; fill: number; selectable: boolean }[] }
  | { of: 'transmission'; curve: { nm: number; t: number }[] | null; nm: number | null };

/* -------------------------------------------------------------------- */
/* Optimize                                                              */
/* -------------------------------------------------------------------- */

/** A plane along the light: at a part (a detector, the sample, any part) or where the path ends, shifted. */
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

/**
 * One target of a run: an objective, and how much it counts against the
 * others. Each target counts relative to its value at the start, so targets
 * in different units (a spot in µm, a focal length in mm) can be weighed.
 */
export interface Goal {
  objective: Objective;
  weight: number;
}

export type VariableKind = 'position' | 'holder' | 'focal' | 'radius' | 'thickness';

/** Something the optimizer may change, with its bounds. */
export interface Variable {
  id: string;
  part: string;
  kind: VariableKind;
  /** The surface a radius or thickness belongs to. */
  surface?: number;
  /** Short, as the list and the spec sheet show it: "Position", "R1", "t1", "f", "In holder". */
  label: string;
  value: number;
  min: number;
  max: number;
}

/** A part on the path and what it lets change; `fixed` says why nothing. */
export interface PartVariables {
  part: { id: string; label: string };
  variables: Variable[];
  fixed?: string;
}

/** The path unfolded onto one axis, for the beam envelope: its parts, the marginal ray, the foci. */
export interface Envelope {
  parts: {
    id: string;
    label: string;
    role: 'source' | 'sample' | 'lens' | 'objective' | 'mirror' | 'plate' | 'stop' | 'detector' | 'other';
    atMm: number;
    apertureMm: number | null;
    focalMm: number | null;
    clipped: boolean;
  }[];
  endMm: number;
  /** The marginal ray: height against distance. */
  marginal: { z: number; y: number }[];
  foci: number[];
  /** Where the light comes to a focus after the last part with power, if it does. */
  focusMm: number | null;
}

/** What a place offers the optimizer. */
export interface OptimizeSetup {
  objectives: { kind: Objective['kind']; label: string; unit: string }[];
  /** The objective to start from at this place: the first target. */
  objective: Objective;
  groups: PartVariables[];
  /** The parts whose focal length can be a target. */
  lenses: { id: string; label: string; focalMm: number | null }[];
  /** The path's magnification or expansion now, to start a target from. */
  magnification: number | null;
}

/** A question to the optimizer: a place, and the targets for the light there. */
export interface OptimizeAsk {
  design: Schematic;
  light: Light;
  place: string;
  goals: Goal[];
}

/** The light at a place as it is (or as proposed): each target's value (in its unit), the envelope, the spot at the plane read (the first target's plane that has one). */
export interface OptimizeView {
  values: number[];
  envelope: Envelope;
  spot: { points: { x: number; y: number }[]; rmsMm: number; airyMm: number | null; at: string };
}

/** A run (or, while it goes, the best so far): the variables' new values, each target before and after, the merit, and the design and its light as proposed. */
export interface OptimizeRun {
  values: Record<string, number>;
  /** Each target's value before and after, in its unit, in the order asked. */
  goals: { before: number; after: number }[];
  /** All targets weighed together, as a share of where they started: 1 before. */
  merit: { before: number; after: number };
  /** The merit after each step, from where it started. */
  history: number[];
  steps: number;
  /** Stopped before it was done: the best so far. */
  stopped: boolean;
  /** The design with the values applied: Apply makes it the design. */
  design: Schematic;
  proposed: OptimizeView;
}

/* -------------------------------------------------------------------- */

/** An optimizer run on its way. */
export interface OptimizeJob {
  /** The run when it is done; once stopped, the best so far. It fails when the run could not be made. */
  done: Promise<OptimizeRun>;
  /** Stop now, and keep the best so far. */
  stop: () => void;
}

export interface Analysis {
  /** Every place light is read, with its numbers. */
  places: (ask: SimulateAsk) => Place[];
  /** One analysis of one place. */
  detail: (ask: SimulateAsk & { place: string; of: AnalysisId }) => Detail;
  /** What a place offers the optimizer. */
  setup: (ask: { design: Schematic; light: Light; place: string }) => OptimizeSetup;
  /** The light at a place as it is, read for an objective. */
  view: (ask: OptimizeAsk) => OptimizeView;
  /** Start the optimizer on some variables, within their bounds; `onStep` gets the best so far after each step. */
  run: (ask: OptimizeAsk & { variables: Variable[] }, onStep: (best: OptimizeRun) => void) => OptimizeJob;
}

const nothing = (): never => {
  throw new Error('No optics engine is connected.');
};

/** No analysis: nothing to read. */
export const NO_ANALYSIS: Analysis = {
  places: () => [],
  detail: nothing,
  setup: nothing,
  view: nothing,
  run: () => ({ done: Promise.reject(new Error('No optics engine is connected.')), stop: () => {} }),
};

const Context = createContext<Analysis>(NO_ANALYSIS);

/** Gives every view below it the app's analysis. */
export const AnalysisProvider = Context.Provider;

export const useAnalysis = () => useContext(Context);
