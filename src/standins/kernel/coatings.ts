/**
 * STAND-IN for the kernel: in the app a surface's reflectance comes from
 * oc-wasm (`surfaceRtF64`, `surfaceCoatingJSON`, thin-film stacks by the
 * transfer matrix) once the service writes coatings into Scene3 v3.
 *
 * Coatings on an optic's surfaces, and how much each surface reflects at a
 * wavelength. Bare glass and a single MgF₂ layer are computed (Fresnel, and
 * the thin-film formula at normal incidence); the vendors' broadband AR and
 * mirror coatings are drawn from their published bands and curves, so they
 * are approximate: right in shape and band, not to the tenth of a percent.
 * Indices are n_d, with no dispersion. Pure.
 *
 * A catalogue part's coatings are the vendor's (Thorlabs' suffix: -A, -B,
 * -C); a part designed here carries its own, on its prescription's surfaces
 * (`FragmentSurface.coating`, a lab id, not Optiland's coating dict).
 */
import { GLASS_ND, type CatalogRecord, type FragmentSurface } from '../../components/editor/holders/optic';

export type CoatingId = 'uncoated' | 'mgf2' | 'ar-a' | 'ar-b' | 'ar-c' | 'al-protected' | 'ag-protected' | 'au-protected' | 'dielectric-e02' | 'dielectric-e03';

export interface Coating {
  id: CoatingId;
  label: string;
  /** Where it goes: a glass face the light passes through, or a mirror's face. */
  on: 'transmit' | 'mirror';
  /** The band it is made for, nm. */
  band?: [number, number];
  /** One line on what it is. */
  note: string;
  /** Drawn from the vendor's curve rather than computed. */
  approximate: boolean;
}

export const COATINGS: readonly Coating[] = [
  { id: 'uncoated', label: 'Uncoated', on: 'transmit', note: 'Bare glass: about 4% back at every face.', approximate: false },
  { id: 'mgf2', label: 'MgF₂, single layer', on: 'transmit', band: [400, 700], note: 'A quarter wave at 550 nm: about 1.3% back, best in the green.', approximate: false },
  { id: 'ar-a', label: 'Broadband AR, 350–700', on: 'transmit', band: [350, 700], note: "Thorlabs' -A: under 0.5% on average across the visible.", approximate: true },
  { id: 'ar-b', label: 'Broadband AR, 650–1050', on: 'transmit', band: [650, 1050], note: "Thorlabs' -B: red and near infrared.", approximate: true },
  { id: 'ar-c', label: 'Broadband AR, 1050–1700', on: 'transmit', band: [1050, 1700], note: "Thorlabs' -C: telecom infrared.", approximate: true },
  { id: 'al-protected', label: 'Protected aluminium', on: 'mirror', band: [450, 2000], note: 'Over 90% across a wide band, with a dip near 800 nm.', approximate: true },
  { id: 'ag-protected', label: 'Protected silver', on: 'mirror', band: [450, 2000], note: 'Over 97.5% from 450 nm on; falls off in the blue.', approximate: true },
  { id: 'au-protected', label: 'Protected gold', on: 'mirror', band: [800, 2000], note: 'For the infrared; poor below 600 nm.', approximate: true },
  { id: 'dielectric-e02', label: 'Dielectric, 400–750', on: 'mirror', band: [400, 750], note: 'Over 99% across the visible, little outside it.', approximate: true },
  { id: 'dielectric-e03', label: 'Dielectric, 750–1100', on: 'mirror', band: [750, 1100], note: 'Over 99% in the near infrared, little outside it.', approximate: true },
];

export const coating = (id: CoatingId): Coating => COATINGS.find((c) => c.id === id)!;

/** Reflectance between two media at normal incidence. */
export const fresnel = (n1: number, n2: number) => ((n1 - n2) / (n1 + n2)) ** 2;

/** A single layer of index `nf`, a quarter wave thick at `designNm`, on glass `ns`, in air: the thin-film formula. */
function singleLayer(nm: number, nf: number, ns: number, designNm: number): number {
  const r01 = (1 - nf) / (1 + nf);
  const r12 = (nf - ns) / (nf + ns);
  const c = Math.cos(Math.PI * (designNm / nm)); // cos 2δ, δ = (π/2)·(design/λ) for a quarter wave
  return (r01 ** 2 + r12 ** 2 + 2 * r01 * r12 * c) / (1 + r01 ** 2 * r12 ** 2 + 2 * r01 * r12 * c);
}

