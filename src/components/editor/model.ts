/**
 * Schematic data model for the editor stories. Coordinates are in grid units
 * (1 unit = 1 cube), x to the right, y up, z = layer.
 */

import type { FragmentSurface } from './holders/optic';

export type SymbolKind = 'laser' | 'mirror' | 'dichroic' | 'lens' | 'objective' | 'camera';

/** Quarter turns of a part in its cube: 0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°. */
export type Seat = 0 | 1 | 2 | 3;

/**
 * Where a part physically sits (UI-V4 §1.2), from a sketch to a cube:
 *
 *   ideal ──snap──▶ unmounted ──freeze / realize──▶ in a cube
 *     └────────────realize─────────────────────────────▲
 *
 * An ideal part is an optic by its specification only (a lens of f = 50,
 * Ø 25): it sits where it is drawn and traces as an ideal element, but is
 * no part yet (optikit-v2 WP-376). Snapping chooses a catalogue part for it;
 * realize, freeze and unbind work as before.
 */
export type Placement =
  /** Sketched: a specification at a place, no part chosen yet. */
  | { state: 'ideal' }
  /** Housed in a cube on the grid: an existing module, or a holder frozen for it (`holder`: how it was generated). */
  | { state: 'in-cube'; module: string; source: string; version?: string; seat: Seat; frozen?: boolean; holder?: HolderSpec }
  /** An optic placed freely, with no holder yet. */
  | { state: 'unmounted'; part: string; source: string };

/**
 * How a frozen holder was generated: the generator and its parameters, as
 * optikit-v2 keeps them beside a published holder (`generator.json`), so the
 * service can build the same parts again.
 */
export interface HolderSpec {
  /** The generator's script name, e.g. `lens_cartridge_v4`. */
  generator: string;
  params: Record<string, unknown>;
}

export const isMounted = (s: { placement: Placement }) => s.placement.state === 'in-cube';
export const isIdeal = (s: { placement: Placement }) => s.placement.state === 'ideal';

/** An existing module a part can be realized as. */
export interface ModuleOption {
  module: string;
  source: string;
  version?: string;
  /** Inputs the module fixes, by label: a lens holder's focal length. */
  fixes?: Readonly<Record<string, number>>;
}

/** The name the part has in the catalogue: its module, or the optic on its own; an ideal part has none. */
export const catalogueName = (p: Placement) => (p.state === 'in-cube' ? p.module : p.state === 'unmounted' ? p.part : '');

/**
 * Realize: swap the part for an existing module, in its cube (a part already in a cube keeps its seat).
 * The part takes the inputs the module fixes, and its name and type follow the module unless they were changed.
 */
export function realize(s: Pick<SchematicSymbol, 'label' | 'type' | 'placement' | 'inputs'>, option: ModuleOption): Partial<SchematicSymbol> {
  const { fixes, ...module } = option;
  const old = catalogueName(s.placement);
  const seat = s.placement.state === 'in-cube' ? s.placement.seat : 0;
  return {
    placement: { state: 'in-cube', ...module, seat },
    ...(s.label === old && { label: option.module }),
    ...(s.type === old && { type: option.module }),
    ...(fixes && s.inputs && { inputs: s.inputs.map((i) => (i.label in fixes ? { ...i, value: fixes[i.label] } : i)) }),
  };
}

/** Where the part's inputs differ from what its module fixes: a lens set to f = 100 in an f = 50 holder. */
export function holderMismatch(s: Pick<SchematicSymbol, 'placement' | 'inputs'>, options: ModuleOption[]) {
  const p = s.placement;
  const fixes = p.state === 'in-cube' ? options.find((o) => o.module === p.module)?.fixes : undefined;
  if (!fixes) return null;
  const off = (s.inputs ?? []).filter((i) => i.label in fixes && i.value !== fixes[i.label]);
  if (!off.length) return null;
  // The module that fixes the inputs as the part has them, when there is one.
  const fits = options.find((o) => o.fixes && Object.entries(o.fixes).every(([label, v]) => s.inputs?.find((i) => i.label === label)?.value === v));
  return { inputs: off.map((i) => ({ label: i.label, unit: i.unit, part: i.value, module: fixes[i.label] })), fits };
}

