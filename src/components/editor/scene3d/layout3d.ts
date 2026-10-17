/**
 * The 3D view as a function of the design: what goes where, how each part
 * is drawn, and what is labelled. Pure (no three.js, no React), so every
 * rule here is tested in layout3d.test.ts; the scene only draws the result.
 *
 * Frames as in optikit-v2: everything here is in the document frame,
 * millimetres, z up. The scene turns it into three.js's y-up frame with one
 * −90° turn about x, i.e. three = [x, z, −y] (see `toThree`).
 */
import type { CartridgeParams } from '../../../ports/holders';
import { sketchShape, type SketchShape } from '../sketchShapes';
import type { CatalogRecord, FragmentSurface } from '../holders/optic';
import type { Light, LightPath, Point } from '../../../ports/light';
import { layerShow } from '../layers';
import { isLocked, seatOf, type RayColorKey, type Schematic, type SchematicSymbol, type SymbolKind } from '../model';

/* ------------------------------------------------------------------ */
/* Grid and frames                                                     */
/* ------------------------------------------------------------------ */

/** One grid step, mm: cubes are 50 across, layers 55 apart (the extra 5 mm holds plates and puzzle joints). optikit-v2: UC2_GRID_MM. */
export const GRID_MM = { x: 50, y: 50, z: 55 } as const;
export const CUBE_MM = 50;

export type Vec3 = [number, number, number];
export type Axis = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';
/** An axis parts can be moved along. */
export type MoveAxis = 'x' | 'y' | 'z';

/** The centre of a part's cube: a grid step per unit, the cube standing on its layer's floor. */
export function cubeCenter(s: Pick<SchematicSymbol, 'x' | 'y' | 'z'>): Vec3 {
  return [s.x * GRID_MM.x, s.y * GRID_MM.y, s.z * GRID_MM.z + CUBE_MM / 2];
}

/** Document frame (z up) to three.js (y up). optikit-v2: toThree. */
export const toThree = ([x, y, z]: Vec3): Vec3 => [x, z, -y];

/* ------------------------------------------------------------------ */
/* What goes in, what comes out                                        */
/* ------------------------------------------------------------------ */

/** A module's mesh, and where its local z and x point at seat 0 (y = z × x), as optikit-v2's rot24. */
export interface MeshRef {
  url: string;
  axes: { z: Axis; x: Axis };
  /** A holder generated here: drawn from its parameters into the (empty) cube at `url`. */
  holder?: HolderMeshRef;
}

/** A frozen lens cartridge, to draw: its parameters and the lens's record. */
export interface HolderMeshRef {
  params: CartridgeParams;
  record: CatalogRecord;
}

/** A lens or mirror's glass, when known. */
export type GlassFor = (s: SchematicSymbol) => FragmentSurface[] | undefined;

/** The editor's view state the 3D view depends on. */
export interface View3D {
  /** The layer being worked on. */
  layer: number;
  /** The other layers as ghosts (true), or not at all. */
  otherLayers: boolean;
  /** Cube cages around mounted parts. */
  cages: boolean;
  rays: boolean;
  /** Name the parts on the current layer. */
  partLabels: boolean;
  rayLabels: boolean;
  selectedIds: string[];
  /** 2D: seen from the top. Names sit inside their cubes, and parts move across the layer only. */
  fromTop?: boolean;
}

/**
 * How a part is drawn. Its state alone sets it; there is no detail to choose:
 * - `sketch`: an ideal part, the only schematic look: the line art of what
 *   it does, at its true size, from its inputs (`sketch`, sketchShapes.ts);
 * - `optic`: a real part not in a cube: its glass from its prescription
 *   (`glass`), as a solid; its own mesh where it has one; else its glyph;
 * - `solid`: in a cube: the module's meshes, its holder with it;
 * - `placeholder`: in a cube, but its module has no mesh: a plain box;
 * - `ghost`: on another layer: edges only, not clickable.
 */
export type Look = 'sketch' | 'optic' | 'solid' | 'placeholder' | 'ghost';

export interface PlacedPart {
  id: string;
  label: string;
  kind: SymbolKind;
  /** Cube centre, document mm. */
  center: Vec3;
  /** Quarter turns about z (counter-clockwise, as three.js turns): the part's seat, which turns clockwise. */
  turns: number;
  layer: number;
  look: Look;
  /** In a cube; when not, its cube is drawn dashed (PLAN-ONE-PART-MODEL §6). */
  mounted: boolean;
  /** Draw the cube's edges. */
  cage: boolean;
  mesh?: MeshRef;
  /** A lens or mirror not in a cube whose glass is known (designed here, or its catalogue record's): drawn as it is. */
  glass?: FragmentSurface[];
  /** An ideal part's line art, from its inputs. */
  sketch?: SketchShape;
  selected: boolean;
  /** Locked along any axis (shown with a padlock). */
  locked: boolean;
}

