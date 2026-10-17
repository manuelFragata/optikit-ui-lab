/**
 * STAND-IN for the service: in the app the generators and their `holds`
 * blocks come from GET /v1/generators.
 *
 * Which generator can hold an optic (optikit-v2 WP-258). Every holder
 * generator in optikit-v2 declares a `holds` block in its `params.json`; the
 * service serves them (`GET /v1/generators`) and the wizard offers only the
 * roads a record satisfies, saying why the others refuse. The table below is
 * those blocks as they are in optikit-v2's `generators/`, and `holdRefusal`
 * is `frontend/src/model/holderFit.ts`, so the lab answers as the app does.
 * In the app the table comes from the service, not from here.
 */
import type { OpticFacts } from '../../components/editor/holders/optic';

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

/** optikit-v2's holder generators and their `holds`, in the order the service serves them. */
export const GENERATORS: GeneratorSpec[] = [
  {
    script: 'beamsplitter_v4',
    holds: { outline: 'plate', max_mm: 45, thickness_mm: [0.1, 12], categories: ['dichroic', 'beamsplitter'], mounting: ['bare'], curved: false, needs_prescription: false, max_tilt_deg: 0, label: 'V4 beamsplitter cube', hint: 'The fluorescence cube as openUC2 ships it: a pinned clamshell with the dichroic at 45°, an excitation filter and an emission filter. Fills the inner cube (34 mm).', parts: ['lower', 'upper'] },
  },
  {
    script: 'bolt_cradle_v4',
    holds: { outline: 'rect', max_mm: 45, thickness_mm: [0.1, 200], categories: ['detector', 'source', 'other'], mounting: ['housed', 'cased'], curved: true, needs_prescription: false, max_tilt_deg: 0, label: 'cradle from a bolt pattern', hint: 'For a device that comes with screw holes (a board camera, a camera body, an LED board): the cradle takes its hole pattern, as an insert in a cube or a block on a plate.', parts: ['cradle'] },
  },
  {
    script: 'boolean_holder_1x1',
    holds: { outline: 'any', max_mm: 45, thickness_mm: [0.1, 45], categories: [], mounting: ['bare', 'housed', 'cased'], curved: true, needs_prescription: false, max_tilt_deg: 180, label: 'boolean holder', hint: "The general road: a 1×1 insert with the part's shape carved out of it. Takes any shape: a mirror, a filter, a vendor STEP.", parts: ['front', 'back'] },
  },
  {
    script: 'cube_pocket_v4',
    holds: { outline: 'cube', max_mm: 28, thickness_mm: [3, 28], categories: ['beamsplitter', 'other'], mounting: ['bare'], curved: false, needs_prescription: false, max_tilt_deg: 0, label: 'beamsplitter cube pocket', hint: 'For a beamsplitter cube: it sits in a pocket at the centre of the cell, with a bore through each side face it uses.', parts: ['lower', 'upper'] },
  },
  {
    script: 'focus_cartridge_v4',
    holds: { outline: 'round', max_mm: 31, thickness_mm: [0.2, 20], categories: ['lens', 'objective', 'filter', 'aperture', 'other'], mounting: ['bare'], curved: true, needs_prescription: true, max_tilt_deg: 0, label: 'focus cartridge', hint: 'For a lens whose distance has to be set on the bench: it rides in a barrel that slides ±1 mm in a clamp between the master inserts, and a set screw locks it.', parts: ['barrel', 'ring', 'clamp', 'master_notched', 'master_smooth'] },
  },
  {
    script: 'fold_insert_v4',
    holds: { outline: 'plate', max_mm: 45, thickness_mm: [0.1, 12], categories: ['mirror', 'dichroic', 'beamsplitter', 'filter', 'aperture', 'sample'], mounting: ['bare'], curved: false, needs_prescription: true, max_tilt_deg: 0, label: 'V4 fold-optic insert', hint: 'A flat plate held at an angle in a 1×1 insert: the slot is cut around the glass and the beam legs are bored. A mirror, a dichroic, a beamsplitter plate, or, square across the beam, a filter.', parts: ['insert'] },
  },
  {
    script: 'kinematic_adapter_v4',
    holds: { outline: 'plate', max_mm: 45, thickness_mm: [0.1, 15], categories: ['mirror', 'dichroic', 'beamsplitter', 'filter', 'grating', 'other'], mounting: ['bare'], curved: true, needs_prescription: false, max_tilt_deg: 0, label: 'kinematic mount adapter', hint: "For an optic that has to be aligned: it goes into the ½-inch kinematic mount of the kinematic mirror cube or splitter, on a stub in the mount's bore and a plate on its front.", parts: ['adapter'] },
  },
  {
    script: 'lens_cartridge_v4',
    holds: { outline: 'round', max_mm: 36, thickness_mm: [0.2, 25], categories: ['lens', 'objective', 'filter', 'aperture', 'sample', 'other'], mounting: ['bare'], curved: true, needs_prescription: true, max_tilt_deg: 90, label: 'V4 lens cartridge', hint: "The manufactured road: printed halves seated in the molded master inserts, snapped to the cube's own notch grid. The cavity is cut from the record's own sag: spheres, conics, aspheres, flats.", parts: ['front', 'back', 'master_notched', 'master_smooth'] },
  },
  {
    script: 'round_clamp_v4',
    holds: { outline: 'round', max_mm: 34, thickness_mm: [0.1, 300], categories: ['source', 'lens', 'objective', 'filter', 'detector', 'other'], mounting: ['housed', 'cased'], curved: true, needs_prescription: false, max_tilt_deg: 0, label: 'V4 round clamp', hint: 'For a part in a round housing: a laser module, a fibre collimator, an LED or a lens tube up to 34 mm across. Two master inserts hold the printed clamp; a set screw holds the body.', parts: ['clamp', 'master_notched', 'master_smooth'] },
  },
  {
    script: 'sample_vessel_v4',
    holds: { outline: 'rect', max_mm: 16, thickness_mm: [1, 60], categories: ['sample', 'other'], mounting: ['bare', 'housed'], curved: true, needs_prescription: false, max_tilt_deg: 0, label: 'vial or cuvette insert', hint: 'For a liquid sample: a vial or a cuvette stands in a well across the beam, with windows for the light and a cap that keeps the room light out.', parts: ['insert', 'cap'] },
  },
  {
    script: 'slide_slot_v4',
    holds: { outline: 'slide', max_mm: 80, thickness_mm: [0.1, 2.5], categories: ['sample', 'other'], mounting: ['bare'], curved: false, needs_prescription: false, max_tilt_deg: 0, label: 'slide slot', hint: 'For a microscope slide or a coverslip: an insert across the beam that the slide slides into, down to a stop, with the sample on the beam axis.', parts: ['insert'] },
  },
  {
    script: 'sm1_adapter_v4',
    holds: { outline: 'thread', max_mm: 25.8, thickness_mm: [0.1, 40], categories: ['lens', 'objective', 'filter', 'aperture', 'detector', 'source', 'other'], mounting: ['housed', 'cased'], needs_prescription: false, max_tilt_deg: 0, label: 'thread adapter', hint: "For a part that is already mounted: a thread it screws into (SM1, SM05, C-mount, RMS or M12×0.5) with a shoulder it seats against. No cavity: the vendor's barrel is the mount.", parts: ['insert'] },
  },
];

