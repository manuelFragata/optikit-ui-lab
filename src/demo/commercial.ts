/**
 * DEMO ONLY: what the Commercial tab needs that the lab has no source for.
 * Costs and lead times come from the shop (Odoo), the customer from the
 * CRM, and the checks from optikit-core and the optics engine. Made up here.
 */
import type { Bom } from '../components/editor/bom';
import type { Light } from '../components/editor/light';
import type { Schematic } from '../components/editor/model';
import type { QuoteCheck, SupplyList } from '../components/views/commercial/quote';

/** What each module or optic costs us, and how long it takes to get. The Laser 488 module has no price (see prices.ts), but a cost. */
export const demoSupply: SupplyList = {
  'Laser 488 module': { cost: 210, leadDays: 15 },
  'Laser cube 520 nm': { cost: 120, leadDays: 10 },
  'Laser 635 module': { cost: 92, leadDays: 10 },
  'LED module': { cost: 18, leadDays: 3 },
  'Mirror cube 45°': { cost: 9, leadDays: 3 },
  'Kinematic mirror cube': { cost: 31, leadDays: 5 },
  'Dichroic holder': { cost: 14, leadDays: 5 },
  'Lens holder, f = 25': { cost: 11, leadDays: 3 },
  'Lens holder, f = 40': { cost: 11, leadDays: 3 },
  'Lens holder, f = 50': { cost: 11, leadDays: 3 },
  'Lens holder, f = 100': { cost: 11, leadDays: 3 },
  'RMS objective insert': { cost: 19, leadDays: 5 },
  'IMX477 camera': { cost: 58, leadDays: 7 },
  'AC254-050-A': { cost: 74, leadDays: 12 },
  'AC254-075-A': { cost: 74, leadDays: 12 },
};

/** Assembly labour, EUR per hour. */
export const demoLabourRate = 65;

export const demoCustomer = { name: 'Dr. Lena Vogt', email: 'l.vogt@uni-jena.example' };

/** Camera pixel pitch, µm, for the Nyquist check. */
const PIXEL_UM: Record<string, number> = { 'IMX477 camera': 1.55 };
/** The light the sampling is checked at: green emission, µm. */
const EMISSION_UM = 0.52;

const inputOf = (design: Schematic, kind: string, label: string) => design.symbols.find((s) => s.kind === kind)?.inputs?.find((i) => i.label === label)?.value;

/** Does the camera sample the smallest detail the objective resolves at least twice? */
function nyquist(design: Schematic): QuoteCheck {
  const label = 'Camera sampling (Nyquist)';
  const camera = design.symbols.find((s) => s.kind === 'camera');
  const pixel = camera?.placement.state === 'in-cube' ? PIXEL_UM[camera.placement.module] : undefined;
  const magnification = inputOf(design, 'objective', 'Magnification');
  const na = inputOf(design, 'objective', 'Numerical aperture');
  if (!pixel || !magnification || !na) return { label, state: 'later', detail: 'Needs an objective and a camera with a known pixel size.' };
  const resolved = (0.61 * EMISSION_UM) / na;
  const sampled = pixel / magnification;
  const ok = sampled <= resolved / 2;
  return {
    label,
    state: ok ? 'ok' : 'warn',
    detail: `${sampled.toFixed(2)} µm per pixel at the sample; the objective resolves ${resolved.toFixed(2)} µm${ok ? '.' : ': too coarse, fine detail is lost.'}`,
  };
}

/** The checks before a quote goes out. */
export function demoChecks(design: Schematic, bom: Bom, light: Light): QuoteCheck[] {
  const unmounted = design.symbols.filter((s) => s.placement.state === 'unmounted');
  return [
    {
      label: 'Every part is in a cube',
      state: unmounted.length ? 'warn' : 'ok',
      detail: unmounted.length ? `${unmounted.map((s) => s.label).join(', ')} still ${unmounted.length === 1 ? 'needs' : 'need'} a holder.` : 'Buildable as it is.',
    },
    {
      label: 'Every line has a price',
      state: bom.unpriced ? 'warn' : 'ok',
      detail: bom.unpriced ? `${bom.lines.filter((l) => l.unitPrice === null).map((l) => l.name).join(', ')}: ask sales.` : 'All list prices are known.',
    },
    {
      label: 'Light reaches every part',
      state: light.misses.length ? 'warn' : 'ok',
      detail: light.misses.length ? light.misses.map((m) => `${m.ray.label} misses ${m.label}`).join('; ') + '.' : 'Every light path is complete.',
    },
    nyquist(design),
    { label: 'Clear aperture', state: 'later', detail: 'Checked by the optics engine.' },
    { label: 'Collisions', state: 'later', detail: 'Checked by optikit-core.' },
  ];
}
