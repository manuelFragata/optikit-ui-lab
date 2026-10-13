import { describe, expect, it } from 'vitest';
import { alongAxis, fromThree, hitPlane, stepAcross, stepAlong } from './drag3d';
import { toThree } from './layout3d';

describe('frames', () => {
  it('undoes toThree', () => {
    expect(fromThree(toThree([1, 2, 3]))).toEqual([1, 2, 3]);
  });
});

describe('hitPlane', () => {
  it('finds where a ray from above meets a layer', () => {
    expect(hitPlane({ origin: [0, 0, 100], dir: [1, 0, -1] }, 80)).toEqual([20, 0, 80]);
  });

  it('misses when the ray runs flat or looks away', () => {
    expect(hitPlane({ origin: [0, 0, 100], dir: [1, 0, 0] }, 80)).toBeNull();
    expect(hitPlane({ origin: [0, 0, 100], dir: [0, 0, 1] }, 80)).toBeNull();
  });
});

describe('alongAxis', () => {
  it('finds the point on an axis nearest to the ray', () => {
    // A ray straight down at x = 30 crosses the x axis through the origin at 30.
    expect(alongAxis({ origin: [30, 0, 500], dir: [0, 0, -1] }, [0, 0, 0], 'x')).toBeCloseTo(30);
    // Seen from the front, the z axis through (0, 0, 80) is met at height 120.
    expect(alongAxis({ origin: [0, -500, 120], dir: [0, 1, 0] }, [0, 0, 80], 'z')).toBeCloseTo(40);
  });

  it('gives up when the ray runs along the axis', () => {
    expect(alongAxis({ origin: [0, 0, 0], dir: [1, 0, 0] }, [0, 5, 0], 'x')).toBeNull();
  });
});

describe('steps', () => {
  it('land on whole cubes, or on tenths when free', () => {
    expect(stepAlong('x', 2, 70, false)).toBe(1); // 2 + 1.4 cubes lands on 3
    expect(stepAlong('x', 2.3, 70, false)).toBe(1.7); // lands on the grid, from off it
    expect(stepAlong('y', 2, 70, true)).toBe(1.4);
  });

  it('go a whole layer at a time along z, free or not', () => {
    expect(stepAlong('z', 1, 60, true)).toBe(1);
    expect(stepAlong('z', 1, -20, false)).toBe(0);
  });

  it('across a layer combine x and y', () => {
    expect(stepAcross({ x: 0, y: 0 }, [0, 0, 80], [100, -60, 80], false)).toEqual({ x: 2, y: -1 });
  });
});
