/**
 * The beam table: one of the design's light paths as the parts it meets, in
 * ray order, unfolded onto one axis (mm along the light from where it
 * starts), each with what it does to the light and the optics it does it
 * with. The same list a tracer works through. Pure.
 *
 * Where the design does not say, the beam says what it assumed, so the
 * Simulate tab can show it: an objective's focal length from its
 * magnification on a 180 mm tube lens; a mirror or plate an inch across.
 */
import { focalLength } from '../holders/designs';
import { opticFacts, type CatalogRecord, type FragmentSurface } from '../holders/optic';
import type { LightPath, Point } from '../light';
import { isLocked, type Placement, type Schematic, type SchematicSymbol, type SymbolKind } from '../model';

/** The tube lens an objective's magnification is stated for (Nikon, Leica, Mitutoyo, openUC2's FRAME). */
export const TUBE_LENS_MM = 180;
/** An optic whose size the design does not give: one inch. */
export const INCH_MM = 25.4;
/** A laser's beam Ø when nothing says otherwise: a typical diode module's. */
export const DEFAULT_BEAM_MM = 2;

export type BeamRole = 'source' | 'sample' | 'lens' | 'objective' | 'mirror' | 'plate' | 'detector' | 'other';

export interface BeamElement {
  id: string;
  label: string;
  kind: SymbolKind | 'sample';
  role: BeamRole;
  /** Along the unfolded beam from its start, mm. */
  atMm: number;
  /** The light changes direction here (a mirror, a dichroic that turns it). */
  turns: boolean;
  /** Its power as a thin lens, mm; `null` for none. A part with `surfaces` is traced through them instead. */
  focalMm: number | null;
  surfaces?: FragmentSurface[];
  record?: CatalogRecord;
  /** Clear Ø, mm, and where that comes from. */
  apertureMm: number | null;
  /** What the beam assumed for this part, in words; empty when the design says it all. */
  assumed: string[];
  state: Placement['state'] | null;
  /** The direction the light arrives from (grid, unit), for moving the part along it. */
  axis: Point | null;
  /** May not move along the beam: locked along that axis, or a part that turns the light (moving it moves everything after). */
  fixed: boolean;
  /** A frozen lens cartridge's offset of the lens along the beam, mm (the holder's `part_position_mm.z`). */
  holderOffsetMm: number;
  symbol?: SchematicSymbol;
}

export interface Beam {
  ray: LightPath['ray'];
  elements: BeamElement[];
  /** Where the path ends, mm: at its last part, or where it runs out. */
  endMm: number;
  /** It runs out into nothing. */
  open: boolean;
  /** The source's wavelength, nm (emission: the dichroic's emission band, when it states one). */
  wavelengthNm: number | null;
  /** The source's power, mW. */
  powerMw: number | null;
  emission: boolean;
}

const inputOf = (s: SchematicSymbol | undefined, label: string) => s?.inputs?.find((i) => i.label === label)?.value;
const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** An objective's focal length: the tube lens over its magnification. */
export const objectiveFocal = (s: SchematicSymbol) => TUBE_LENS_MM / (inputOf(s, 'Magnification') ?? 10);

function holderOffset(s: SchematicSymbol): number {
  if (s.placement.state !== 'in-cube' || s.placement.holder?.generator !== 'lens_cartridge_v4') return 0;
  const p = s.placement.holder.params as { part_position_mm?: { z?: number } };
  return p.part_position_mm?.z ?? 0;
}

function element(id: string, atMm: number, s: SchematicSymbol | undefined, axis: Point | null, turns: boolean, recordFor: (s: SchematicSymbol) => CatalogRecord | undefined): BeamElement {
  const base = { id, atMm, turns, axis, assumed: [] as string[], state: s?.placement.state ?? null, symbol: s, holderOffsetMm: s ? holderOffset(s) : 0 };
  if (!s) return { ...base, label: 'Sample', kind: 'sample', role: 'sample', focalMm: null, apertureMm: null, fixed: true };
  const record = recordFor(s);
  const across = record ? opticFacts(record).acrossMm : inputOf(s, 'Diameter');
  const lockedAlong = axis ? isLocked(s, axis.x !== 0 ? 'x' : 'y') : true;
  const common = { ...base, label: s.label, kind: s.kind, record, fixed: lockedAlong || turns };
  switch (s.kind) {
    case 'laser':
      return { ...common, role: 'source', focalMm: null, apertureMm: null, fixed: true };
    case 'camera':
      return { ...common, role: 'detector', focalMm: null, apertureMm: null };
    case 'lens': {
      const surfaces = record?.fragmentSurfaces;
      const traced = surfaces && surfaces.length >= 2 ? surfaces : undefined;
      const f = traced ? focalLength(traced) : (inputOf(s, 'Focal length') ?? null);
      const aperture = record?.clearApertureMm ?? across ?? INCH_MM;
      return {
        ...common,
        role: 'lens',
        focalMm: f,
        surfaces: traced,
        apertureMm: aperture,
        assumed: [...(!traced ? ['an ideal thin lens'] : []), ...(across === undefined && !record ? ['one inch across'] : [])],
      };
    }
    case 'objective': {
      const f = objectiveFocal(s);
      const na = inputOf(s, 'Numerical aperture') ?? 0.25;
      return {
        ...common,
        role: 'objective',
        focalMm: f,
        apertureMm: 2 * na * f,
        assumed: [`f = ${f.toFixed(1)} mm: its ${inputOf(s, 'Magnification') ?? 10}× on a ${TUBE_LENS_MM} mm tube lens`, 'an ideal thin lens'],
      };
    }
    case 'mirror': {
      const curved = record && record.fragmentSurfaces[0]?.is_reflective ? focalLength(record.fragmentSurfaces) : null;
      return { ...common, role: 'mirror', focalMm: curved, apertureMm: across ?? INCH_MM, assumed: across === undefined ? ['one inch across'] : [] };
    }
    case 'dichroic':
      return { ...common, role: 'plate', focalMm: null, apertureMm: across ?? INCH_MM, assumed: ['a thin plate', ...(across === undefined ? ['one inch across'] : [])] };
    default:
      return { ...common, role: 'other', focalMm: null, apertureMm: null };
  }
}