/** A broadband AR: low and nearly flat across its band, climbing past bare glass outside it (as the vendors' curves do). */
function broadbandAr(nm: number, [lo, hi]: [number, number], bare: number): number {
  const width = hi - lo;
  if (nm >= lo && nm <= hi) {
    const x = (2 * (nm - lo)) / width - 1; // −1 … 1 across the band
    return 0.002 + 0.003 * x ** 4;
  }
  const out = nm < lo ? lo - nm : nm - hi;
  return 0.005 + (1.6 * bare - 0.005) * (1 - Math.exp(-((out / (0.18 * width)) ** 2)));
}

/** Piecewise-linear, from (nm, %) points; flat past the ends. */
function curve(points: [number, number][], nm: number): number {
  if (nm <= points[0][0]) return points[0][1] / 100;
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (nm <= x1) {
      const [x0, y0] = points[i - 1];
      return (y0 + ((y1 - y0) * (nm - x0)) / (x1 - x0)) / 100;
    }
  }
  return points[points.length - 1][1] / 100;
}

/** Mirror coatings' reflectance, % by nm, read off the vendors' curves (Thorlabs -G01, -P01, -M01, -E02, -E03). */
const MIRROR_CURVES: Partial<Record<CoatingId, [number, number][]>> = {
  'al-protected': [
    [350, 88],
    [450, 91],
    [600, 90],
    [750, 87],
    [810, 86],
    [900, 89],
    [1000, 93],
    [1700, 96],
    [2000, 96],
  ],
  'ag-protected': [
    [350, 70],
    [400, 88],
    [450, 96],
    [500, 97.5],
    [700, 98],
    [1000, 98.5],
    [2000, 98.5],
  ],
  'au-protected': [
    [350, 35],
    [450, 38],
    [500, 48],
    [550, 72],
    [600, 90],
    [700, 96],
    [800, 97],
    [2000, 98],
  ],
  'dielectric-e02': [
    [350, 15],
    [380, 40],
    [400, 99.2],
    [750, 99.2],
    [770, 40],
    [800, 12],
    [1100, 8],
    [2000, 8],
  ],
  'dielectric-e03': [
    [350, 8],
    [700, 12],
    [730, 40],
    [750, 99.2],
    [1100, 99.2],
    [1130, 40],
    [1200, 10],
    [2000, 8],
  ],
};

/**
 * How much a surface reflects at a wavelength (0–1). `n` is the glass on the
 * far side of a transmitting face; a mirror's face ignores it.
 */
export function reflectance(id: CoatingId, nm: number, n = GLASS_ND['N-BK7']): number {
  const bare = fresnel(1, n);
  switch (id) {
    case 'uncoated':
      return bare;
    case 'mgf2':
      return singleLayer(nm, 1.38, n, 550);
    case 'ar-a':
    case 'ar-b':
    case 'ar-c':
      return broadbandAr(nm, coating(id).band!, bare);
    default:
      return curve(MIRROR_CURVES[id]!, nm);
  }
}

/** What a surface is to the light: where it is in the stack, what it can carry, and what it carries. */
export interface SurfaceInfo {
  index: number;
  role: 'front' | 'back' | 'cemented' | 'mirror' | 'substrate';
  /** The media either side, by name ("air" for air). */
  before: string;
  after: string;
  /** The coating on it; `null` for a cemented face (glued, so no coating) or a mirror's back. */
  coating: CoatingId | null;
  /** Whose the coating is: the vendor's (fixed), this design's, or assumed (a designed mirror with none chosen yet). */
  from: 'vendor' | 'design' | 'assumed' | null;
  /** The light meets it. A mirror's back does not. */
  inLight: boolean;
}

/** Thorlabs' AR suffix on a part number: -A, -B, -C (AC254-050-A, LA1509-B). */
export function vendorCoating(mpn: string | undefined): CoatingId | null {
  const m = mpn?.match(/-(A|B|C)$/);
  return m ? (`ar-${m[1].toLowerCase()}` as CoatingId) : null;
}

