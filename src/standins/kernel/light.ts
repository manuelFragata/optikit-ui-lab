/**
 * DEMO ONLY: a stand-in for the optics engine, so the views have light to
 * draw. It goes away when the engine (oc-wasm) is wired in; nothing but the
 * app root and Storybook's preview should import it.
 *
 * The light comes from the parts alone: nobody writes where it goes. Each
 * source shines the way it faces and the light runs in straight lines along
 * the grid, on the source's layer:
 *
 * - a mirror turns it, as its seat sets the plate ("/" or "\");
 * - a dichroic turns the source's light shorter than its cut-on, and lets
 *   the rest through (the sample's light, always: it is longer);
 * - a beam splitter sends it both ways: turned, and through;
 * - a filter lets the source's light through inside its band (the sample's
 *   light, always), and stops the rest;
 * - lenses, objectives and apertures let it through;
 * - a camera or another source stops it;
 * - the sample in front of an objective: light that reaches it through the
 *   objective stops there, and the sample shines back through the
 *   objective (fluorescence); light from elsewhere passes through it;
 * - with nothing in its way, it runs out.
 *
 * Each path is named from where it starts to where it ends. A detector that
 * no light reaches is a miss.
 */
import type { Light, LightMiss, LightPath, Point } from '../../ports/light';
import { facing, samplePoint, seatOf, type RayColorKey, type Schematic, type SchematicSymbol } from '../../components/editor/model';

/** How far off its centre a part still catches the light, grid units (a 1" optic in a 50 mm cube). */
const APERTURE = 0.25;
/** How far the light runs on with nothing in its way, grid units. */
const RUN_OUT = 5;

const inputOf = (s: SchematicSymbol, label: string) => s.inputs?.find((i) => i.label === label)?.value;

/** A 45° plate turns light by its seat: "/" at seats 0 and 2, "\" at 1 and 3 (as the views draw it). */
const reflect = (s: SchematicSymbol, d: Point): Point => (seatOf(s.placement) % 2 === 0 ? { x: d.y, y: d.x } : { x: -d.y, y: -d.x });

/** The light on its way: a source's (with its wavelength), or the sample's. */
type Beam = { fromSample: boolean; wavelength?: number };

/** What a part does to light arriving along `d`: the ways it goes on (none: it stops; two: a beam splitter). */
function after(s: SchematicSymbol, d: Point, light: Beam): Point[] {
  switch (s.kind) {
    case 'lens':
    case 'objective':
    case 'aperture':
      return [d];
    case 'beamsplitter':
      return [reflect(s, d), d];
    case 'filter': {
      const centre = inputOf(s, 'Centre wavelength');
      const width = inputOf(s, 'Bandwidth') ?? 0;
      const inside = light.fromSample || centre === undefined || light.wavelength === undefined || Math.abs(light.wavelength - centre) <= width / 2;
      return inside ? [d] : [];
    }
    case 'mirror':
      return [reflect(s, d)];
    case 'dichroic': {
      const cutOn = inputOf(s, 'Cut-on wavelength');
      const turned = !light.fromSample && (cutOn === undefined || light.wavelength === undefined || light.wavelength < cutOn);
      return [turned ? reflect(s, d) : d];
    }
    default:
      return [];
  }
}

type Thing = Point & { id: string; part?: SchematicSymbol };

/** The nearest thing ahead of `at` along `d`, close enough to the line to catch the light. */
function nextAhead(things: Thing[], at: Point, d: Point): Thing | null {
  let best: Thing | null = null;
  let bestAlong = Infinity;
  for (const t of things) {
    const along = (t.x - at.x) * d.x + (t.y - at.y) * d.y;
    const across = Math.abs((t.x - at.x) * d.y - (t.y - at.y) * d.x);
    if (along > 1e-6 && across <= APERTURE && along < bestAlong) {
      best = t;
      bestAlong = along;
    }
  }
  return best;
}

/** One way the light went: its points, what it met (by id), and whether it runs out. */
export interface Route {
  start: string;
  points: Point[];
  reached: string[];
  open: boolean;
  /** It ended at the sample, having come through the objective: the sample shines back. */
  excites: boolean;
}

/** A cap on what the light meets, for light caught between mirrors. */
const STEPS = 32;

/**
 * Every way the light from `start` goes, from `at` along `d`: one route per
 * end (a beam splitter makes two). `things`: what the light can meet.
 */