/** Freeze: generate a holder for an unmounted optic, here; `holder`: as designed in the close-up. A frozen holder takes a new design. */
export const frozen = (p: Placement, holder?: HolderSpec): Placement =>
  p.state === 'unmounted'
    ? { state: 'in-cube', module: `Holder for ${p.part}`, source: 'Generated here', seat: 0, frozen: true, ...(holder && { holder }) }
    : p.state === 'in-cube' && p.frozen && holder
      ? { ...p, holder }
      : p;

/** The catalogue part a holder is for: the optic of an unmounted part or of a frozen holder; none for a module. */
export const holderPart = (p: Placement): string | undefined =>
  p.state === 'unmounted' ? p.part : p.state === 'in-cube' && p.frozen ? p.module.replace(/^Holder for /, '') : undefined;

/**
 * Snap: an ideal part becomes the catalogue part chosen for it, still with no
 * holder. Its inputs take the part's own values (the focal length it really
 * has), so the light is traced through what will be built.
 */
export function snapped(s: Pick<SchematicSymbol, 'placement' | 'inputs'> & { label?: string }, part: string, source: string, values: Readonly<Record<string, number>> = {}): Partial<SchematicSymbol> {
  if (s.placement.state !== 'ideal') return {};
  return {
    placement: { state: 'unmounted', part, source },
    prescription: undefined,
    // Still called as the sketch named it ("Ideal lens"): now it has a name of its own.
    ...(s.label?.startsWith('Ideal ') && { label: part }),
    ...(s.inputs && { inputs: s.inputs.map((i) => (i.label in values ? { ...i, value: values[i.label] } : i)) }),
  };
}

/** Short names for the inputs that specify an ideal part. */
const SPEC_NAMES: Readonly<Record<string, string>> = { 'Focal length': 'f =', Diameter: 'Ø', Wavelength: 'λ =', 'Numerical aperture': 'NA', Magnification: '' };

/** What an ideal part is, in a line: "f = 50 mm · Ø 25 mm". */
export const specLine = (s: Pick<SchematicSymbol, 'inputs'>) =>
  (s.inputs ?? [])
    .filter((i) => i.label in SPEC_NAMES)
    .map((i) => (i.unit === 'NA' ? `NA ${i.value}` : `${SPEC_NAMES[i.label]} ${i.value}${i.unit === '×' ? '×' : ` ${i.unit}`}`.trim()))
    .join(' · ');

/** Where a designed optic comes from, in the catalogue's place. */
export const DESIGNED_HERE = 'Designed here';

/**
 * Design it: an ideal part becomes a real optic designed here, from its
 * prescription; its inputs follow from it.
 */
export function designed(s: Pick<SchematicSymbol, 'placement' | 'inputs' | 'kind'>, prescription: FragmentSurface[], values: Readonly<Record<string, number>>): Partial<SchematicSymbol> {
  if (s.placement.state === 'in-cube') return {};
  return {
    placement: { state: 'unmounted', part: s.kind === 'mirror' ? 'Designed mirror' : 'Designed lens', source: DESIGNED_HERE },
    prescription,
    ...(s.inputs && { inputs: s.inputs.map((i) => (i.label in values ? { ...i, value: values[i.label] } : i)) }),
  };
}

/** Back to the sketch: a catalogue part no holder holds yet goes back to its specification. */
export const sketched = (p: Placement): Placement => (p.state === 'unmounted' ? { state: 'ideal' } : p);

/** Unbind: take the optic out of its cube; a frozen holder goes away. */
export const unbound = (s: { label: string; placement: Placement }): Placement => {
  const p = s.placement;
  if (p.state !== 'in-cube') return p;
  return p.frozen
    ? { state: 'unmounted', part: p.module.replace(/^Holder for /, ''), source: 'Holder removed' }
    : { state: 'unmounted', part: s.label, source: `Taken out of ${p.module}` };
};

/** One numeric, kind-specific input of a part, shown as a slider (e.g. cut-on wavelength). */
export interface SymbolParam {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
}

export interface SchematicSymbol {
  id: string;
  label: string;
  kind: SymbolKind;
  /** Human-readable type, e.g. "dichroic + filters". */
  type: string;
  group?: string;
  x: number;
  y: number;
  z: number;
  placement: Placement;
  /** The part's inputs, each a slider in the inspector. */
  inputs?: SymbolParam[];
  /**
   * A lens or mirror designed here: its surfaces (Optiland's form, as a
   * library record's `optics.fragment.surfaces`). Its inputs follow from it.
   */
  prescription?: FragmentSurface[];
  /** Axes the part may not move along (and `turn`: its seat stays). */
  locks?: Partial<Record<Lock, boolean>>;
  notes: string;
}

