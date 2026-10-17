/**
 * Optics designed here: a real lens or mirror, by its prescription (the
 * surface stack optikit-v2's records carry, Optiland's dict form), not a
 * catalogue part and not an ideal element. The sketch starts them from a
 * form (biconvex, meniscus, achromat; flat or concave mirror) at a focal
 * length; then every radius, thickness and glass can be changed, and the
 * focal length follows from them. Pure.
 *
 * Signs as Optiland's: light travels +z; a radius is + when its centre of
 * curvature lies at +z. A concave mirror facing the light has R < 0, f = −R/2.
 */
import { CATEGORY_OF, holderPart, type SchematicSymbol, type SymbolKind } from '../model';
import { GLASS_ND, opticFacts, paraxialEfl, sag, type CatalogRecord, type FragmentSurface } from './optic';

export type LensForm = 'biconvex' | 'plano-convex' | 'meniscus' | 'biconcave' | 'plano-concave' | 'achromat';
export type MirrorForm = 'flat' | 'concave' | 'convex';

export const LENS_FORMS: { form: LensForm; label: string }[] = [
  { form: 'biconvex', label: 'Biconvex' },
  { form: 'plano-convex', label: 'Plano-convex' },
  { form: 'meniscus', label: 'Meniscus' },
  { form: 'achromat', label: 'Achromat' },
  { form: 'biconcave', label: 'Biconcave' },
  { form: 'plano-concave', label: 'Plano-concave' },
];

export const MIRROR_FORMS: { form: MirrorForm; label: string }[] = [
  { form: 'flat', label: 'Flat' },
  { form: 'concave', label: 'Concave' },
  { form: 'convex', label: 'Convex' },
];

/** The glass a singlet starts in, and the thinnest a lens may be at its rim or centre. */
export const DEFAULT_GLASS = 'N-BK7';
const EDGE_MM = 2;
const CENTRE_MM = 2;
/** A designed mirror's substrate. */
export const MIRROR_SUBSTRATE_MM = 6;

/** A singlet's radii for a unit of bending: (R1, R2) as multiples of k; `null` is flat. */
const SHAPE: Record<Exclude<LensForm, 'achromat'>, [number | null, number | null]> = {
  biconvex: [1, -1],
  'plano-convex': [1, null],
  meniscus: [1, 2.5],
  biconcave: [-1, 1],
  'plano-concave': [-1, null],
};

const radius = (r: number | null): FragmentSurface['geometry'] => ({ radius: r === null ? 'inf' : r });
const finite = (s: FragmentSurface) => (typeof s.geometry?.radius === 'number' ? s.geometry.radius : null);

/** A singlet with radii k·SHAPE: the centre as thick as its rims need (2 mm at the thinnest). */
function singlet(form: Exclude<LensForm, 'achromat'>, k: number, semi: number, glass: string): FragmentSurface[] {
  const [a, b] = SHAPE[form];
  const r1 = a === null ? null : a * k;
  const r2 = b === null ? null : b * k;
  // Edge = centre − sag₁(rim) + sag₂(rim): pick the centre for a 2 mm rim, never under 2 mm.
  const ct = Math.max(CENTRE_MM, EDGE_MM + sag(r1, semi) - sag(r2, semi));
  return [
    { geometry: radius(r1), thickness: round(ct), semi_aperture: semi, material_post: glass },
    { geometry: radius(r2), semi_aperture: semi },
  ];
}

