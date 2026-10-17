/**
 * How an ideal part is drawn: line art at its true size, from its own inputs.
 * An ideal part is what its numbers say and nothing more (no glass, no
 * radii), so it is drawn as the textbook symbol of what it does:
 *
 * - a lens: a line as long as its Ø, arrow heads out for a positive f, in for a negative one (a paraxial thin lens);
 * - a mirror: an arc as wide as its Ø, curved for its f (flat at f = 0), hatched behind;
 * - a filter, a dichroic, a beam splitter: a thin plate of its Ø, tinted by the wavelength it works at;
 * - a source: its body, and the beam it sends at its waist Ø and divergence,
 *   with a cone of its light's colour;
 * - a camera, an objective, an aperture: their outlines.
 *
 * Seen from the top (2D) that is all. In 3D a source, a camera and an
 * objective also have a body (`solids`): plain see-through boxes and
 * cylinders, so they stand on the bench and are not flat drawings.
 *
 * In the part's own frame: mm, the light along +x, y across it, before the
 * seat turns it and before a 45° part is laid at 45° (`at45`). Pure.
 */
import { liesAt45 } from './holders/designs';
import { divergenceRad, sourceDiameterMm, type SchematicSymbol, type SymbolKind } from './model';
import { nmColor } from './optics/nmColor';

export type Pt = [number, number];

export interface SketchLine {
  points: Pt[];
  /** Closed: the last point joins the first, and `fill` fills it. */
  closed?: boolean;
  fill?: string;
  dashed?: boolean;
  /** Drawn thinner and fainter: hatching, a beam. */
  faint?: boolean;
}

/** A body of the part, in 3D: a box, a cylinder or a dome along the light (x), centred on it. */
export type SketchSolid =
  | { kind: 'box'; x: [number, number]; half: [number, number] }
  | { kind: 'cylinder'; x: [number, number]; r: number }
  | { kind: 'dome'; x: number; r: number; depth: number };

/** The light a source sends: a cone along x from `x`, `r0` across where it leaves, `r1` at `length` on. */
export interface SketchCone {
  x: number;
  r0: number;
  r1: number;
  length: number;
  color: string;
}

export interface SketchShape {
  lines: SketchLine[];
  solids?: SketchSolid[];
  cone?: SketchCone;
  /** Lies at 45° in its cube (a mirror, a dichroic, a splitter). */
  at45: boolean;
  /** Half its Ø, mm: the 3D view draws its aperture as a ring of this size. 0: no aperture. */
  apertureMm: number;
  /** Where a lens's foci are along the light, mm; shown when it is selected. (A curved mirror shows its f by its curve.) */
  foci: number[];
  /** Its extent across and along the light, mm: for the least size on screen. */
  size: { across: number; along: number };
}

/** A part's Ø when its inputs give none: one inch. */
export const SKETCH_DIAMETER_MM = 25.4;
/** A sketched plate's thickness, mm. */
const PLATE_MM = 2;
/** How far a source's beam is drawn out of it, mm. */
const BEAM_DRAWN_MM = 18;
/** The light cone of a source opens at least this much over its length, mm: a laser's mrad would not show at all. */
const CONE_FLARE_MM = 2.5;
/** The objective's tube lens, as the analysis takes it. */
const TUBE_LENS_MM = 180;

const inputOf = (s: Pick<SchematicSymbol, 'inputs'>, label: string) => s.inputs?.find((i) => i.label === label)?.value;

const rect = (x0: number, x1: number, y0: number, y1: number, extra: Partial<SketchLine> = {}): SketchLine => ({
  points: [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ],
  closed: true,
  ...extra,
});

/** A thin lens's symbol: its line, and arrow heads out (f > 0) or in (f < 0). */
function thinLens(r: number, f: number): SketchLine[] {
  const a = Math.min(3, r * 0.35);
  const tip = (y: number, s: number): SketchLine => ({ points: [[-a, y - s * a], [0, y], [a, y - s * a]] });
  const out = f >= 0 ? 1 : -1;
  return [{ points: [[0, -r], [0, r]] }, tip(r, out), tip(-r, -out)];
}

/** A mirror's face: an arc of radius 2f, concave toward the light for f > 0; hatched behind. */
function mirror(r: number, f: number): SketchLine[] {
  const sag = (y: number) => (f ? -(y * y) / (4 * f) : 0);
  const n = 24;
  const face: Pt[] = Array.from({ length: n + 1 }, (_, k) => {
    const y = -r + (2 * r * k) / n;
    return [sag(y), y];
  });
  const hatch: SketchLine[] = [];
  const step = Math.max(2.5, r / 5);
  for (let y = -r + step / 2; y < r; y += step) hatch.push({ points: [[sag(y), y], [sag(y) + 2.5, y + 2.5]], faint: true });
  return [{ points: face }, ...hatch];
}

/**
 * A source: its body, a nozzle (a laser) or a dome (an LED), and its beam: Ø
 * `d` where it leaves, opening by `div` (full angle), in its light's colour.
 */
