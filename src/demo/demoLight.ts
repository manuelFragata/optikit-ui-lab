/**
 * DEMO ONLY: a stand-in for the optics engine, so the views have light to
 * draw. It goes away when the engine (oc-wasm) is wired in; nothing but the
 * app root and Storybook's preview should import it.
 *
 * Each of the design's light paths starts at its source (a laser, or the
 * sample for emission) and runs in straight lines along the grid, on its
 * own layer:
 *
 * - a mirror turns it, as its seat sets the plate ("/" or "\");
 * - a dichroic turns the source's light shorter than its cut-on, and lets
 *   the rest through (the emission, always);
 * - lenses and objectives let it through;
 * - a camera or another source stops it;
 * - with nothing in its way, it runs out.
 *
 * Where the light misses the next part a path names, that is a miss.
 */
import type { Light, LightFor, LightMiss, Point } from '../components/editor/light';
import { facing, samplePoint, type SchematicRay, type SchematicSymbol } from '../components/editor/model';

/** How far off its centre a part still catches the light, grid units (a 1" optic in a 50 mm cube). */
const APERTURE = 0.25;
/** How far the light runs on with nothing in its way, grid units. */
const RUN_OUT = 5;

const seatOf = (s: SchematicSymbol) => (s.placement.state === 'in-cube' ? s.placement.seat : 0);
const inputOf = (s: SchematicSymbol, label: string) => s.inputs?.find((i) => i.label === label)?.value;

/** A 45° plate turns light by its seat: "/" at seats 0 and 2, "\" at 1 and 3 (as the views draw it). */
const reflect = (s: SchematicSymbol, d: Point): Point => (seatOf(s) % 2 === 0 ? { x: d.y, y: d.x } : { x: -d.y, y: -d.x });

/** The light on its way: the source's (with its wavelength), or the emission from the sample. */
type Beam = { emission: boolean; wavelength?: number };

/** What a part does to light arriving along `d`: the way it goes on, or null where it stops. */
function after(s: SchematicSymbol, d: Point, light: Beam): Point | null {
  switch (s.kind) {
    case 'lens':
    case 'objective':
      return d;
    case 'mirror':
      return reflect(s, d);
    case 'dichroic': {
      const cutOn = inputOf(s, 'Cut-on wavelength');
      const turned = !light.emission && (cutOn === undefined || light.wavelength === undefined || light.wavelength < cutOn);
      return turned ? reflect(s, d) : d;
    }
    default:
      return null;
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

/** One light path, followed; null when its start is gone. `reached` lists what it met, in order. */
export function traceRay(ray: SchematicRay, symbols: SchematicSymbol[]): { path: Light['paths'][number]; reached: string[]; miss: LightMiss | null } | null {
  const objective = symbols.find((s) => s.kind === 'objective');
  const sample = objective ? samplePoint(objective) : null;
  const start = ray.path[0];
  const source = start === 'sample' ? undefined : symbols.find((s) => s.id === start);
  // Emission starts at the sample, back towards the objective.
  const from = source ?? (objective && sample ? objective : undefined);
  if (!from) return null;
  const z = from.z;
  let at: Point = source ? { x: source.x, y: source.y } : sample!;
  let d = source ? facing(source) : { x: -facing(objective!).x, y: -facing(objective!).y };
  const light: Beam = { emission: !source, wavelength: source && inputOf(source, 'Wavelength') };
  // The sample stops the light that was meant to end there, and lets the rest through.
  const endsAtSample = ray.path[ray.path.length - 1] === 'sample';

  const things: Thing[] = [
    ...symbols.filter((s) => s.z === z).map((s) => ({ id: s.id, x: s.x, y: s.y, part: s })),
    ...(sample && source ? [{ id: 'sample', ...sample }] : []),
  ];
  const points = [at];
  const reached = [start];
  let open = false;
  // A cap, for light caught between mirrors.
  for (let i = 0; i < 32; i++) {
    const last = reached[reached.length - 1];
    const next = nextAhead(
      things.filter((t) => t.id !== last),
      at,
      d,
    );
    if (!next) {
      points.push({ x: at.x + d.x * RUN_OUT, y: at.y + d.y * RUN_OUT });
      open = true;
      break;
    }
    // Where the light crosses the part's centre line.
    at = d.x !== 0 ? { x: next.x, y: at.y } : { x: at.x, y: next.y };
    points.push(at);
    reached.push(next.id);
    const on = next.part ? after(next.part, d, light) : endsAtSample ? null : d;
    if (!on) break;
    d = on;
  }

  return { path: { ray, z, points, open, parts: reached }, reached, miss: missOf(ray, reached, symbols, sample) };
}

/** The first part the path names that the light does not reach (parts since deleted do not count). */
function missOf(ray: SchematicRay, reached: string[], symbols: SchematicSymbol[], sample: Point | null): LightMiss | null {
  const place = (id: string) => {
    if (id === 'sample') return sample && { label: 'the sample', at: sample };
    const s = symbols.find((sym) => sym.id === id);
    return s && { label: s.label, at: { x: s.x, y: s.y } };
  };
  const meant = ray.path.filter((id) => place(id));
  const index = meant.findIndex((id) => !reached.includes(id));
  if (index <= 0) return null;
  const missed = place(meant[index])!;
  const lastMet = meant.slice(0, index).filter((id) => reached.includes(id)).at(-1)!;
  return { ray, label: missed.label, at: missed.at, from: place(lastMet)!.at };
}

/** The demo's light source: every light path of a design, followed. */
export const demoLight: LightFor = (design) => {
  const traced = design.rays.flatMap((r) => traceRay(r, design.symbols) ?? []);
  return { paths: traced.map((t) => t.path), misses: traced.flatMap((t) => (t.miss ? [t.miss] : [])) };
};
