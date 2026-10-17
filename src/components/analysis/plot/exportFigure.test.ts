import { describe, expect, it } from 'vitest';
import { fileNameOf, isDark, schemeOf } from './exportFigure';

describe('plot export', () => {
  it('names the file after the figure', () => {
    expect(fileNameOf('Spot · at Camera')).toBe('spot-at-camera');
    expect(fileNameOf('Beam envelope · Sample → Camera')).toBe('beam-envelope-sample-camera');
    expect(fileNameOf('Through focus · at Camera +2.5 mm')).toBe('through-focus-at-camera-2-5-mm');
    expect(fileNameOf('···')).toBe('plot');
  });
});

describe('plot grounds', () => {
  it('sets light ink on light grounds and dark ink on dark ones', () => {
    expect(schemeOf('white')).toBe('light');
    expect(schemeOf('transparent')).toBe('light');
    expect(schemeOf('dark')).toBe('dark');
    expect(schemeOf('#f4efe6')).toBe('light');
    expect(schemeOf('#1e2a3a')).toBe('dark');
    expect(isDark('#666666')).toBe(true);
    expect(isDark('#bbbbbb')).toBe(false);
    expect(isDark('not a colour')).toBe(false);
  });
});
