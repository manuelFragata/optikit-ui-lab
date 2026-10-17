/**
 * The light, as the views draw it. The views never work out where light
 * goes: they ask the light source the app provides (`LightProvider`) for the
 * design they show, and draw what it returns. Today that source is a demo
 * stand-in (src/standins/kernel/light.ts); later it is the optics engine (oc-wasm),
 * swapped in at the app root and nowhere else.
 *
 * Grid units, y up.
 */
import { createContext, useContext } from 'react';
import type { Schematic, SchematicRay } from '../components/editor/model';

export type Point = { x: number; y: number };

/** Where one of the design's light paths goes, on its layer. */
export interface LightPath {
  /** The design's light path: its name, colour and where its label and arrow go. */
  ray: SchematicRay;
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

/** The light does not reach a part meant to be on its path: a dashed hint from the last part it reached. */
export interface LightMiss {
  ray: SchematicRay;
  /** The part it misses, by name. */
  label: string;
  from: Point;
  at: Point;
}

export interface Light {
  paths: LightPath[];
  misses: LightMiss[];
}

/** Where the light goes in a design. */
export type LightFor = (design: Schematic) => Light;

/** No light source: the views draw no light. */
export const NO_LIGHT: LightFor = () => ({ paths: [], misses: [] });

const Context = createContext<LightFor>(NO_LIGHT);

/** Gives every view below it the app's light source. */
export const LightProvider = Context.Provider;

export const useLightFor = () => useContext(Context);
