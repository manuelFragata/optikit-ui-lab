/**
 * An optic as a holder sees it: what its record says (optikit-v2
 * `frontend/src/model/holderFit.ts` `opticFacts`, the same numbers the
 * generators read), and the shape of its glass from the surface stack, for
 * drawing it and for the cavity the cartridge cuts around it. Pure.
 */

/** One surface of a record's stack, in Optiland's dict form (only what holders read). */
export interface FragmentSurface {
  geometry?: { radius?: number | 'inf' | null };
  /** To the next surface, mm; the last surface has none. */
  thickness?: number;
  semi_aperture?: number;
  aperture?: { type?: string; x_min?: number; x_max?: number; y_min?: number; y_max?: number } | null;
  material_post?: string;
  /** A mirror's face: the light turns back here (Optiland's `is_reflective`). */
  is_reflective?: boolean;
  /** Its coating, for an optic designed here (a lab id, standins/kernel/coatings.ts); a catalogue part's are the vendor's. */
  coating?: string;
  /** What the coated surface passes and turns, by wavelength (optikit-core `schema/response.py`, WP-74), as the record writes it. */
  response?: SurfaceResponse;
}

/** A wavelength band, µm; `null` on either side is open-ended. */
export type BandUm = [number | null, number | null];

/**
 * A surface's spectral response, as a library record writes it on the
 * surface (optikit-core `SurfaceResponse`, dashed keys). Wavelength gating
 * only: what it passes and turns, not how much it loses.
 */
export interface SurfaceResponse {
  kind: 'mirror' | 'sampler' | 'polarizing' | 'dichroic' | 'absorptive';
  /** The bands it reflects; the rest goes through. */
  'reflect-bands-um'?: BandUm[] | null;
  /** The bands an absorptive filter passes. */
  'transmit-bands-um'?: BandUm[] | null;
  /** A sampler's (beam splitter's) reflected fraction, 0–1, despite the name. */
  'transmit-ratio'?: number | null;
  /** A polarizing splitter's reflect axis, degrees: declared, not traced. */
  'polarization-deg'?: number | null;
}

/** A catalogue optic as optikit-v2's library records carry it (`ComponentRecord`, the parts holders read). */
export interface CatalogRecord {
  id: string;
  category: string;
  /** `bare` glass, or already `housed`/`cased` (a mounted SKU). */
  mount: 'bare' | 'housed' | 'cased' | 'cube';
  vendor?: { name: string; mpn: string };
  /** `optics.frames.optical.clear-aperture-mm`, when the record states it. */
  clearApertureMm?: number;
  /** `effective_focal_length_mm`, as the vendor states it. */
  eflMm?: number;
  fragmentSurfaces: FragmentSurface[];
}

export interface OpticFacts {
  category: string;
  mount: string;
  /** Widest the glass gets across the beam, mm. */
  acrossMm: number;
  thicknessMm: number;
  curved: boolean;
  rectangular: boolean;
  /** The record carries a surface stack: a holder can be cut from it. */
  hasFragment: boolean;
}

/** Glass behind a bare mirror surface: a record with one reflective flat states no thickness, and a holder still has to grip something. */
export const SUBSTRATE_MM = 3;

const finiteRadius = (r: FragmentSurface['geometry']) => (typeof r?.radius === 'number' && Number.isFinite(r.radius) && r.radius !== 0 ? r.radius : null);

/** What the record says about the glass. As optikit-v2's `opticFacts`. */
export function opticFacts(record: Pick<CatalogRecord, 'category' | 'mount' | 'fragmentSurfaces'>): OpticFacts {
  const surfaces = record.fragmentSurfaces;
  let across = 0;
  let rectangular = false;
  let curved = false;
  for (const s of surfaces) {
    const ap = s.aperture;
    if (ap && /rectangular/i.test(ap.type ?? '') && ap.x_min != null && ap.x_max != null && ap.y_min != null && ap.y_max != null) {
      rectangular = true;
      across = Math.max(across, Math.hypot(ap.x_max - ap.x_min, ap.y_max - ap.y_min));
    }
    across = Math.max(across, 2 * (s.semi_aperture ?? 0));
    if (finiteRadius(s.geometry) !== null) curved = true;
  }
  const thickness = surfaces.slice(0, -1).reduce((sum, s) => sum + (s.thickness ?? 0), 0);
  return { category: record.category, mount: record.mount, acrossMm: across, thicknessMm: thickness || SUBSTRATE_MM, curved, rectangular, hasFragment: surfaces.length > 0 };
}

/** The values a snapped part takes for its inputs: what the record really is. */
export function snappedValues(record: CatalogRecord): Record<string, number> {
  const facts = opticFacts(record);
  return {
    ...(record.eflMm !== undefined && { 'Focal length': record.eflMm }),
    ...(!facts.rectangular && { Diameter: Math.round(facts.acrossMm * 10) / 10 }),
  };
}

