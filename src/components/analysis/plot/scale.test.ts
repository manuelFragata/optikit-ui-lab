import { describe, expect, it } from 'vitest';
import { lengthText, lengthUnit, niceStep, tickLabel, ticks } from './scale';

describe('plot scales', () => {
  it('steps by 1, 2 or 5 × a power of ten', () => {
    expect(niceStep(10, 5)).toBe(2);
    expect(niceStep(0.37, 5)).toBe(0.1);
    expect(niceStep(640, 6)).toBe(200);
    expect(niceStep(1, 4)).toBe(0.5);
  });

  it('widens the domain to whole steps when nice, and keeps it otherwise', () => {
    expect(ticks(0.3, 9.6)).toEqual({ domain: [0, 10], step: 2, values: [0, 2, 4, 6, 8, 10] });
    const inside = ticks(-321, 321, { nice: false, count: 8 });
    expect(inside.domain).toEqual([-321, 321]);
    expect(inside.values).toEqual([-300, -200, -100, 0, 100, 200, 300]);
  });

  it('opens a domain of one value', () => {
    expect(ticks(5, 5).domain[0]).toBeLessThan(5);
    expect(ticks(0, 0).values.length).toBeGreaterThan(1);
  });

  it('labels ticks with the decimals the step needs and a true minus', () => {
    expect(tickLabel(-0.5, 0.5)).toBe('−0.5');
    expect(tickLabel(200, 100)).toBe('200');
    expect(tickLabel(-0.0000001, 0.1)).toBe('0.0');
    expect(tickLabel(0.25, 0.05)).toBe('0.25');
  });

  it('shows lengths below a millimetre in µm', () => {
    expect(lengthUnit(0.4)).toEqual({ unit: 'µm', perMm: 1000 });
    expect(lengthUnit(13)).toEqual({ unit: 'mm', perMm: 1 });
    expect(lengthText(0.00164)).toBe('1.64 µm');
    expect(lengthText(13.13)).toBe('13.1 mm');
  });
});
