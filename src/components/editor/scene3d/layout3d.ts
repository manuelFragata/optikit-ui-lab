/**
 * The 3D view as a function of the design: what goes where, how each part
 * is drawn, and what is labelled. Pure (no three.js, no React), so every
 * rule here is tested in layout3d.test.ts; the scene only draws the result.
 *
 * Frames as in optikit-v2: everything here is in the document frame,
 * millimetres, z up. The scene turns it into three.js's y-up frame with one
 * −90° turn about x, i.e. three = [x, z, −y] (see `toThree`).
 */
import { layerShow, layerShowOfAny } from '../layers';
import { isLocked, SAMPLE_OFFSET, type RayColorKey, type Schematic, type SchematicSymbol, type SymbolKind } from '../model';

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
}

/** How much the 3D view draws (UI-V4 §1.3, the fidelity dial). Editor state only. */
export type Fidelity = 'symbols' | 'cubes' | 'solids';

/** The editor's view state the 3D view depends on. */
export interface View3D {
  /** The layer being worked on. */
  layer: number;
  /** The other layers as ghosts (true), or not at all. */
  otherLayers: boolean;
  fidelity: Fidelity;
  /** Cube cages around mounted parts. */
  cages: boolean;
  rays: boolean;
  /** Name the parts on the current layer. */
  partLabels: boolean;
  rayLabels: boolean;
  selectedIds: string[];
}

/**
 * How a part is drawn:
 * - `symbol`: the optic as a small 3D glyph;
 * - `cube`: a translucent cube with the glyph inside;
 * - `solid`: the module's real mesh;
 * - `placeholder`: in a cube, but its module has no mesh: a plain box;
 * - `ghost`: on another layer: edges only, not clickable.
 */
export type Look = 'symbol' | 'cube' | 'solid' | 'placeholder' | 'ghost';

export interface PlacedPart {
  id: string;
  label: string;
  kind: SymbolKind;
  /** Cube centre, document mm. */
  center: Vec3;
  /** Quarter turns about z: the part's seat. */
  turns: number;
  layer: number;
  look: Look;
  /** In a cube; when not, its cube is drawn dashed (PLAN-ONE-PART-MODEL §6). */
  mounted: boolean;
  /** Draw the cube's edges. */
  cage: boolean;
  mesh?: MeshRef;
  selected: boolean;
  /** Locked along any axis (shown with a padlock). */
  locked: boolean;
}

export interface PlacedRay {
  id: string;
  label: string;
  color: RayColorKey;
  /** Through the parts' centres, document mm. */
  points: Vec3[];
  /** Touches no part on the current layer. */
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

function lookOf(s: SchematicSymbol, onLayer: boolean, fidelity: Fidelity, mesh: MeshRef | undefined): Look {
  if (!onLayer) return 'ghost';
  if (fidelity === 'symbols') return 'symbol';
  if (fidelity === 'cubes') return 'cube';
  // Solids: the real module where there is one. An unmounted optic has no holder, so it stays a glyph (in a dashed cube).
  if (s.placement.state !== 'in-cube') return 'symbol';
  return mesh ? 'solid' : 'placeholder';
}

function placePart(s: SchematicSymbol, view: View3D, meshFor: (s: SchematicSymbol) => MeshRef | undefined): PlacedPart {
  const onLayer = layerShow(s.z, view.layer, view.otherLayers) === 'current';
  const mounted = s.placement.state === 'in-cube';
  const mesh = mounted ? meshFor(s) : undefined;
  const look = lookOf(s, onLayer, view.fidelity, mesh);
  return {
    id: s.id,
    label: s.label,
    kind: s.kind,
    center: cubeCenter(s),
    turns: s.placement.state === 'in-cube' ? s.placement.seat : 0,
    layer: s.z,
    look,
    mounted,
    // A cube is its edges; an optic with no holder shows a dashed one; cages add them to mounted parts.
    cage: look !== 'ghost' && (look === 'cube' || !mounted || view.cages),
    mesh,
    selected: view.selectedIds.includes(s.id),
    locked: Boolean(s.locks && Object.values(s.locks).some(Boolean)),
  };
}

/** A light path through the centres of the parts it names; the sample sits a little past the objective. */
function placeRay(ray: Schematic['rays'][number], byId: Map<string, SchematicSymbol>, view: View3D): PlacedRay | null {
  const objective = [...byId.values()].find((s) => s.kind === 'objective');
  const lift = ray.offset * GRID_MM.y;
  const points = ray.path.flatMap((id): Vec3[] => {
    const s = id === 'sample' ? objective : byId.get(id);
    if (!s) return [];
    const [x, y, z] = cubeCenter(s);
    return [[id === 'sample' ? x + SAMPLE_OFFSET * GRID_MM.x : x, y + lift, z]];
  });
  const show = layerShowOfAny(
    ray.path.filter((id) => id !== 'sample').map((id) => byId.get(id)?.z),
    view.layer,
    view.otherLayers,
  );
  if (points.length < 2 || show === 'hidden') return null;
  return { id: ray.id, label: ray.label, color: ray.color, points, ghost: show === 'ghost' };
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
 * floor's corner.
 */
function labelsOf(parts: PlacedPart[], rays: PlacedRay[], floor: Floor | null, view: View3D): PlacedLabel[] {
  const partLabels = parts
    .filter((p) => view.partLabels && p.look !== 'ghost')
    .map((p): PlacedLabel => ({
      key: p.id,
      at: above(p.center, CUBE_MM / 2 + 8),
      text: `${p.locked ? '🔒 ' : ''}${p.label}${p.look === 'placeholder' ? ' · no mesh' : ''}`,
      tone: p.selected ? 'selected' : 'part',
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
 * as the fidelity says, the others as ghosts (or left out), the light paths,
 * the names, the current layer's floor, and where the camera and the action
 * bar should look.
 */
export function layout3d(schematic: Schematic, view: View3D, meshFor: (s: SchematicSymbol) => MeshRef | undefined = () => undefined): Layout3D {
  const parts = schematic.symbols
    .filter((s) => layerShow(s.z, view.layer, view.otherLayers) !== 'hidden')
    .map((s) => placePart(s, view, meshFor));
  const byId = new Map(schematic.symbols.map((s) => [s.id, s]));
  const rays = view.rays ? schematic.rays.flatMap((r) => placeRay(r, byId, view) ?? []) : [];
  const floor = floorOf(view.layer, parts);

  const selection = boundsOf(parts.filter((p) => p.selected && p.look !== 'ghost'));
  const centre = selection && middle(selection.min, selection.max);
  const anchor: Vec3 | null = centre && selection ? [centre[0], centre[1], selection.min[2]] : null;

  const selectedHere = schematic.symbols.filter((s) => view.selectedIds.includes(s.id) && s.z === view.layer);
  const axes = (['x', 'y', 'z'] as const).filter((axis) => selectedHere.some((s) => !isLocked(s, axis)));
  const handles = centre && axes.length ? { at: centre, axes } : null;

  return { parts, rays, labels: labelsOf(parts, rays, floor, view), floor, anchor, handles, bounds: { all: boundsOf(parts), selection } };
}