/** A part with no record: what its inputs say (a diameter), as bare glass with no prescription. */
export function factsFromInputs(category: string, diameterMm: number | undefined): OpticFacts {
  return { category, mount: 'bare', acrossMm: diameterMm ?? 25.4, thicknessMm: SUBSTRATE_MM, curved: false, rectangular: false, hasFragment: false };
}

/** A surface's sag at height r from its axis (mm, + toward the light's way); flat when the radius is infinite or r is past it. */
export function sag(radius: number | null, r: number): number {
  if (radius === null) return 0;
  const inside = radius * radius - r * r;
  if (inside <= 0) return radius;
  return radius - Math.sign(radius) * Math.sqrt(inside);
}

/** The glass of a round optic, as profiles to turn about its axis: one per element (a cemented doublet is two). */
export interface OpticShape {
  semiMm: number;
  /** Where each surface's vertex sits on the axis, mm, the stack centred on 0. */
  vertices: number[];
  radii: (number | null)[];
  /** Each element's outline as (r, z) points, from the axis round the rim and back: ready to turn. */
  elements: { material?: string; profile: [number, number][] }[];
  /** The front and back faces' extent on the axis, at the rim and at the centre. */
  front: (r: number) => number;
  back: (r: number) => number;
  centreThicknessMm: number;
  edgeThicknessMm: number;
}

/** The shape of a round optic from its record, centred on its axis midpoint. `null` for a rectangular plate. */
export function opticShape(record: Pick<CatalogRecord, 'fragmentSurfaces'>, steps = 24): OpticShape | null {
  const surfaces = record.fragmentSurfaces;
  if (surfaces.length < 2 || surfaces.some((s) => /rectangular/i.test(s.aperture?.type ?? ''))) return null;
  const semi = Math.max(...surfaces.map((s) => s.semi_aperture ?? 0));
  const radii = surfaces.map((s) => finiteRadius(s.geometry));
  const ct = surfaces.slice(0, -1).reduce((sum, s) => sum + (s.thickness ?? 0), 0);
  const vertices: number[] = [];
  let at = -ct / 2;
  for (const s of surfaces) {
    vertices.push(at);
    at += s.thickness ?? 0;
  }
  const z = (i: number, r: number) => vertices[i] + sag(radii[i], r);
  const rs = Array.from({ length: steps + 1 }, (_, k) => (semi * k) / steps);
  const elements = surfaces.slice(0, -1).map((s, i) => ({
    material: s.material_post,
    // Down the front face from the axis to the rim, then up the back face to the axis.
    profile: [...rs.map((r): [number, number] => [r, z(i, r)]), ...[...rs].reverse().map((r): [number, number] => [r, z(i + 1, r)])],
  }));
  const last = surfaces.length - 1;
  return {
    semiMm: semi,
    vertices,
    radii,
    elements,
    front: (r) => z(0, r),
    back: (r) => z(last, r),
    centreThicknessMm: ct,
    edgeThicknessMm: z(last, semi) - z(0, semi),
  };
}

/** Refractive indices at 587.6 nm (n_d) of the glasses the demo catalogue uses. */
export const GLASS_ND: Readonly<Record<string, number>> = {
  'N-BK7': 1.5168,
  'N-BAF10': 1.67,
  'N-SF10': 1.7283,
  'N-SF5': 1.6727,
  'N-SF6HT': 1.8052,
  'N-SSK5': 1.6584,
  'N-LAF7': 1.7495,
};

/**
 * The effective focal length of a surface stack, by a paraxial ray (y = 1,
 * parallel) traced through it: n₂u₂ = n₁u₁ − y·c·(n₂ − n₁). In air on both
 * sides; `null` if a glass is not in the table, or the stack does not focus.
 */
export function paraxialEfl(surfaces: FragmentSurface[], glass: Readonly<Record<string, number>> = GLASS_ND): number | null {
  let y = 1;
  let u = 0;
  let n1 = 1;
  for (const s of surfaces) {
    const n2 = s.material_post ? glass[s.material_post] : 1;
    if (n2 === undefined) return null;
    const r = finiteRadius(s.geometry);
    u = (n1 * u - y * (r ? 1 / r : 0) * (n2 - n1)) / n2;
    n1 = n2;
    y += (s.thickness ?? 0) * u;
  }
  return u === 0 ? null : -1 / u;
}

/**
 * The optic's cross-section through its axis, as SVG paths in mm (x along
 * the axis, y across it), one closed outline per element: what a drawing of
 * the part shows. Centred on the stack's middle.
 */
export function profilePaths(shape: OpticShape, steps = 24): string[] {
  const { semiMm: semi, vertices, radii } = shape;
  const z = (i: number, r: number) => vertices[i] + sag(radii[i], r);
  const rs = Array.from({ length: 2 * steps + 1 }, (_, k) => -semi + (semi * k) / steps);
  const pt = (x: number, y: number) => `${x.toFixed(3)} ${y.toFixed(3)}`;
  return vertices.slice(0, -1).map((_, i) => {
    const front = rs.map((r) => pt(z(i, r), r));
    const back = [...rs].reverse().map((r) => pt(z(i + 1, r), r));
    return `M${front.join('L')}L${back.join('L')}Z`;
  });
}