/** Why this generator cannot hold this optic; `null` when it can. As optikit-v2's `holdRefusal`, same checks, same order. */
export function holdRefusal(holds: GeneratorHolds, optic: OpticFacts, tiltDeg = 0): string | null {
  if (optic.mount === 'cube') return 'this part is already in a cube';
  const mounting = holds.mounting ?? [];
  if (mounting.length && !mounting.includes(optic.mount)) {
    return mounting.includes('bare') ? 'this road holds bare glass, and the part is already mounted' : 'this road holds a part that is already mounted, and this one is bare glass';
  }
  if (holds.categories?.length && !holds.categories.includes(optic.category)) return `this road does not hold a ${optic.category}`;
  if (holds.needs_prescription && !optic.hasFragment) return 'this road cuts the holder from the record’s prescription, and this record has none';
  if (holds.curved === false && optic.curved) return 'this road holds flat plates, and this optic is curved';
  if (holds.outline === 'round' && optic.rectangular) return 'this road holds round optics, and this one is rectangular';
  if (optic.acrossMm > holds.max_mm) return `this road takes up to ${holds.max_mm} mm across; the optic is ${optic.acrossMm.toFixed(1)} mm`;
  const [lo, hi] = holds.thickness_mm ?? [0, Infinity];
  if (optic.thicknessMm < lo || optic.thicknessMm > hi) return `this road takes ${lo}–${hi} mm of glass; the optic is ${optic.thicknessMm.toFixed(1)} mm`;
  const maxTilt = holds.max_tilt_deg ?? 180;
  if (tiltDeg > Math.max(maxTilt, 0.5)) {
    return maxTilt <= 0.5
      ? `the placement tilts the optic ${tiltDeg.toFixed(1)}° off the cube axes, and this road holds it on the beam`
      : `the placement tilts the optic ${tiltDeg.toFixed(1)}° off the cube axes; this road absorbs up to ${maxTilt}°`;
  }
  return null;
}

export interface Road {
  spec: GeneratorSpec;
  refusal: string | null;
}

/**
 * Every road with its refusal: the ones that fit first, then the refused; the
 * catch-all boolean holder last among each (optikit-v2 `orderRoads`: it
 * always fits, so left in place it would win the default by accident).
 */
export function roadsFor(optic: OpticFacts, tiltDeg = 0, generators: readonly GeneratorSpec[] = GENERATORS): Road[] {
  const rank = (r: Road) => (r.refusal ? 2 : 0) + (r.spec.holds.outline === 'any' ? 1 : 0);
  return generators.map((spec) => ({ spec, refusal: holdRefusal(spec.holds, optic, tiltDeg) })).sort((a, b) => rank(a) - rank(b));
}
