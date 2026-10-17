import { describe, expect, it } from 'vitest';
import { catalogParts } from '../library/catalog';
import { designedRecord, designLens, designMirror } from '../../components/editor/holders/designs';
import { withCoating } from '../../components/editor/holders/designs';
import { coatingChecks, reflectance, surfaceInfo, throughput, vendorCoating } from './coatings';

describe('coatings', () => {
  it('computes bare glass and a single MgF2 layer', () => {
    expect(reflectance('uncoated', 550, 1.5168)).toBeCloseTo(0.0422, 3);
    // A quarter wave of MgF2 on N-BK7, at its design wavelength.
    expect(reflectance('mgf2', 550, 1.5168)).toBeCloseTo(0.0126, 3);
    expect(reflectance('mgf2', 400, 1.5168)).toBeGreaterThan(reflectance('mgf2', 550, 1.5168));
  });

  it('keeps a broadband AR low in its band and lets it climb outside', () => {
    expect(reflectance('ar-a', 488)).toBeLessThan(0.005);
    expect(reflectance('ar-a', 1064)).toBeGreaterThan(0.04);
    expect(reflectance('ar-b', 488)).toBeGreaterThan(0.01);
  });

  it("reads Thorlabs' suffix as the vendor's coating, and leaves a cemented face uncoated", () => {
    expect(vendorCoating('AC254-050-A')).toBe('ar-a');
    expect(vendorCoating('LA1509-C')).toBe('ar-c');
    expect(vendorCoating('DMLP505')).toBeNull();
    const infos = surfaceInfo(catalogParts['AC254-050-A']);
    expect(infos.map((s) => s.role)).toEqual(['front', 'cemented', 'back']);
    expect(infos.map((s) => s.coating)).toEqual(['ar-a', null, 'ar-a']);
    // N-BAF10 against N-SF10: a glue line reflects almost nothing.
    expect(throughput(infos, 550)).toBeGreaterThan(0.99);
  });

  it('lets a designed lens carry its own coatings, uncoated until chosen', () => {
    const bare = designLens('biconvex', 50, 25.4);
    const record = designedRecord('L', 'lens', bare);
    expect(surfaceInfo(record).map((s) => s.coating)).toEqual(['uncoated', 'uncoated']);
    expect(throughput(surfaceInfo(record), 488)).toBeCloseTo(0.917, 2);
    expect(coatingChecks(surfaceInfo(record), [488])).toHaveLength(2);
    const coated = designedRecord('L', 'lens', withCoating(withCoating(bare, 0, 'ar-a'), 1, 'ar-a'));
    expect(coatingChecks(surfaceInfo(coated), [488])).toEqual([]);
    expect(coatingChecks(surfaceInfo(coated), [785])[0].message).toMatch(/outside 350–700/);
  });

  it("returns a mirror's face only, and warns when the coating is wrong for the light", () => {
    const record = designedRecord('M', 'mirror', withCoating(designMirror('concave', 200, 25.4), 0, 'au-protected'));
    const infos = surfaceInfo(record);
    expect(infos.map((s) => s.inLight)).toEqual([true, false]);
    expect(throughput(infos, 488)).toBeLessThan(0.5);
    expect(coatingChecks(infos, [488, 633]).map((c) => c.message)).toEqual(['Protected gold: 46% at 488 nm']);
    // A designed mirror with nothing chosen is assumed aluminium.
    expect(surfaceInfo(designedRecord('M2', 'mirror', designMirror('flat', 0, 25.4)))[0]).toMatchObject({ coating: 'al-protected', from: 'assumed' });
  });
});
