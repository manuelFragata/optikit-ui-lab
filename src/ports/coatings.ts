/**
 * What an optic does to the light at its surfaces, asked of the optics
 * engine: each surface's role and coating, its reflectance across the
 * spectrum, what the optic passes on at the design's wavelengths, and what
 * the coatings cost there. The close-up's Optical side reads it. In the lab
 * the stand-in's thin-film model answers (src/standins/kernel/coatings.ts);
 * in the app oc-wasm (`surfaceRtF64`, `surfaceCoatingJSON`), once the service
 * writes coatings into the Scene3.
 *
 * Wavelengths in nm; reflectance and transmission as fractions, 0 … 1.
 */
import { createContext, useContext } from 'react';
import type { CatalogRecord } from '../components/editor/holders/optic';

export type CoatingId = 'uncoated' | 'mgf2' | 'ar-a' | 'ar-b' | 'ar-c' | 'al-protected' | 'ag-protected' | 'au-protected' | 'dielectric-e02' | 'dielectric-e03';

/** A coating one can choose for a designed optic. */
export interface Coating {
  id: CoatingId;
  label: string;
  /** Where it goes: a glass face the light passes through, or a mirror's face. */
  on: 'transmit' | 'mirror';
  /** The band it is made for, nm. */
  band?: [number, number];
  /** One line on what it is. */
  note: string;
  /** Drawn from the vendor's curve rather than computed. */
  approximate: boolean;
}

/** What a surface is to the light: where it is in the stack, what it can carry, and what it carries. */
export interface SurfaceInfo {
  index: number;
  role: 'front' | 'back' | 'cemented' | 'mirror' | 'substrate';
  /** The media either side, by name ("air" for air). */
  before: string;
  after: string;
  /** The coating on it; `null` for a cemented face (glued, so no coating) or a mirror's back. */
  coating: CoatingId | null;
  /** Whose the coating is: the vendor's (fixed), this design's, or assumed (a designed mirror with none chosen yet). */
  from: 'vendor' | 'design' | 'assumed' | null;
  /** The light meets it. A mirror's back does not. */
  inLight: boolean;
}

export interface CoatingCheck {
  severity: 'warning' | 'info';
  message: string;
  /** The surface it is about, when one. */
  surface?: number;
}

/** One optic as the light sees it. */
export interface OpticLight {
  surfaces: SurfaceInfo[];
  /** By surface: its reflectance across the spectrum (from 350 nm, to 1100 nm or past it when the band or the light goes further), and at each of the design's wavelengths. */
  reflectance: { curve: { nm: number; r: number }[]; at: { nm: number; r: number }[] }[];
  /** What the optic passes on at each of the design's wavelengths: through a lens, back from a mirror. */
  passes: { nm: number; t: number }[];
  checks: CoatingCheck[];
}

export interface Coatings {
  /** The coatings a designed optic can take. */
  catalogue: readonly Coating[];
  /** An optic's surfaces, read at the design's wavelengths: at once. It throws when the optic cannot be read. */
  of: (ask: { optic: CatalogRecord; wavelengths: number[] }) => OpticLight;
}

/** No coatings known. */
export const NO_COATINGS: Coatings = {
  catalogue: [],
  of: () => {
    throw new Error('No optics engine is connected.');
  },
};

const Context = createContext<Coatings>(NO_COATINGS);

export const CoatingsProvider = Context.Provider;

export const useCoatings = () => useContext(Context);