/**
 * A light path as the beam table: its parts in order, unfolded. `null` when
 * the light source does not say which parts the path meets.
 */
export function beamOf(design: Schematic, path: LightPath, recordFor: (s: SchematicSymbol) => CatalogRecord | undefined): Beam | null {
  const parts = path.parts;
  if (!parts || parts.length === 0) return null;
  const byId = new Map(design.symbols.map((s) => [s.id, s]));
  const unit = design.unitMm;
  const elements: BeamElement[] = [];
  let along = 0;
  parts.forEach((id, i) => {
    if (i > 0) along += dist(path.points[i - 1], path.points[i]) * unit;
    const s = id === 'sample' ? undefined : byId.get(id);
    if (id !== 'sample' && !s) return;
    const prev = path.points[i - 1];
    const here = path.points[i];
    const next = path.points[i + 1];
    const axis = prev ? { x: Math.sign(here.x - prev.x), y: Math.sign(here.y - prev.y) } : null;
    const out = next ? { x: Math.sign(next.x - here.x), y: Math.sign(next.y - here.y) } : axis;
    const turns = Boolean(axis && out && (axis.x !== out.x || axis.y !== out.y));
    const e = element(id, along, s, axis, turns, recordFor);
    elements.push({ ...e, atMm: along + e.holderOffsetMm });
  });
  const last = path.points.length - 1;
  const endMm = path.open ? along + dist(path.points[last - 1], path.points[last]) * unit : along;

  // The sample sits at the objective's focus, wherever the drawing puts it (its symbol is not to scale):
  // in front of it for the emission, behind it for the light sent onto the sample.
  const emission = parts[0] === 'sample';
  const objective = elements.find((e) => e.role === 'objective');
  let end = endMm;
  if (objective?.focalMm) {
    if (emission) elements[0] = { ...elements[0], atMm: objective.atMm - objective.focalMm, assumed: ['at the objective’s focus'] };
    const last = elements.length - 1;
    if (!emission && elements[last].role === 'sample') {
      elements[last] = { ...elements[last], atMm: objective.atMm + objective.focalMm, assumed: ['at the objective’s focus'] };
      end = elements[last].atMm;
    }
  }
  // Measured from where the light starts.
  const zero = elements[0].atMm;
  const source = elements[0].symbol;
  const dichroic = elements.find((e) => e.kind === 'dichroic')?.symbol;
  return {
    ray: path.ray,
    elements: elements.map((e) => ({ ...e, atMm: e.atMm - zero })),
    endMm: end - zero,
    open: path.open,
    emission,
    wavelengthNm: emission ? (inputOf(dichroic, 'Emission band') ?? null) : (inputOf(source, 'Wavelength') ?? null),
    powerMw: emission ? null : (inputOf(source, 'Power') ?? null),
  };
}

/** The parts the optimizer may move: lenses and objectives the light passes straight through, not locked along it. */
export const movable = (beam: Beam) => beam.elements.filter((e) => (e.role === 'lens' || e.role === 'objective') && !e.fixed && e.symbol);

/** Where light is read: a detector, the sample, or where a path runs out; the light reaching it is that path's. */
export interface Target {
  key: string;
  beam: Beam;
  /** The part it is at, or 'end'. */
  part: string;
  label: string;
}

/**
 * The design's detectors, each with the light that reaches it: what the
 * analyses and the optimizer are read at. Picking one picks the light; no
 * path is chosen on its own.
 */
export function targetsOf(beams: Beam[]): Target[] {
  // Cameras and other detectors first, then the sample, then where light runs out.
  const rank = (t: Target) => (t.part === 'end' ? 2 : t.label === 'Sample' && t.part === 'sample' ? 1 : 0);
  return beams
    .flatMap((beam): Target[] => {
      const detectors = beam.elements.filter((e) => e.role === 'detector');
      const last = beam.elements[beam.elements.length - 1];
      const ends = detectors.length
        ? detectors.map((e) => ({ part: e.id, label: e.label }))
        : last.role === 'sample' && beam.elements.length > 1
          ? [{ part: last.id, label: 'Sample' }]
          : [{ part: 'end', label: `End of ${beam.ray.label}` }];
      return ends.map((t) => ({ ...t, key: `${beam.ray.id}:${t.part}`, beam }));
    })
    .sort((a, b) => rank(a) - rank(b));
}
