import { describe, expect, it } from 'vitest';
import { sketchShape } from './sketchShapes';
import { divergenceRad, stageOf, specLine, type SymbolParam } from './model';

const input = (label: string, value: number, unit = 'mm'): SymbolParam => ({ label, value, unit, min: -1000, max: 1000, step: 1 });

describe('an ideal part is drawn as what it does, at its true size', () => {
  it('a lens: a line as long as its Ø, arrow heads out for a positive f and in for a negative one, its foci at ±f', () => {
    const plus = sketchShape({ kind: 'lens', inputs: [input('Focal length', 50), input('Diameter', 30)] });
    expect(plus.lines[0].points).toEqual([
      [0, -15],
      [0, 15],
    ]);
    expect(plus.foci).toEqual([-50, 50]);
    // The top arrow head: its wings below its tip for f > 0 (pointing out), above it for f < 0 (pointing in).
    const wingY = (f: number) => sketchShape({ kind: 'lens', inputs: [input('Focal length', f), input('Diameter', 30)] }).lines[1].points[0][1];
    expect(wingY(50)).toBeLessThan(15);
    expect(wingY(-50)).toBeGreaterThan(15);
  });

  it('a mirror: flat at f = 0, curved toward the light for a positive f (R = 2f), at 45°', () => {
    const face = (f: number) => sketchShape({ kind: 'mirror', inputs: [input('Focal length', f), input('Diameter', 20)] }).lines[0].points;
    expect(face(0).every(([x]) => x === 0)).toBe(true);
    // Sag at the rim: y² / 2R = 100 / 200 = 0.5 mm, toward the incoming light (−x).
    expect(face(50)[0][0]).toBeCloseTo(-0.5, 6);
    expect(face(-50)[0][0]).toBeCloseTo(0.5, 6);
    expect(sketchShape({ kind: 'mirror', inputs: [] }).at45).toBe(true);
  });

  it('a source: its beam leaves at its waist Ø and opens at its divergence', () => {
    const laser = sketchShape({ kind: 'laser', inputs: [input('Waist diameter', 2), input('Divergence', 100, 'mrad')] });
    const [edge] = laser.lines.filter((l) => l.faint);
    const [[x0, y0], [x1, y1]] = edge.points;
    expect(Math.abs(y0)).toBeCloseTo(1, 6);
    expect((Math.abs(y1) - Math.abs(y0)) / (x1 - x0)).toBeCloseTo(Math.tan(0.05), 6);
    expect(divergenceRad({ inputs: [input('Divergence', 30, '°')] })).toBeCloseTo(Math.PI / 6, 6);
  });
});

describe('the three steps of a part', () => {
  it('ideal, then a real optic from the catalogue or designed here, then mounted in a module or a holder made here', () => {
    expect(stageOf({ placement: { state: 'ideal' } })).toEqual({ step: 'ideal', origin: null });
    expect(stageOf({ placement: { state: 'unmounted', part: 'AC254-050-A', source: 'Thorlabs parts' } })).toEqual({ step: 'real', origin: 'catalogue' });
    expect(stageOf({ placement: { state: 'unmounted', part: 'Designed lens', source: 'Designed here' }, prescription: [] })).toEqual({ step: 'real', origin: 'designed' });
    expect(stageOf({ placement: { state: 'in-cube', module: 'Lens holder', source: 'openUC2', seat: 0 } })).toEqual({ step: 'mounted', origin: 'module' });
    expect(stageOf({ placement: { state: 'in-cube', module: 'Holder for X', source: 'Generated here', seat: 0, frozen: true } })).toEqual({ step: 'mounted', origin: 'holder' });
  });

  it('say a flat ideal mirror is flat', () => {
    expect(specLine({ kind: 'mirror', inputs: [input('Focal length', 0), input('Diameter', 25)] })).toBe('flat · Ø 25 mm');
  });
});