export interface PlacedRay {
  id: string;
  label: string;
  color: RayColorKey;
  /** Where the light goes, document mm. */
  points: Vec3[];
  /** Its last run goes into nothing (drawn fading). */
  open: boolean;
  /** From the last part meant that it reached to the one it misses (a dashed hint). */
  miss: [Vec3, Vec3] | null;
  /** On another layer. */
  ghost: boolean;
}

/** A name in the scene. `tone` says how it reads; the scene picks the colours. */
export interface PlacedLabel {
  key: string;
  /** Where it is pinned, document mm: it sits above this point (below it when `below`). */
  at: Vec3;
  text: string;
  tone: 'part' | 'selected' | 'ray' | 'layer';
  /** For ray names: the ray's colour. */
  color?: RayColorKey;
  below?: boolean;
}

/** The current layer's floor, document mm: a rectangle around its parts. */
export interface Floor {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  z: number;
}

export interface Box {
  min: Vec3;
  max: Vec3;
}

export interface Layout3D {
  parts: PlacedPart[];
  rays: PlacedRay[];
  labels: PlacedLabel[];
  floor: Floor | null;
  /** Where the selection's action bar is pinned: under the selection (the space above is the z arrow's); null with nothing selected on this layer. */
  anchor: Vec3 | null;
  /** The move arrows: at the selection's centre, one per axis some selected part may move along; null when none apply. */
  handles: { at: Vec3; axes: MoveAxis[] } | null;
  /** For the camera: everything drawn, and the selection. */
  bounds: { all: Box | null; selection: Box | null };
}

/* ------------------------------------------------------------------ */
/* The rules                                                           */
/* ------------------------------------------------------------------ */

function lookOf(s: SchematicSymbol, onLayer: boolean, mesh: MeshRef | undefined): Look {
  if (!onLayer) return 'ghost';
  if (s.placement.state === 'ideal') return 'sketch';
  if (s.placement.state === 'unmounted') return 'optic';
  return mesh ? 'solid' : 'placeholder';
}

function placePart(s: SchematicSymbol, view: View3D, meshFor: (s: SchematicSymbol) => MeshRef | undefined, glassFor: GlassFor): PlacedPart {
  const onLayer = layerShow(s.z, view.layer, view.otherLayers) === 'current';
  const mounted = s.placement.state === 'in-cube';
  // A part in a cube is its module's meshes; one not in a cube, its own mesh where it has one.
  const mesh = s.placement.state === 'ideal' ? undefined : meshFor(s);
  const look = lookOf(s, onLayer, mounted ? mesh : undefined);
  return {
    id: s.id,
    label: s.label,
    kind: s.kind,
    center: cubeCenter(s),
    turns: -seatOf(s.placement),
    layer: s.z,
    look,
    mounted,
    // A cube is its edges; an optic with no holder shows a dashed one; cages add them to mounted parts. An ideal part has no cube to show.
    cage: look !== 'ghost' && s.placement.state !== 'ideal' && (!mounted || view.cages),
    mesh,
    // A real part's glass, from its prescription; an ideal part's line art, from its inputs.
    glass: look === 'optic' ? glassFor(s) : undefined,
    sketch: look === 'sketch' ? sketchShape(s) : undefined,
    selected: view.selectedIds.includes(s.id),
    locked: Boolean(s.locks && Object.values(s.locks).some(Boolean)),
  };
}

/**
 * How much to enlarge an optic so it stays visible at `pxPerMm` (2D, zoomed
 * out): across its axis to at least `minAcross` pixels, along it (its
 * thickness) to at least `minAlong`. Never smaller than it is.
 */
export function minimumScale(size: { across: number; along: number }, pxPerMm: number, minAcross = 12, minAlong = 3): { across: number; along: number } {
  if (!(pxPerMm > 0)) return { across: 1, along: 1 };
  const grow = (mm: number, min: number) => (mm > 0 ? Math.max(1, min / (mm * pxPerMm)) : 1);
  return { across: grow(size.across, minAcross), along: grow(size.along, minAlong) };
}

/** How far apart paths along the same line are drawn, as a share of the light source's spread: 2.5 mm a step. */
const SIDE_BY_SIDE = 0.25;

