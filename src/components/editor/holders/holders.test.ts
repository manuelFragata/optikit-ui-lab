import { describe, expect, it } from 'vitest';
import { catalogList, catalogParts } from '../../../demo/catalogParts';
import { snapped, sketched, specLine } from '../model';
import { snapCandidates, snappedValues } from './snap';
import { cartridgeDefaults, cavityRadius, jointFor, layout, notchedSide, planCartridge, type CartridgeParams } from './cartridge';
import { GENERATORS, holdRefusal, roadsFor } from './generators';
import { factsFromInputs, opticFacts, opticShape, paraxialEfl } from './optic';

const ac254 = catalogParts['AC254-050-A'];
const shape = opticShape(ac254)!;
const params = (patch: Partial<CartridgeParams> = {}): CartridgeParams => ({ ...cartridgeDefaults(ac254.id), ...patch });
const codes = (p: CartridgeParams, beam = 12) => planCartridge(p, shape, beam).checks.map((c) => c.code);

describe('the optic', () => {
  it('reads the facts a holder needs off the record', () => {
    expect(opticFacts(ac254)).toEqual({ category: 'lens', mount: 'bare', acrossMm: 25.4, thicknessMm: 11.5, curved: true, rectangular: false, hasFragment: true });
    const plate = opticFacts(catalogParts.DMLP505);
    expect(plate).toMatchObject({ rectangular: true, curved: false, thicknessMm: 1 });
    expect(plate.acrossMm).toBeCloseTo(Math.hypot(25, 36));
  });

  it('turns the prescription into the doublet Thorlabs draws', () => {
    expect(shape.elements).toHaveLength(2);
    expect(shape.centreThicknessMm).toBeCloseTo(11.5);
    // Thorlabs: edge thickness 8.7 mm.
    expect(shape.edgeThicknessMm).toBeCloseTo(8.7, 1);
    expect(opticShape(catalogParts.DMLP505)).toBeNull();
  });
});

describe('which road holds it', () => {
  it('offers the lens cartridge for the doublet, and says why the others refuse', () => {
    const roads = roadsFor(opticFacts(ac254));
    const open = roads.filter((r) => !r.refusal).map((r) => r.spec.script);
    expect(open).toEqual(['focus_cartridge_v4', 'lens_cartridge_v4', 'boolean_holder_1x1']);
    expect(roads.find((r) => r.spec.script === 'fold_insert_v4')?.refusal).toBe('this road does not hold a lens');
  });

  it('refuses in the order optikit-v2 does', () => {
    const cartridge = GENERATORS.find((g) => g.script === 'lens_cartridge_v4')!.holds;
    expect(holdRefusal(cartridge, factsFromInputs('lens', 25))).toMatch(/prescription/);
    expect(holdRefusal(cartridge, { ...opticFacts(ac254), acrossMm: 40 })).toMatch(/up to 36 mm/);
    expect(holdRefusal(cartridge, { ...opticFacts(ac254), mount: 'housed' })).toMatch(/bare glass/);
  });
});

