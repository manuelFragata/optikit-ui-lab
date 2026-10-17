import { describe, expect, it } from 'vitest';
import { GENERATORS, holdRefusal } from '../../../standins/service/generators';
import { designChecks, designedRecord, designedValues, designLens, designMirror, focalLength, LENS_FORMS, mirrorForm, withFocalLength } from './designs';
import { opticFacts, opticShape } from './optic';

describe('designing a lens', () => {
  it('makes every form focus where asked, traced as a thick lens', () => {
    for (const { form } of LENS_FORMS) {
      const s = designLens(form, 75, 25.4);
      const f = focalLength(s)!;
      const want = form === 'biconcave' || form === 'plano-concave' ? -75 : 75;
      // The achromat is AC254-050-A's shape scaled: within a percent.
      expect(Math.abs(f - want) / 75, form).toBeLessThan(form === 'achromat' ? 0.01 : 1e-3);
    }
  });

  it('keeps a rim a lens can be held by, and a plano-convex flat on one side', () => {
    const s = designLens('plano-convex', 50, 25.4);
    expect(s[1].geometry?.radius).toBe('inf');
    expect(opticShape({ fragmentSurfaces: s })!.edgeThicknessMm).toBeCloseTo(2, 1);
    expect(designChecks(s)).toEqual([]);
  });

  it('bends to another focal length, and says when the glass cannot be that strong', () => {
    const s = withFocalLength(designLens('biconvex', 50, 25.4), 120);
    expect(focalLength(s)).toBeCloseTo(120, 1);
    expect(opticShape({ fragmentSurfaces: s })!.edgeThicknessMm).toBeGreaterThanOrEqual(1.99);
    // f = 10 at Ø25.4: radii tighter than the lens is wide.
    expect(designChecks(designLens('biconvex', 10, 25.4)).some((c) => c.severity === 'error')).toBe(true);
  });

  it('reads as a record a holder can take: the lens cartridge cuts it from its own prescription', () => {
    const record = designedRecord('S9', 'lens', designLens('biconvex', 50, 25.4));
    expect(record.eflMm).toBeCloseTo(50, 0);
    const cartridge = GENERATORS.find((g) => g.script === 'lens_cartridge_v4')!.holds;
    expect(holdRefusal(cartridge, opticFacts(record))).toBeNull();
    expect(designedValues(record.fragmentSurfaces)).toEqual({ 'Focal length': 50, Diameter: 25.4 });
  });
});

describe('designing a mirror', () => {
  it('focuses at half its radius, concave facing the light', () => {
    const concave = designMirror('concave', 200, 25.4);
    expect(focalLength(concave)).toBe(100);
    expect(mirrorForm(concave)).toBe('concave');
    expect(focalLength(designMirror('convex', 200, 25.4))).toBe(-100);
    expect(focalLength(designMirror('flat', 200, 25.4))).toBeNull();
  });

  it('is held by the roads that take curved glass, not the flat-only fold insert', () => {
    const facts = opticFacts(designedRecord('S1', 'mirror', designMirror('concave', 200, 25.4)));
    const refusal = (script: string) => holdRefusal(GENERATORS.find((g) => g.script === script)!.holds, facts);
    expect(refusal('fold_insert_v4')).toMatch(/flat plates/);
    expect(refusal('kinematic_adapter_v4')).toBeNull();
    expect(refusal('fold_insert_v4') && opticFacts(designedRecord('S1', 'mirror', designMirror('flat', 0, 25.4))).curved).toBe(false);
  });
});