/** A light path at the height of its layer's cube centres, in mm. */
function placeRay({ ray, z, points, open }: LightPath, misses: Light['misses'], view: View3D): PlacedRay | null {
  const show = layerShow(z, view.layer, view.otherLayers);
  if (show === 'hidden') return null;
  const at = (p: Point, lift = 0) => cubeCenter({ x: p.x, y: p.y + lift, z });
  const miss = misses.find((m) => m.ray.id === ray.id);
  return {
    id: ray.id,
    label: ray.label,
    color: ray.color,
    // Paths along the same line sit side by side, a few mm apart: inside the optics they pass through, not beside them.
    points: points.map((p) => at(p, ray.offset * SIDE_BY_SIDE)),
    open,
    miss: miss ? [at(miss.from), at(miss.at)] : null,
    ghost: show === 'ghost',
  };
}

/** The box around some parts' cubes, document mm; null for none. */
export function boundsOf(parts: Pick<PlacedPart, 'center'>[]): Box | null {
  if (parts.length === 0) return null;
  const h = CUBE_MM / 2;
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const { center } of parts) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], center[i] - h);
      max[i] = Math.max(max[i], center[i] + h);
    }
  }
  return { min, max };
}

/** The floor under the current layer's parts, with a margin around them. */
function floorOf(layer: number, parts: PlacedPart[]): Floor | null {
  const b = boundsOf(parts.filter((p) => p.layer === layer));
  if (!b) return null;
  const margin = 40;
  return { x0: b.min[0] - margin, y0: b.min[1] - margin, x1: b.max[0] + margin, y1: b.max[1] + margin, z: layer * GRID_MM.z + 0.5 };
}

const middle = (a: Vec3, b: Vec3): Vec3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const above = ([x, y, z]: Vec3, mm: number): Vec3 => [x, y, z + mm];

/**
 * The names: each part on the current layer over its cube (with a lock and
 * "no mesh" where they apply), each ray over its first leg, the layer at its
 * floor's corner. From the top, "over its cube" would be on its optic: there
 * the name sits under the cube, clear of it.
 */
function labelsOf(parts: PlacedPart[], rays: PlacedRay[], floor: Floor | null, view: View3D): PlacedLabel[] {
  const partLabels = parts
    .filter((p) => view.partLabels && p.look !== 'ghost')
    .map((p): PlacedLabel => ({
      key: p.id,
      text: `${p.locked ? '🔒 ' : ''}${p.label}${p.look === 'placeholder' ? ' · no mesh' : ''}`,
      tone: p.selected ? 'selected' : 'part',
      ...(view.fromTop ? { at: [p.center[0], p.center[1] - CUBE_MM / 2, p.center[2]] as Vec3, below: true } : { at: above(p.center, CUBE_MM / 2 + 8) }),
    }));
  const rayLabels = view.rayLabels
    ? rays
        .filter((r) => !r.ghost)
        .map((r): PlacedLabel => ({ key: `ray-${r.id}`, at: above(middle(r.points[0], r.points[1]), 10), text: r.label, tone: 'ray', color: r.color }))
    : [];
  const layerLabel: PlacedLabel[] = floor ? [{ key: 'layer', at: [floor.x1, floor.y0, floor.z], text: `z${view.layer}`, tone: 'layer', below: true }] : [];
  return [...partLabels, ...rayLabels, ...layerLabel];
}

/**
 * Everything the 3D view shows for a design: the parts on the current layer
 * as their states say, the others as ghosts (or left out), the light paths,
 * the names, the current layer's floor, and where the camera and the action
 * bar should look.
 */
export function layout3d(
  schematic: Schematic,
  view: View3D,
  meshFor: (s: SchematicSymbol) => MeshRef | undefined = () => undefined,
  light: Light = { paths: [], misses: [] },
  glassFor: GlassFor = () => undefined,
): Layout3D {
  const parts = schematic.symbols
    .filter((s) => layerShow(s.z, view.layer, view.otherLayers) !== 'hidden')
    .map((s) => placePart(s, view, meshFor, glassFor));
  const rays = view.rays ? light.paths.flatMap((p) => placeRay(p, light.misses, view) ?? []) : [];
  const floor = floorOf(view.layer, parts);

  const selection = boundsOf(parts.filter((p) => p.selected && p.look !== 'ghost'));
  const centre = selection && middle(selection.min, selection.max);
  const anchor: Vec3 | null = centre && selection ? [centre[0], centre[1], selection.min[2]] : null;

  const selectedHere = schematic.symbols.filter((s) => view.selectedIds.includes(s.id) && s.z === view.layer);
  const axes = (view.fromTop ? (['x', 'y'] as const) : (['x', 'y', 'z'] as const)).filter((axis) => selectedHere.some((s) => !isLocked(s, axis)));
  const handles = centre && axes.length ? { at: centre, axes } : null;

  return { parts, rays, labels: labelsOf(parts, rays, floor, view), floor, anchor, handles, bounds: { all: boundsOf(parts), selection } };
}