describe('the cartridge', () => {
  it('meets at the snapped joint planes, the notched master holding the notch', () => {
    expect(jointFor(0, true)).toBe(-2);
    expect(jointFor(3.01, true)).toBe(3);
    expect(jointFor(5.4, true)).toBe(7);
    expect(jointFor(20, false)).toBe(13);
    expect([3, -2, 8].map(notchedSide)).toEqual([1, 1, 1]);
    expect([2, -3, 7].map(notchedSide)).toEqual([-1, -1, -1]);
  });

  it('lays out like v2’s published AC254-050 holder: joint 3, halves about 1 mm past the glass', () => {
    const L = layout(params({ part_position_mm: { x: 0, y: 0, z: 3 } }), shape);
    expect(L.joint).toBe(3);
    expect(L.masters).toEqual([
      { name: 'master_notched', span: [3, 7] },
      { name: 'master_smooth', span: [-1, 3] },
    ]);
    expect(L.back[0]).toBeCloseTo(3 - 5.75 - 1);
    expect(L.front[1]).toBeCloseTo(3 + 5.75 + 1);
  });

  it('cuts the glass plus clearance, and the bore past it', () => {
    const at = (z: number) => cavityRadius(z, 0, shape, 0.15, 22.9);
    expect(at(0)).toBeCloseTo(12.85);
    expect(at(-5.5)).toBeCloseTo(22.9 / 2); // in front of the glass: the bore
    expect(at(30)).toBeCloseTo(22.9 / 2);
  });

  it('fits by default, with a 12 mm beam clear', () => {
    const plan = planCartridge(params(), shape, 12);
    expect(plan.fits).toBe(true);
    expect(plan.fits_envelope).toBe(true);
    expect(codes(params())).toContain('BEAM_CLEAR');
  });

  it('catches the beam clipped as the lens moves off it, and the lens past the cube', () => {
    // Ø22.9 bore: a Ø16 beam clears it by 3.45 mm on the axis, and is clipped 4 mm off it.
    expect(codes(params(), 16)).toContain('BEAM_CLEAR');
    expect(codes(params({ part_position_mm: { x: 4, y: 0, z: 0 } }), 16)).toContain('DRC_BEAM_CLIPPED');
    expect(codes(params({ part_position_mm: { x: 0, y: 0, z: 0 } }), 24)).toContain('DRC_BEAM_CLIPPED');
    // 6 mm off: the Ø25.4 lens and its wall no longer fit the cube's 19.2 mm.
    expect(codes(params({ part_position_mm: { x: 6, y: 0, z: 0 } }))).toContain('E_RADIAL');
  });

  it('refuses a lens past the joint’s reach, or a bore as wide as the lens', () => {
    expect(codes(params({ part_position_mm: { x: 0, y: 0, z: 18 } }))).toContain('E_JOINT');
    expect(codes(params({ clear_aperture_mm: 25.4 }))).toContain('E_CLEAR_APERTURE');
    expect(planCartridge(params({ clear_aperture_mm: 25.4 }), shape, 12).fits).toBe(false);
  });
});

describe('the catalogue', () => {
  it('focuses where each record says: its prescription traced, to 1 %', () => {
    for (const r of catalogList.filter((x) => x.eflMm)) {
      const f = paraxialEfl(r.fragmentSurfaces);
      expect(f, r.vendor?.mpn).not.toBeNull();
      expect(Math.abs(f! - r.eflMm!) / r.eflMm!, r.vendor?.mpn).toBeLessThan(0.01);
    }
  });
});

describe('snapping an ideal lens', () => {
  it('puts the lenses of its focal length first, and only lenses', () => {
    const ranked = snapCandidates({ kind: 'lens', focalMm: 50, diameterMm: 25 }, catalogList).map((c) => c.record.vendor?.mpn);
    expect(ranked.slice(0, 2).sort()).toEqual(['AC254-050-A', 'LA1131-A']);
    expect(ranked).not.toContain('DMLP505');
  });

  it('says how a part falls short, and which holders take it', () => {
    const [best] = snapCandidates({ kind: 'lens', focalMm: 100, diameterMm: 25 }, catalogList);
    expect(best.matches).toBe(true);
    expect(best.holders).toContain('V4 lens cartridge');
    const wide = snapCandidates({ kind: 'lens', focalMm: 100, diameterMm: 25 }, catalogList).find((c) => c.record.vendor?.mpn === 'AC508-100-A')!;
    expect(wide.notes).toEqual(['Ø50.8: wider than needed']);
    // Ø50.8 is past every cube holder's reach.
    expect(wide.holders).not.toContain('V4 lens cartridge');
    const narrow = snapCandidates({ kind: 'lens', focalMm: 50, diameterMm: 40 }, catalogList)[0];
    expect(narrow.notes.some((n) => n.includes('narrower'))).toBe(true);
  });

  it('takes the part’s real values, and can go back to the sketch', () => {
    const ideal = { placement: { state: 'ideal' as const }, inputs: [
      { label: 'Focal length', value: 48, unit: 'mm', min: 10, max: 300, step: 1 },
      { label: 'Diameter', value: 25, unit: 'mm', min: 6, max: 50, step: 0.5 },
    ] };
    expect(specLine(ideal)).toBe('f = 48 mm · Ø 25 mm');
    const patch = snapped(ideal, 'AC254-050-A', 'Thorlabs', snappedValues(catalogParts['AC254-050-A']));
    expect(patch.placement).toEqual({ state: 'unmounted', part: 'AC254-050-A', source: 'Thorlabs' });
    expect(patch.inputs?.map((i) => i.value)).toEqual([50, 25.4]);
    expect(sketched(patch.placement!)).toEqual({ state: 'ideal' });
  });
});