/** AC254-050-A's shape, scaled: an achromat of any focal length (its glass thicknesses scale with it). */
function achromat(scale: number, semi: number): FragmentSurface[] {
  return [
    { geometry: { radius: round(33.3 * scale) }, thickness: round(Math.max(9.0 * scale, 3)), semi_aperture: semi, material_post: 'N-BAF10' },
    { geometry: { radius: round(-22.28 * scale) }, thickness: round(Math.max(2.5 * scale, 1.5)), semi_aperture: semi, material_post: 'N-SF10' },
    { geometry: { radius: round(-291.07 * scale) }, semi_aperture: semi },
  ];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** The focal length of a stack: a mirror's −R/2 (its first surface reflects), else its paraxial EFL. */
export function focalLength(surfaces: FragmentSurface[]): number | null {
  if (surfaces[0]?.is_reflective) {
    const r = finite(surfaces[0]);
    return r === null ? null : -r / 2;
  }
  return paraxialEfl(surfaces);
}

/**
 * The lens of a form at focal length f and diameter Ø: the bending found by
 * tracing (a few secant steps from the thin-lens guess), so a thick lens
 * focuses where asked. Negative forms take a negative f.
 */
export function designLens(form: LensForm, focalMm: number, diameterMm: number, glass = DEFAULT_GLASS): FragmentSurface[] {
  const semi = diameterMm / 2;
  if (form === 'achromat') return achromat(Math.abs(focalMm) / 50, semi);
  const [a, b] = SHAPE[form];
  const n = GLASS_ND[glass] ?? 1.5;
  const f = (form === 'biconcave' || form === 'plano-concave' ? -1 : 1) * Math.abs(focalMm);
  // Thin lens: 1/f = (n − 1)(1/R₁ − 1/R₂), with R = k·shape.
  let k = (n - 1) * ((a ? 1 / a : 0) - (b ? 1 / b : 0)) * f;
  const err = (kk: number) => (paraxialEfl(singlet(form, kk, semi, glass)) ?? Infinity) - f;
  let k0 = k * 0.9;
  let e0 = err(k0);
  for (let i = 0; i < 12; i++) {
    const e = err(k);
    if (Math.abs(e) < 1e-4 || e === e0) break;
    [k0, k, e0] = [k, k - (e * (k - k0)) / (e - e0), e];
  }
  return singlet(form, round(k), semi, glass);
}

/** A mirror of a form: its face (reflective) and a flat back; concave faces the light with R = −2f. */
export function designMirror(form: MirrorForm, radiusMm: number, diameterMm: number, substrateMm = MIRROR_SUBSTRATE_MM): FragmentSurface[] {
  const semi = diameterMm / 2;
  const r = form === 'flat' ? null : form === 'concave' ? -Math.abs(radiusMm) : Math.abs(radiusMm);
  return [
    { geometry: radius(r), thickness: substrateMm, semi_aperture: semi, material_post: DEFAULT_GLASS, is_reflective: true },
    { geometry: { radius: 'inf' }, semi_aperture: semi },
  ];
}

/** The form a mirror's stack has. */
export const mirrorForm = (surfaces: FragmentSurface[]): MirrorForm => {
  const r = surfaces[0] ? finite(surfaces[0]) : null;
  return r === null ? 'flat' : r < 0 ? 'concave' : 'convex';
};

/**
 * The same lens bent to another focal length: every radius times one factor,
 * found by tracing; a singlet's centre is set again for a 2 mm rim.
 * Thicknesses of cemented elements stay.
 */
export function withFocalLength(surfaces: FragmentSurface[], focalMm: number): FragmentSurface[] {
  const at = (k: number) => {
    const out = surfaces.map((s) => (finite(s) === null ? s : { ...s, geometry: { ...s.geometry, radius: round(finite(s)! * k) } }));
    if (out.length === 2) {
      const semi = out[0].semi_aperture ?? 0;
      const ct = Math.max(CENTRE_MM, EDGE_MM + sag(finite(out[0]), semi) - sag(finite(out[1]), semi));
      // As thick as the new bending needs for a 2 mm rim (2 mm at the centre at least).
      out[0] = { ...out[0], thickness: round(ct) };
    }
    return out;
  };
  const current = focalLength(surfaces);
  if (!current) return surfaces;
  let k = focalMm / current;
  let k0 = 1;
  let e0 = current - focalMm;
  for (let i = 0; i < 12; i++) {
    const e = (focalLength(at(k)) ?? Infinity) - focalMm;
    if (Math.abs(e) < 1e-4 || e === e0) break;
    [k0, k, e0] = [k, k - (e * (k - k0)) / (e - e0), e];
  }
  return at(k);
}

/** Every surface at the same diameter. */
export const withDiameter = (surfaces: FragmentSurface[], diameterMm: number) => surfaces.map((s) => ({ ...s, semi_aperture: diameterMm / 2 }));

export interface DesignCheck {
  severity: 'error' | 'warning';
  message: string;
}

/** Can it be made: no surface tighter than the lens is wide, no glass of no thickness, glasses the tracer knows. */
export function designChecks(surfaces: FragmentSurface[]): DesignCheck[] {
  const out: DesignCheck[] = [];
  const semi = Math.max(...surfaces.map((s) => s.semi_aperture ?? 0));
  surfaces.forEach((s, i) => {
    const r = finite(s);
    if (r !== null && Math.abs(r) < semi) out.push({ severity: 'error', message: `R${i + 1} = ${r} mm is tighter than the optic is wide (Ø${(2 * semi).toFixed(1)}): that surface cannot exist.` });
    if (s.material_post && !(s.material_post in GLASS_ND)) out.push({ severity: 'warning', message: `No index for ${s.material_post}: the focal length cannot be traced.` });
  });
  if (surfaces[0]?.is_reflective) return out;
  // Edge and centre thickness of each element.
  surfaces.slice(0, -1).forEach((s, i) => {
    const t = s.thickness ?? 0;
    const edge = t - sag(finite(s), semi) + sag(finite(surfaces[i + 1]), semi);
    if (!out.some((c) => c.severity === 'error')) {
      if (edge <= 0) out.push({ severity: 'error', message: `Element ${i + 1} has no rim: its faces cross ${(-edge).toFixed(1)} mm before the edge. Make it thicker.` });
      else if (edge < 1) out.push({ severity: 'warning', message: `Element ${i + 1} is ${edge.toFixed(2)} mm at its rim: hard to make and to hold.` });
      if (t < 0.5) out.push({ severity: 'warning', message: `Element ${i + 1} is ${t} mm at its centre.` });
    }
  });
  return out;
}

/** Records of designed optics, one per prescription (the same object while it is not edited), so what is built from them is built once. */
const records = new WeakMap<FragmentSurface[], CatalogRecord>();

/** A designed optic as a record, so holders, snapping and the close-up read it as they read the catalogue's. */
export function designedRecord(id: string, kind: SymbolKind, surfaces: FragmentSurface[]): CatalogRecord {
  const known = records.get(surfaces);
  if (known && known.id === `designed.${kind}.${id}`) return known;
  const f = focalLength(surfaces);
  const record: CatalogRecord = {
    id: `designed.${kind}.${id}`,
    category: CATEGORY_OF[kind],
    mount: 'bare',
    eflMm: f === null ? undefined : Math.round(f * 10) / 10,
    fragmentSurfaces: surfaces,
  };
  records.set(surfaces, record);
  return record;
}

/** What optic a part is: its own prescription when designed here, else the catalogue record behind its name. */
export function recordOf(s: Pick<SchematicSymbol, 'id' | 'kind' | 'placement' | 'prescription'>, catalogue: (name: string) => CatalogRecord | undefined): CatalogRecord | undefined {
  if (s.prescription) return designedRecord(s.id, s.kind, s.prescription);
  const name = holderPart(s.placement);
  return name ? catalogue(name) : undefined;
}

/** The inputs a designed optic shows, as its prescription has them. */
export function designedValues(surfaces: FragmentSurface[]): Record<string, number> {
  const f = focalLength(surfaces);
  const facts = opticFacts({ category: '', mount: 'bare', fragmentSurfaces: surfaces });
  return { ...(f !== null && { 'Focal length': Math.round(f * 10) / 10 }), Diameter: Math.round(facts.acrossMm * 10) / 10 };
}