function source(d: number, div: number, led: boolean, color: string): Pick<SketchShape, 'lines' | 'solids' | 'cone'> {
  const half = d / 2;
  const grow = Math.tan(div / 2) * BEAM_DRAWN_MM;
  const nozzle = Math.max(half + 1.5, 3);
  const exit = led ? 0 : 6;
  const dome: SketchLine[] = led ? [{ points: Array.from({ length: 13 }, (_, k): Pt => [exit + 3 * Math.sin((Math.PI * k) / 12), -half + (d * k) / 12]) }] : [];
  return {
    lines: [
      led ? rect(-14, 0, -7, 7) : rect(-24, 2, -8, 8),
      ...(led ? dome : [rect(2, exit, -nozzle, nozzle)]),
      { points: [[exit, -half], [exit + BEAM_DRAWN_MM, -half - grow]], faint: true },
      { points: [[exit, half], [exit + BEAM_DRAWN_MM, half + grow]], faint: true },
    ],
    solids: led
      ? [{ kind: 'box', x: [-14, 0], half: [7, 7] }, { kind: 'dome', x: 0, r: Math.max(half, 1), depth: 3 }]
      : [{ kind: 'box', x: [-24, 2], half: [8, 8] }, { kind: 'cylinder', x: [2, exit], r: nozzle }],
    cone: { x: exit + (led ? 3 : 0), r0: half, r1: half + Math.max(grow, CONE_FLARE_MM), length: BEAM_DRAWN_MM, color },
  };
}

const cache = new Map<string, SketchShape>();

/** The line art of an ideal part, from its inputs. */
export function sketchShape(s: Pick<SchematicSymbol, 'kind' | 'inputs'>): SketchShape {
  const key = `${s.kind} ${JSON.stringify(s.inputs?.map((i) => [i.label, i.value, i.unit]) ?? [])}`;
  const known = cache.get(key);
  if (known) return known;
  const shape = build(s.kind, s);
  if (cache.size > 300) cache.clear();
  cache.set(key, shape);
  return shape;
}

function build(kind: SymbolKind, s: Pick<SchematicSymbol, 'inputs'>): SketchShape {
  const d = inputOf(s, 'Diameter') ?? SKETCH_DIAMETER_MM;
  const r = d / 2;
  const at45 = liesAt45(kind);
  const plate = (fill?: string, dashedMiddle = false): SketchShape => ({
    lines: [rect(-PLATE_MM / 2, PLATE_MM / 2, -r, r, { fill }), ...(dashedMiddle ? [{ points: [[0, -r], [0, r]] as Pt[], dashed: true, faint: true }] : [])],
    at45,
    apertureMm: r,
    foci: [],
    size: { across: d, along: PLATE_MM },
  });
  switch (kind) {
    case 'lens': {
      const f = inputOf(s, 'Focal length') ?? 50;
      return { lines: thinLens(r, f), at45, apertureMm: r, foci: [-f, f], size: { across: d, along: 6 } };
    }
    case 'mirror': {
      const f = inputOf(s, 'Focal length') ?? 0;
      return { lines: mirror(r, f), at45, apertureMm: r, foci: [], size: { across: d, along: 6 } };
    }
    case 'filter':
      return plate(nmColor(inputOf(s, 'Centre wavelength') ?? 550));
    case 'dichroic':
      return plate(nmColor(inputOf(s, 'Cut-on wavelength') ?? 550));
    case 'beamsplitter':
      return plate(undefined, true);
    case 'laser': {
      const led = inputOf(s, 'Emitter size') !== undefined;
      const w = sourceDiameterMm(s) ?? 2;
      return { ...source(w, divergenceRad(s), led, nmColor(inputOf(s, 'Wavelength') ?? 550)), at45, apertureMm: 0, foci: [], size: { across: 16, along: 30 } };
    }
    case 'objective': {
      // Its pupil: Ø = 2·NA·f, with f from its magnification on the tube lens.
      const f = TUBE_LENS_MM / (inputOf(s, 'Magnification') ?? 10);
      const pupil = Math.min(24, 2 * (inputOf(s, 'Numerical aperture') ?? 0.25) * f);
      return {
        lines: [rect(-18, 6, -10, 10), rect(6, 12, -6, 6), ...thinLens(pupil / 2, f).map((l) => ({ ...l, points: l.points.map(([x, y]): Pt => [x + 14, y]) }))],
        solids: [
          { kind: 'cylinder', x: [-18, 6], r: 10 },
          { kind: 'cylinder', x: [6, 12], r: 6 },
        ],
        at45,
        apertureMm: 0,
        foci: [],
        size: { across: 20, along: 30 },
      };
    }
    case 'aperture': {
      const open = (inputOf(s, 'Diameter') ?? 10) / 2;
      const outer = Math.max(open + 5, 14);
      return { lines: [{ points: [[0, open], [0, outer]] }, { points: [[0, -open], [0, -outer]] }, { points: [[-2, open], [2, open]] }, { points: [[-2, -open], [2, -open]] }], at45, apertureMm: 0, foci: [], size: { across: 2 * outer, along: 4 } };
    }
    case 'camera':
      return {
        lines: [rect(-15, 9, -13, 13), rect(9, 15, -7, 7), { points: [[5, -9], [5, 9]], dashed: true, faint: true }],
        solids: [
          { kind: 'box', x: [-15, 9], half: [13, 13] },
          { kind: 'cylinder', x: [9, 15], r: 7 },
        ],
        at45,
        apertureMm: 0,
        foci: [],
        size: { across: 26, along: 30 },
      };
  }
}
