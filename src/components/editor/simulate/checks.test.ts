import { describe, expect, it } from 'vitest';
import type { Place } from '../../../ports/analysis';
import { catalogRecord } from '../../../standins/library/catalog';
import { standinAnalysis } from '../../../standins/kernel/simulate/standinAnalysis';
import { part, straight } from '../../../standins/kernel/simulate/testDesigns';
import { checksOf, DEFAULT_SETTINGS, length, worst } from './checks';

const free = { state: 'unmounted' as const, part: 'ideal', source: 'x' };
const analysis = standinAnalysis({ record: catalogRecord });

/** A laser, an f = 50 mm ideal lens 100 mm on, and a camera at `cameraAt` (grid units of 50 mm), read through the analysis port. */
function placeAt(cameraAt: number, beamMm = 10): Place {
  const { design, path } = straight([part('L', 'laser', 0), part('A', 'lens', 2, { 'Focal length': 50 }, free), part('C', 'camera', cameraAt)]);
  const [place] = analysis.places({ design, light: { paths: [path], misses: [] }, settings: { ...DEFAULT_SETTINGS, beamMm } });
  return place;
}

describe('the Simulate checks', () => {
  it('reads a camera at an ideal lens’s focus as diffraction-limited, unclipped, with no coatings known', () => {
    const place = placeAt(3);
    const [focus, clipping, transmission] = checksOf(place);
    // A perfect lens makes a geometric point: what one sees is the Airy disc, 0.61 λ / NA.
    const f = place.numbers.focus;
    if (f.kind !== 'focus') throw new Error('expected a focus');
    expect(f.airyMm).toBeCloseTo((0.61 * f.airyNm * 1e-6) / Math.sin(Math.atan(5 / 50)), 6);
    expect(focus).toMatchObject({ id: 'focus', tone: 'ok', value: length(f.airyMm!) });
    expect(focus.note).toMatch(/^Diffraction-limited: the Airy radius/);
    expect(clipping).toMatchObject({ tone: 'ok', value: '39%' });
    expect(transmission.tone).toBe('none');
  });

  it('marks numbers that stand on what the design does not say as estimates', () => {
    const [focus, clipping] = checksOf(placeAt(3));
    expect(focus.caveats).toContain('A: an ideal thin lens');
    expect(clipping.caveats).toContain('A: one inch across');
  });

  it('says where the best focus is when the camera is not there', () => {
    const [focus] = checksOf(placeAt(4));
    expect(focus.tone).toBe('bad');
    expect(focus.note).toMatch(/^Best focus −50 mm from here/);
    expect(focus.analysis).toBe('focus');
  });

  it('calls a beam wider than the lens clipped', () => {
    const checks = checksOf(placeAt(3, 30));
    expect(checks[1]).toMatchObject({ id: 'clipping', tone: 'bad' });
    expect(checks[1].note).toMatch(/rays stopped/);
    expect(worst(checks)).toBe('bad');
  });

  it('gives no length a false zero', () => {
    expect(length(0)).toBe('< 0.1 µm');
    expect(length(0.0042)).toBe('4.2 µm');
  });
});
