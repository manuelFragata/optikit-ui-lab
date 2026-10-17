/**
 * Holders made for an optic, asked of the service: which generators (roads)
 * can hold it and why the others cannot, a dry run of one with its checks,
 * and the holder's meshes. The close-up's holder designer and the 3D view
 * read them. In the lab the stand-in answers (src/standins/service: the
 * generators' `holds` blocks, the V4 lens cartridge drawn from its
 * parameters); in the app optikit-core: `GET /v1/generators`,
 * `POST /v1/generate/plan`, and `POST /v1/generate` (its GLB).
 *
 * Lengths in mm.
 */
import { createContext, useContext } from 'react';
import type { CatalogRecord, OpticFacts } from '../components/editor/holders/optic';
import type { MeshComponent } from '../components/editor/scene3d/meshes';

export type BeamAxis = '+x' | '-x' | '+y' | '-y';

/** What a generator holds, as its `params.json` declares it (`holds`). */
export interface GeneratorHolds {
  /** The shape of the holding problem; `any` is the boolean holder. */
  outline: 'round' | 'rect' | 'plate' | 'cube' | 'slide' | 'thread' | 'any';
  /** Largest optic across, mm (diameter, or the diagonal of a rectangle). */
  max_mm: number;
  thickness_mm: [number, number];
  /** Record categories it holds; empty = any. */
  categories: string[];
  /** Mount states it holds: `bare` (glass), `housed`/`cased` (already mounted). */
  mounting: string[];
  /** false = flats only. */
  curved?: boolean;
  /** The road cuts the holder from the record's own prescription. */
  needs_prescription?: boolean;
  /** How far off the cube axes it can still hold the optic, degrees. */
  max_tilt_deg?: number;
  label: string;
  hint: string;
  /** The bodies it makes. */
  parts: string[];
}

export interface GeneratorSpec {
  /** The generator's script name in optikit-v2's `generators/`. */
  script: string;
  holds: GeneratorHolds;
}

/** A generator, and why it cannot hold the optic (`null`: it can). */
export interface Road {
  spec: GeneratorSpec;
  refusal: string | null;
}

/** lens_cartridge_v4's parameters, by their names in its params.json. */
export interface CartridgeParams {
  /** The lens as its record: the service inlines the surface stack. */
  part_prescription: { component: string };
  beam_axis: BeamAxis;
  /** Which lens point `part_position_mm` gives. */
  reference: 'center' | 'front_vertex' | 'back_vertex';
  /** The lens from the cube centre: x, y across the beam (±20), z along it (±25). */
  part_position_mm: { x: number; y: number; z: number };
  /** Tilt about the lens's own axes (x, y ±90; z ±180). */
  part_rotation_deg: { x: number; y: number; z: number };
  /** Clear aperture Ø; the generator defaults it to 90 % of the lens. */
  clear_aperture_mm?: number;
  fit_clearance_mm: number;
  /** Snap the notched master to the cube's 5 mm grid; off: two smooth inserts, the joint exactly at z. */
  snap_to_notch: boolean;
  alignment_pins: number;
  include_master_inserts: boolean;
}

export interface HolderCheck {
  /** Stable: the service's codes where it has one (`DRC_APERTURE`, `DRC_BEAM_CLIPPED`), else the lab's (`E_…`, `W_…`). */
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

/** One body in the plan, as `/v1/generate/plan` lists them. */
export interface PlanBody {
  name: string;
  outline: 'round' | 'octagon' | 'lens';
  axis: BeamAxis;
  extent_mm: [number, number];
  radius_mm: number;
  held: boolean;
}

/** As `POST /v1/generate/plan` answers (`plan`), plus every check with its code and severity. */
export interface CartridgePlan {
  fits: boolean;
  reasons: string[];
  warnings: string[];
  joint_mm: number;
  beam_axis: BeamAxis;
  bodies: PlanBody[];
  /** The bounding box of all the bodies, and whether it fits one 50 mm cell (`meta.fits_envelope`). */
  bbox_mm: { size: [number, number, number] };
  fits_envelope: boolean;
  checks: HolderCheck[];
}

export interface Holders {
  /** Every road with its refusal (those that fit first), and the lens cartridge's parameters to start from for this part. */
  roads: (ask: { optic: OpticFacts; component: string }) => Promise<{ roads: Road[]; defaults: CartridgeParams }>;
  /** The dry run: will it build, and will the light get through. `beamMm`: the beam's Ø at the lens. */
  plan: (ask: { params: CartridgeParams; record: CatalogRecord; beamMm: number }) => Promise<CartridgePlan>;
  /** The holder with the optic in it, as components in the document frame (mm, centred on the cube). */
  mesh: (ask: { params: CartridgeParams; record: CatalogRecord }) => Promise<MeshComponent[]>;
}

const nothing = () => Promise.reject(new Error('No holder service is connected.'));

/** No holder service. */
export const NO_HOLDERS: Holders = { roads: nothing, plan: nothing, mesh: nothing };

const Context = createContext<Holders>(NO_HOLDERS);

export const HoldersProvider = Context.Provider;

export const useHolders = () => useContext(Context);