export type Lock = 'x' | 'y' | 'z' | 'turn';

export const isLocked = (s: { locks?: SchematicSymbol['locks'] }, lock: Lock) => Boolean(s.locks?.[lock]);

/** Where a part ends up moved by `d` (grid units, y up), staying put along its locked axes. */
export function shifted(s: SchematicSymbol, d: { x?: number; y?: number; z?: number }) {
  const tenth = (v: number) => Math.round(v * 10) / 10;
  return {
    x: isLocked(s, 'x') ? s.x : tenth(s.x + (d.x ?? 0)),
    y: isLocked(s, 'y') ? s.y : tenth(s.y + (d.y ?? 0)),
    z: isLocked(s, 'z') ? s.z : Math.max(0, s.z + (d.z ?? 0)),
  };
}

/** A part move: by how much (grid units, z in layers), and whether copies go there instead. */
export interface Move {
  ids: string[];
  by: { x?: number; y?: number; z?: number };
  copy: boolean;
}

/**
 * The design as it looks while parts are being dragged (2D and 3D): the
 * parts moved along their free axes, or, for a copy, left where they are
 * with their copies (ids `<id>-copy`) at the new spot.
 */
export function withMove(schematic: Schematic, { ids, by, copy }: Move): Schematic {
  return {
    ...schematic,
    symbols: schematic.symbols.flatMap((s) => {
      if (!ids.includes(s.id)) return [s];
      const moved = { ...s, ...shifted(s, by) };
      return copy ? [s, { ...moved, id: `${s.id}-copy` }] : [moved];
    }),
  };
}

export interface SchematicGroup {
  id: string;
  label: string;
}

export type RayColorKey = 'ray1' | 'ray2' | 'ray3' | 'ray4' | 'ray5' | 'ray6';

/**
 * A light path: where the light starts and the parts it is meant to go
 * through, in order. Where it actually goes comes from the app's light source (light.ts).
 */
export interface SchematicRay {
  id: string;
  label: string;
  color: RayColorKey;
  /** Part ids, or 'sample' for the sample in front of the objective; the first is where the light starts. */
  path: string[];
  /** Offset (grid units, y up) so parallel rays sit side by side. */
  offset: number;
  /** Which leg of the traced light carries the direction arrow. */
  arrowSegment: number;
  /** The traced point near which the label sits. */
  labelAt: number;
}

export interface Schematic {
  symbols: SchematicSymbol[];
  groups: SchematicGroup[];
  rays: SchematicRay[];
  /** Grid pitch: one unit in mm. */
  unitMm: number;
}

/** Local bounding box of each glyph around its anchor (x, y down, in grid units). */
export const GLYPH_BOUNDS: Record<SymbolKind, { x: number; y: number; w: number; h: number }> = {
  laser: { x: -2.5, y: -0.75, w: 2.7, h: 1.5 },
  mirror: { x: -0.85, y: -0.85, w: 1.7, h: 1.7 },
  dichroic: { x: -1.25, y: -0.85, w: 2.1, h: 2.1 },
  lens: { x: -0.45, y: -1.25, w: 0.9, h: 2.5 },
  objective: { x: -0.45, y: -1.25, w: 0.9, h: 2.5 },
  camera: { x: -2.35, y: -0.95, w: 2.45, h: 1.9 },
};

/** The sample sits this far (grid units) in front of the objective. */
export const SAMPLE_OFFSET = 4.5;

/** The way a part faces (a source shines, an objective looks): +x turned by its seat, a quarter turn clockwise each, seen from above. */
export function facing(s: SchematicSymbol): { x: number; y: number } {
  const seat = s.placement.state === 'in-cube' ? s.placement.seat : 0;
  return [
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
  ][seat];
}

/** The sample: in front of the objective, where it looks. */
export function samplePoint(objective: SchematicSymbol) {
  const f = facing(objective);
  return { x: objective.x + f.x * SAMPLE_OFFSET, y: objective.y + f.y * SAMPLE_OFFSET };
}

export function symbolBounds(s: Pick<SchematicSymbol, 'kind' | 'x' | 'y'>) {
  const b = GLYPH_BOUNDS[s.kind];
  return { x: s.x + b.x, y: -s.y + b.y, w: b.w, h: b.h };
}
