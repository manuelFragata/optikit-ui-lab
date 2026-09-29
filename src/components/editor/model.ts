/**
 * Schematic data model for the editor stories. Coordinates are in grid units
 * (1 unit = 1 cube), x to the right, y up, z = layer.
 */

export type SymbolKind = 'laser' | 'mirror' | 'dichroic' | 'lens' | 'objective' | 'camera';

/** Quarter turns of a part in its cube: 0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°. */
export type Seat = 0 | 1 | 2 | 3;

/**
 * Where a part physically sits (UI-V4 §1.2). Every part is in one of two
 * states; realize, freeze and unbind move it between them.
 */
export type Placement =
  /** Housed in a cube on the grid: an existing module, or a holder frozen for it. */
  | { state: 'in-cube'; module: string; source: string; version?: string; seat: Seat; frozen?: boolean }
  /** An optic placed freely, with no holder yet. */
  | { state: 'unmounted'; part: string; source: string };

export const isMounted = (s: { placement: Placement }) => s.placement.state === 'in-cube';

/** One numeric, kind-specific parameter shown in the inspector (e.g. cut-on wavelength). */
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
  param?: SymbolParam;
  notes: string;
}

export interface SchematicGroup {
  id: string;
  label: string;
}

export type RayColorKey = 'ray1' | 'ray2' | 'ray3' | 'ray4' | 'ray5' | 'ray6';

export interface SchematicRay {
  id: string;
  label: string;
  color: RayColorKey;
  /** Symbol ids, or 'sample' for the sample plane after the last objective. */
  path: string[];
  /** Offset (grid units, y up) so parallel rays sit side by side. */
  offset: number;
  /** Segment index that carries the direction arrow. */
  arrowSegment: number;
  /** Point index near which the label sits. */
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

/** The sample plane sits this far (grid units) after the objective. */
export const SAMPLE_OFFSET = 4.5;

export function symbolBounds(s: SchematicSymbol) {
  const b = GLYPH_BOUNDS[s.kind];
  return { x: s.x + b.x, y: -s.y + b.y, w: b.w, h: b.h };
}

/** Screen-space points (y down) of a ray, skipping symbols that no longer exist. */
export function rayPoints(ray: SchematicRay, symbols: SchematicSymbol[]): { x: number; y: number }[] {
  const objective = symbols.find((s) => s.kind === 'objective');
  return ray.path.flatMap((id) => {
    if (id === 'sample') return objective ? [{ x: objective.x + SAMPLE_OFFSET, y: -(objective.y + ray.offset) }] : [];
    const s = symbols.find((sym) => sym.id === id);
    return s ? [{ x: s.x, y: -(s.y + ray.offset) }] : [];
  });
}