function follow(start: string, from: Point, dir: Point, light: Beam, things: Thing[], objectiveId: string | undefined): Route[] {
  const routes: Route[] = [];
  const walk = (points: Point[], reached: string[], at: Point, d: Point) => {
    while (reached.length < STEPS) {
      const last = reached[reached.length - 1];
      const next = nextAhead(
        things.filter((t) => t.id !== last),
        at,
        d,
      );
      if (!next) {
        routes.push({ start, points: [...points, { x: at.x + d.x * RUN_OUT, y: at.y + d.y * RUN_OUT }], reached, open: true, excites: false });
        return;
      }
      // Where the light crosses the part's centre line.
      at = d.x !== 0 ? { x: next.x, y: at.y } : { x: at.x, y: next.y };
      points = [...points, at];
      reached = [...reached, next.id];
      if (!next.part) {
        // The sample: light through the objective stops there and excites it; light from elsewhere passes.
        if (last === objectiveId) {
          routes.push({ start, points, reached, open: false, excites: true });
          return;
        }
        continue;
      }
      const ways = after(next.part, d, light);
      if (ways.length === 0) break;
      for (const way of ways.slice(1)) walk(points, reached, at, way);
      d = ways[0];
    }
    routes.push({ start, points, reached, open: false, excites: false });
  };
  walk([from], [start], from, dir);
  return routes;
}

/** Every route the design's light takes: from each source, then from the sample if the light excites it. */
export function routesOf(symbols: SchematicSymbol[]): Route[] {
  const objective = symbols.find((s) => s.kind === 'objective');
  const sample = objective ? samplePoint(objective) : null;
  const on = (z: number): Thing[] => [
    ...symbols.filter((s) => s.z === z).map((s) => ({ id: s.id, x: s.x, y: s.y, part: s })),
    ...(sample && objective && objective.z === z ? [{ id: 'sample', ...sample }] : []),
  ];
  const fromSources = symbols
    .filter((s) => s.kind === 'laser')
    .flatMap((s) => follow(s.id, { x: s.x, y: s.y }, facing(s), { fromSample: false, wavelength: inputOf(s, 'Wavelength') }, on(s.z), objective?.id));
  const fromSample =
    objective && sample && fromSources.some((r) => r.excites)
      ? follow('sample', sample, { x: -facing(objective).x, y: -facing(objective).y }, { fromSample: true }, on(objective.z).filter((t) => t.id !== 'sample'), objective.id)
      : [];
  return [...fromSources, ...fromSample];
}

/** The colours: the sample's light its own; each source's one of the rest, in order. */
const SAMPLE_COLOR: RayColorKey = 'ray2';
const SOURCE_COLORS: RayColorKey[] = ['ray1', 'ray3', 'ray4', 'ray5', 'ray6'];
/** How far apart paths of different starts sit where they share a line, grid units. */
const SPREAD = 0.2;

/** The routes as light paths: named from where they start to where they end, coloured and set side by side by their start. */
function pathsOf(routes: Route[], symbols: SchematicSymbol[]): LightPath[] {
  const label = (id: string) => (id === 'sample' ? 'Sample' : (symbols.find((s) => s.id === id)?.label ?? id));
  const starts = [...new Set(routes.map((r) => r.start))];
  const sources = starts.filter((id) => id !== 'sample');
  const seen = new Map<string, number>();
  const objectiveZ = symbols.find((s) => s.kind === 'objective')?.z ?? 0;
  return routes.map((r) => {
    const g = starts.indexOf(r.start);
    const end = r.reached[r.reached.length - 1];
    const base = `${r.start}>${r.open ? 'out' : end}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const lastPart = r.open ? r.points.length - 2 : r.points.length - 1;
    return {
      ray: {
        id: n > 1 ? `${base}#${n}` : base,
        label: r.open ? `${label(r.start)} → open end` : `${label(r.start)} → ${label(end)}`,
        color: r.start === 'sample' ? SAMPLE_COLOR : SOURCE_COLORS[sources.indexOf(r.start) % SOURCE_COLORS.length],
        // Paths from different starts sit side by side: one on each side of the line, then further out.
        offset: starts.length < 2 ? 0 : (g % 2 === 0 ? 1 : -1) * SPREAD * (Math.floor(g / 2) + 1),
        arrowSegment: Math.max(0, Math.floor((r.points.length - 1) / 2)),
        labelAt: Math.max(0, lastPart),
      },
      z: r.start === 'sample' ? objectiveZ : (symbols.find((s) => s.id === r.start)?.z ?? 0),
      points: r.points,
      open: r.open,
      parts: r.reached,
    };
  });
}

/** Detectors no light reaches: each with the nearest light on its layer, for the dashed hint. */
function missesOf(paths: LightPath[], symbols: SchematicSymbol[]): LightMiss[] {
  return symbols
    .filter((s) => s.kind === 'camera' && !paths.some((p) => p.parts?.includes(s.id)))
    .flatMap((s) => {
      let best: { path: LightPath; at: Point; d: number } | null = null;
      for (const path of paths.filter((p) => p.z === s.z))
        for (const at of path.points) {
          const d = Math.hypot(at.x - s.x, at.y - s.y);
          if (!best || d < best.d) best = { path, at, d };
        }
      return best ? [{ ray: best.path.ray, label: s.label, from: best.at, at: { x: s.x, y: s.y } }] : [];
    });
}

/** The demo's light source: where the design's light goes. At once; the provider gives it over the stand-in network. */
export const demoLight = (design: Schematic): Light => {
  const paths = pathsOf(routesOf(design.symbols), design.symbols);
  return { paths, misses: missesOf(paths, design.symbols) };
};
