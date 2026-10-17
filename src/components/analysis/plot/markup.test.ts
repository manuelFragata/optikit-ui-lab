import { describe, expect, it } from 'vitest';
import { plainOf, runsOf } from './markup';

describe('plot label markup', () => {
  it('sets *…* in italic', () => {
    expect(runsOf('Defocus Δ*z*')).toEqual([
      { text: 'Defocus Δ', italic: false, sub: false },
      { text: 'z', italic: true, sub: false },
    ]);
  });

  it('sets _{…} as a subscript, with italics inside', () => {
    expect(runsOf('*ε*_{*y*}')).toEqual([
      { text: 'ε', italic: true, sub: false },
      { text: 'y', italic: true, sub: true },
    ]);
    expect(runsOf('*r*_{RMS}')).toEqual([
      { text: 'r', italic: true, sub: false },
      { text: 'RMS', italic: false, sub: true },
    ]);
  });

  it('reads as plain text', () => {
    expect(plainOf('Pupil coordinate *P*_{*y*}')).toBe('Pupil coordinate Py');
    expect(plainOf('Wavelength')).toBe('Wavelength');
  });
});
