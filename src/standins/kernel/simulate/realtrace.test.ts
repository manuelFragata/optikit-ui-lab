import { describe, expect, it } from 'vitest';
import { airyRadius } from './realtrace';

describe('the diffraction limit', () => {
  it('is 0.61 λ / NA for a converging cone, and none for a parallel beam', () => {
    const cone = { rays: [{ rho: 1, z: 0, y: 5, slope: -0.1 }], paths: [], vignetted: 0 };
    expect(airyRadius(cone, 550)).toBeCloseTo((0.61 * 550e-6) / Math.sin(Math.atan(0.1)), 9);
    expect(airyRadius({ rays: [{ rho: 1, z: 0, y: 1, slope: 0 }], paths: [], vignetted: 0 }, 550)).toBeNull();
  });
});
