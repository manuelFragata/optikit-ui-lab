/**
 * STAND-IN for the library: in the app these records come from the service
 * (GET /v1/library/index, GET /v1/catalog/index, POST /v1/catalog/import).
 *
 * Catalogue optics as optikit-v2's library records carry them: the category,
 * how it comes (bare glass, or already mounted), the stated focal length and
 * the surface stack in Optiland's dict form (`optics.fragment.surfaces`). A
 * record has no diameter or thickness field: the diameter is twice the
 * largest semi-aperture, the thickness the sum over every surface but the
 * last (holderFit.opticFacts).
 *
 * Prescriptions are Thorlabs' published ones; a test traces each and checks
 * that it focuses where the record says (holders.test.ts).
 */
import type { CatalogRecord, FragmentSurface, SurfaceResponse } from '../../components/editor/holders/optic';

const thorlabs = (mpn: string, category: string, eflMm: number | undefined, fragmentSurfaces: FragmentSurface[], clearApertureMm?: number): CatalogRecord => ({
  id: `thorlabs.${category}.${mpn.toLowerCase()}`,
  category,
  mount: 'bare',
  vendor: { name: 'Thorlabs', mpn },
  eflMm,
  clearApertureMm,
  fragmentSurfaces,
});

/** A flat round plate of glass, its first surface coated as `response` says: a filter or a plate beam splitter. */
const plate = (t: number, semi: number, response: SurfaceResponse): FragmentSurface[] => [
  { geometry: { radius: 'inf' }, thickness: t, semi_aperture: semi, material_post: 'N-BK7', response },
  { geometry: { radius: 'inf' }, semi_aperture: semi },
];

/** A bandpass filter's coating: it passes centre ± width/2 (nm), and absorbs the rest. */
const bandpass = (centreNm: number, widthNm: number): SurfaceResponse => ({ kind: 'absorptive', 'transmit-bands-um': [[(centreNm - widthNm / 2) / 1000, (centreNm + widthNm / 2) / 1000]] });
/** A beam splitter's coating: it reflects this fraction at every wavelength. */
const splitter = (reflected: number): SurfaceResponse => ({ kind: 'sampler', 'transmit-ratio': reflected });

/** An achromatic doublet: crown, then flint, cemented. */
const doublet = (r1: number, t1: number, crown: string, r2: number, t2: number, flint: string, r3: number, semi: number): FragmentSurface[] => [
  { geometry: { radius: r1 }, thickness: t1, semi_aperture: semi, material_post: crown },
  { geometry: { radius: r2 }, thickness: t2, semi_aperture: semi, material_post: flint },
  { geometry: { radius: r3 }, semi_aperture: semi },
];

/** A plano-convex singlet, curved side first. */
const planoConvex = (r: number, t: number, semi: number): FragmentSurface[] => [
  { geometry: { radius: r }, thickness: t, semi_aperture: semi, material_post: 'N-BK7' },
  { geometry: { radius: 'inf' }, semi_aperture: semi },
];

const parts: CatalogRecord[] = [
  thorlabs('AC254-030-A', 'lens', 30, doublet(20.89, 12.0, 'N-BAF10', -16.73, 2.0, 'N-SF6HT', -79.8, 12.7), 22.9),
  thorlabs('AC254-050-A', 'lens', 50, doublet(33.3, 9.0, 'N-BAF10', -22.28, 2.5, 'N-SF10', -291.07, 12.7), 22.9),
  thorlabs('AC254-100-A', 'lens', 100, doublet(62.75, 4.0, 'N-BK7', -45.71, 2.5, 'N-SF5', -128.23, 12.7), 22.9),
  thorlabs('AC254-150-A', 'lens', 150, doublet(91.62, 5.7, 'N-BK7', -66.68, 2.2, 'N-SF5', -197.7, 12.7), 22.9),
  thorlabs('AC254-200-A', 'lens', 200, doublet(77.4, 4.0, 'N-SSK5', -87.57, 2.5, 'N-LAF7', 291.1, 12.7), 22.9),
  thorlabs('AC508-100-A', 'lens', 100, doublet(71.12, 16.0, 'N-BAF10', -44.17, 4.0, 'N-SF10', -363.1, 25.4), 45.7),
  thorlabs('LA1131-A', 'lens', 50, planoConvex(25.8, 5.3, 12.7), 22.9),
  thorlabs('LA1509-A', 'lens', 100, planoConvex(51.5, 3.6, 12.7), 22.9),
  thorlabs('LA1433-A', 'lens', 150, planoConvex(77.3, 3.0, 12.7), 22.9),
  // Longpass dichroic, 25 × 36 mm, 1 mm thick: a flat plate, for the other roads.
  thorlabs('DMLP505', 'dichroic', undefined, [
    {
      geometry: { radius: 'inf' },
      thickness: 1.0,
      semi_aperture: 12.5,
      aperture: { type: 'rectangular', x_min: -12.5, x_max: 12.5, y_min: -18, y_max: 18 },
      // It turns the light below 505 nm, and lets the rest through.
      response: { kind: 'dichroic', 'reflect-bands-um': [[null, 0.505]] },
    },
    { geometry: { radius: 'inf' }, semi_aperture: 12.5, aperture: { type: 'rectangular', x_min: -12.5, x_max: 12.5, y_min: -18, y_max: 18 } },
  ]),
  // Bandpass filters, Ø25 mm, mounted in a ring: a centre wavelength and a full width at half maximum.
  thorlabs('FBH488-10', 'filter', undefined, plate(6.3, 12.5, bandpass(488, 10)), 21),
  thorlabs('FBH520-40', 'filter', undefined, plate(6.3, 12.5, bandpass(520, 40)), 21),
  thorlabs('FBH550-40', 'filter', undefined, plate(6.3, 12.5, bandpass(550, 40)), 21),
  // 50:50 beam splitters for 400–700 nm: a 25.4 mm cube, and a Ø25.4 mm plate.
  thorlabs('BS013', 'beamsplitter', undefined, plate(25.4, 12.7, splitter(0.5)), 20.3),
  thorlabs('BSW10R', 'beamsplitter', undefined, plate(5, 12.7, splitter(0.5)), 22.9),
];

/** The demo catalogue, by part number. */
export const catalogParts: Record<string, CatalogRecord> = Object.fromEntries(parts.map((p) => [p.vendor!.mpn, p]));

/** The record behind an unmounted part's catalogue name, when the demo has it. */
export const catalogRecord = (part: string): CatalogRecord | undefined => catalogParts[part];

/** Every record, for snapping an ideal part to one. */
export const catalogList: readonly CatalogRecord[] = parts;
