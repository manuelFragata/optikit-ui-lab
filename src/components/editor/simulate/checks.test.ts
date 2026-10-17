import { describe, expect, it } from 'vitest';
import { beamOf, targetsOf } from '../../../standins/kernel/simulate/beam';
import { pupilOf } from '../../../standins/kernel/simulate/realtrace';
import { lookup, part, straight } from '../../../standins/kernel/simulate/testDesigns';
import { checksAt, worst } from './checks';

const free = { state: 'unmounted' as const, part: 'ideal', source: 'x' };

/** A laser, an f = 50 mm ideal lens 100 mm on, and a camera at `cameraAt` (grid units of 50 mm). */
function bench(cameraAt: number) {
  const { design, path } = straight([part('L', 'laser', 0), part('A', 'lens', 2, { 'Focal length': 50 }, free), part('C', 'camera', cameraAt)]);
  const [target] = targetsOf([beamOf(design, path, lookup)!]);
  return target;
}

const at = (cameraAt: number, beamMm = 10) => {
  const target = bench(cameraAt);
  return checksAt(target, pupilOf(target.beam, beamMm), beamMm, { part: target.part, offsetMm: 0 }, target.beam.wavelengthNm);
};

describe('the Simulate checks', () => {
  it('reads a camera at the lens’s focus as in focus, unclipped, with no coatings known', () => {
    const [focus, clipping, transmission] = at(3);
    expect(focus).toMatchObject({ id: 'focus', tone: 'ok', note: 'In focus' });
    expect(clipping).toMatchObject({ tone: 'ok', value: '39%' });
    expect(transmission.tone).toBe('none');
  });

  it('says where the best focus is when the camera is not there', () => {
    const [focus] = at(4);
    expect(focus.tone).toBe('bad');
    expect(focus.note).toMatch(/^Best focus −50 mm from here/);
    expect(focus.analysis).toBe('focus');
  });

  it('calls a beam wider than the lens clipped', () => {
    const checks = at(3, 30);
    expect(checks[1]).toMatchObject({ id: 'clipping', tone: 'bad' });
    expect(checks[1].note).toMatch(/rays stopped/);
    expect(worst(checks)).toBe('bad');
  });
});
