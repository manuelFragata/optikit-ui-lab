/**
 * The light, as the views draw it. The views never work out where light
 * goes: they ask the light source the app provides (`LightProvider`) for the
 * design they show, and draw what it returns. Today that source is a demo
 * stand-in (src/standins/kernel/light.ts); later it is the optics engine (oc-wasm),
 * swapped in at the app root and nowhere else.
 *
 * A trace is immediate: oc-wasm traces in the page, on the main thread,
 * well inside a frame, so the light follows every edit and every drag at
 * once. The scene is built in the page too (no round trip per change). So
 * `LightFor` answers at once, and the views ask with `useLight`. One trace
 * per design: the views that draw the same design share it.
 *
 * Grid units, y up.
 */
import { createContext, useContext, useMemo } from 'react';
import { errorText } from './request';
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

/** Where the light goes in a design: traced at once. It throws when the design cannot be traced. */
export type LightFor = (design: Schematic) => Light;

/** No light at all. */
export const DARK: Light = { paths: [], misses: [] };

/** No light source: the views draw no light. */
export const NO_LIGHT: LightFor = () => DARK;

const Context = createContext<LightFor>(NO_LIGHT);

/** Gives every view below it the app's light source. */
export const LightProvider = Context.Provider;

export const useLightFor = () => useContext(Context);

/** The light of a design as a view has it. */
export interface LightState {
  /** The design's light; none when it could not be traced. */
  light: Light;
  /** Why the design could not be traced, in words. */
  error: string | null;
}

/** One trace per design and light source, shared by the views. */
const traces = new WeakMap<LightFor, WeakMap<Schematic, LightState>>();
function traced(lightFor: LightFor, design: Schematic): LightState {
  let byDesign = traces.get(lightFor);
  if (!byDesign) traces.set(lightFor, (byDesign = new WeakMap()));
  let known = byDesign.get(design);
  if (!known) {
    try {
      known = { light: lightFor(design), error: null };
    } catch (e) {
      known = { light: DARK, error: errorText(e) };
    }
    byDesign.set(design, known);
  }
  return known;
}

/** The light of `design`, traced by the app's light source: at once, on every change (a drag too). */
export function useLight(design: Schematic): LightState {
  const lightFor = useLightFor();
  return useMemo(() => traced(lightFor, design), [lightFor, design]);
}