const indexOf = (material: string | undefined) => (material ? (GLASS_ND[material] ?? 1.5) : 1);

/** Each surface of a round optic: its role, its coating and where that comes from. */
export function surfaceInfo(record: Pick<CatalogRecord, 'id' | 'vendor' | 'fragmentSurfaces'>): SurfaceInfo[] {
  const surfaces = record.fragmentSurfaces;
  const mirror = Boolean(surfaces[0]?.is_reflective);
  const designed = record.id.startsWith('designed.');
  const vendor = vendorCoating(record.vendor?.mpn);
  return surfaces.map((s, i): SurfaceInfo => {
    const before = i === 0 ? 'air' : (surfaces[i - 1].material_post ?? 'air');
    const after = s.material_post ?? 'air';
    const own = designed && COATINGS.some((c) => c.id === s.coating) ? (s.coating as CoatingId) : null;
    if (mirror) {
      if (i > 0) return { index: i, role: 'substrate', before, after, coating: null, from: null, inLight: false };
      return { index: i, role: 'mirror', before: 'air', after, coating: own ?? 'al-protected', from: own ? 'design' : designed ? 'assumed' : vendor ? 'vendor' : 'assumed', inLight: true };
    }
    const role = before !== 'air' && after !== 'air' ? 'cemented' : i === 0 ? 'front' : 'back';
    if (role === 'cemented') return { index: i, role, before, after, coating: null, from: null, inLight: true };
    if (designed) return { index: i, role, before, after, coating: own ?? 'uncoated', from: 'design', inLight: true };
    return { index: i, role, before, after, coating: vendor ?? 'uncoated', from: vendor ? 'vendor' : 'assumed', inLight: true };
  });
}

/** How much one surface reflects at a wavelength, by what it is. */
export function surfaceReflectance(info: SurfaceInfo, nm: number): number {
  if (!info.inLight) return 0;
  if (info.coating === null) return fresnel(indexOf(info.before === 'air' ? undefined : info.before), indexOf(info.after === 'air' ? undefined : info.after));
  const glass = info.after === 'air' ? info.before : info.after;
  return reflectance(info.coating, nm, indexOf(glass));
}

/**
 * What the optic passes on at a wavelength, counting only its surfaces (no
 * absorption in the glass): a lens transmits the product of (1 − R) over its
 * faces; a mirror returns what its face reflects.
 */
export function throughput(infos: SurfaceInfo[], nm: number): number {
  const face = infos.find((s) => s.role === 'mirror');
  if (face) return surfaceReflectance(face, nm);
  return infos.reduce((t, s) => t * (1 - surfaceReflectance(s, nm)), 1);
}

export interface CoatingCheck {
  severity: 'warning' | 'info';
  message: string;
  /** The surface it is about, when one. */
  surface?: number;
}

const pct = (r: number) => `${(r * 100).toFixed(r < 0.1 ? 1 : 0)}%`;

/** What the coatings do to the wavelengths in the design: a face that loses much of one, a mirror that returns little. */
export function coatingChecks(infos: SurfaceInfo[], wavelengths: number[]): CoatingCheck[] {
  const checks: CoatingCheck[] = [];
  for (const s of infos.filter((i) => i.inLight && i.coating)) {
    const c = coating(s.coating!);
    for (const nm of wavelengths) {
      const r = surfaceReflectance(s, nm);
      const outside = c.band && (nm < c.band[0] || nm > c.band[1]);
      if (s.role === 'mirror' && r < 0.9) checks.push({ severity: 'warning', surface: s.index, message: `${c.label}: ${pct(r)} at ${nm} nm` });
      else if (s.role !== 'mirror' && r > 0.01)
        checks.push({
          severity: 'warning',
          surface: s.index,
          message: `S${s.index + 1}: ${pct(r)} back at ${nm} nm${outside ? ` · outside ${c.band![0]}–${c.band![1]}` : s.coating === 'uncoated' ? ' · uncoated' : ''}`,
        });
    }
  }
  return checks;
}

/** The surfaces with a coating set: `coating` on surface `index`, the rest as they were. */
export const withCoating = (surfaces: FragmentSurface[], index: number, id: CoatingId): FragmentSurface[] => surfaces.map((s, i) => (i === index ? { ...s, coating: id } : s));

