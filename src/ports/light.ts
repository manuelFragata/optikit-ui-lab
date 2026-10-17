/**
 * The light, as the views draw it. The views never work out where light
 * goes: they ask the light source the app provides (`LightProvider`) for the
 * design they show, and draw what it returns. Today that source is a demo
 * stand-in (src/standins/kernel/light.ts); later it is the optics engine (oc-wasm),
 * swapped in at the app root and nowhere else.
 *
 * A trace takes time: in the app the service builds the scene (POST
 * /v1/scene3) and oc-wasm traces it in a worker. So the views ask with
 * `useLight`, which keeps the last light while a new one is traced, says
 * when the wait is long, and when a trace failed. One trace per design: the
 * views that draw the same design share it.
 *
 * Grid units, y up.
 */
import { createContext, useContext, useMemo } from 'react';
import { useRequest } from './request';
import type { RayColorKey, Schematic } from '../components/editor/model';

export type Point = { x: number; y: number };

/**
 * A light path as the tracer names it: from where the light starts to where
 * it ends (as the design format's `paths: {from, to}`), with how to draw it.
 * Nobody writes these: they come from the parts.
 */
export interface LightRay {
  id: string;
  /** "Laser 488 → Sample", "Sample → Camera". */
  label: string;
  color: RayColorKey;
  /** Offset (grid units, y up) so paths along the same line sit side by side. */
  offset: number;
  /** Which leg carries the direction arrow. */
  arrowSegment: number;
  /** The point near which the label sits. */
  labelAt: number;
}

/** Where one light path goes, on its layer. */
export interface LightPath {
  ray: LightRay;
  z: number;
  points: Point[];
  /** Its last run goes into nothing (drawn fading). */
  open: boolean;
  /**
   * What the light meets, in order, by part id ('sample' for the sample):
   * `parts[i]` is where `points[i]` is, the first being where it starts. An
   * open path has one point more, where it runs out.
   */
  parts?: string[];
}

/** No light reaches a detector: a dashed hint from the nearest light to it. */
export interface LightMiss {
  /** The light that passes nearest. */
  ray: LightRay;
  /** The detector, by name. */
  label: string;
  from: Point;
  at: Point;
}

export interface Light {
  paths: LightPath[];
  misses: LightMiss[];
}

/** Where the light goes in a design: traced, in time. */
export type LightFor = (design: Schematic) => Promise<Light>;

/** No light at all. */
export const DARK: Light = { paths: [], misses: [] };

/** No light source: the views draw no light. */
export const NO_LIGHT: LightFor = async () => DARK;

const Context = createContext<LightFor>(NO_LIGHT);

/** Gives every view below it the app's light source. */
export const LightProvider = Context.Provider;

export const useLightFor = () => useContext(Context);

/** The light of a design as a view has it. */
export interface LightState {
  /** The design's light; while a newer trace runs, the last one; before any, none. */
  light: Light;
  /** A trace has come back for this design or an earlier one: `light` can be read as the design's. */
  known: boolean;
  /** A newer trace is on its way. */
  tracing: boolean;
  /** …and long enough to show. */
  slow: boolean;
  error: string | null;
  retry: () => void;
}

/** One trace per design and light source, shared by the views; a failed one is forgotten, so it is traced again. */
const traces = new WeakMap<LightFor, WeakMap<Schematic, Promise<Light>>>();
function shared(lightFor: LightFor): LightFor {
  let byDesign = traces.get(lightFor);
  if (!byDesign) traces.set(lightFor, (byDesign = new WeakMap()));
  const cache = byDesign;
  return (design) => {
    const known = cache.get(design);
    if (known) return known;
    const asked = lightFor(design);
    cache.set(design, asked);
    asked.catch(() => cache.delete(design));
    return asked;
  };
}

/**
 * The light of `design`, traced by the app's light source. `null` asks
 * nothing new and keeps the last light (a drag: it is traced once the parts
 * are let go).
 */
export function useLight(design: Schematic | null): LightState {
  const lightFor = useLightFor();
  const ask = useMemo(() => shared(lightFor), [lightFor]);
  const r = useRequest(design, ask, { keep: true });
  return { light: r.data ?? DARK, known: r.data !== undefined, tracing: r.status === 'loading' && design !== null, slow: r.slow, error: r.error, retry: r.retry };
}
