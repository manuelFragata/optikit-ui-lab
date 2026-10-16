import { describe, expect, it } from 'vitest';
import { designLens, focalLength } from '../holders/designs';
import { beamOf } from './beam';
import { measure, planeZ, run, toDesign, variablesOf, withValues, type Objective } from './optimize';
import { results, startRay, trace } from './paraxial';
import { bestFocus, pupilOf, realTrace, rmsAt } from './realtrace';
import { lookup, part, straight } from './testDesigns';

const free = { state: 'unmounted' as const, part: 'ideal', source: 'x' };
const designedLens = (id: string, x: number) => ({
  ...part(id, 'lens', x, { 'Focal length': 50, Diameter: 25.4 }, { state: 'unmounted', part: 'Designed lens', source: 'Designed here' }),
  prescription: designLens('biconvex', 50, 25.4),
});

describe('real rays on axis', () => {
  it('brings a collimated beam to a point through an ideal lens', () => {
    const { design, path } = straight([part('L', 'laser', 0), part('A', 'lens', 2, { 'Focal length': 50 }, free), part('C', 'camera', 3)]);
    const beam = beamOf(design, path, lookup)!;
    const t = realTrace(beam, pupilOf(beam, 10));
    expect(rmsAt(t, 150)).toBeLessThan(1e-9);
    expect(rmsAt(t, 160)).toBeGreaterThan(0.1);
  });

  it('shows a real singlet’s spherical aberration: the best focus falls short of the paraxial one', () => {
    const { design, path } = straight([part('L', 'laser', 0), designedLens('A', 2), part('C', 'camera', 3)]);
    const beam = beamOf(design, path, lookup)!;
    const pupil = pupilOf(beam, 20);
    const paraxialFocus = results(beam, trace(beam, startRay(beam, 20)), 20).out.focusMm!;
    const t = realTrace(beam, pupil, 81);
    const best = bestFocus(t, paraxialFocus, 10);
    expect(best).toBeLessThan(paraxialFocus - 0.2);
    expect(rmsAt(t, best)).toBeLessThan(rmsAt(t, paraxialFocus));
    expect(rmsAt(t, best)).toBeGreaterThan(0.005);
  });
});

describe('what each part lets vary', () => {
  it('offers a designed lens’s radii, thickness and place; a catalogue lens only its place; a frozen cartridge its offset', () => {
    const holder = { generator: 'lens_cartridge_v4', params: { part_position_mm: { x: 0, y: 0, z: 0 } } };
    const { design, path } = straight([
      part('L', 'laser', 0),
      designedLens('D', 2),
      part('T', 'lens', 4, {}, { state: 'unmounted', part: 'AC254-050-A', source: 'Thorlabs' }),
      part('H', 'lens', 6, { 'Focal length': 100 }, { state: 'in-cube', module: 'Holder for x', source: 'Generated here', seat: 0, frozen: true, holder }),
      part('C', 'camera', 9),
    ]);
    const groups = variablesOf(beamOf(design, path, lookup)!);
    expect(groups.map((g) => [g.part.id, g.variables.map((v) => v.label), g.fixed ?? null])).toEqual([
      ['D', ['Position', 'R1', 'R2', 'CT1'], null],
      ['T', ['Position'], null],
      ['H', ['In holder', 'f'], null],
    ]);
    expect(groups[2].variables[0]).toMatchObject({ min: -13, max: 13 });
  });
});

describe('the optimizer', () => {
  const emission = () => straight([part('O', 'objective', 2, { Magnification: 10, 'Numerical aperture': 0.25 }), part('T', 'lens', 4, { 'Focal length': 150 }, free), part('C', 'camera', 8)], 0);

  it('moves a tube lens within its bounds until the spot on the camera is smallest, and writes it back', () => {
    const { design, path } = emission();
    const beam = beamOf(design, path, lookup)!;
    const objective: Objective = { kind: 'rms-spot', plane: { part: 'C', offsetMm: 0 } };
    const position = variablesOf(beam)
      .flatMap((g) => g.variables)
      .find((v) => v.part === 'T' && v.kind === 'position')!;
    const pupil = pupilOf(beam, 2);
    const result = run(beam, [position], objective, pupil);
    expect(result.before).toBeGreaterThan(1000);
    expect(result.after).toBeLessThan(1);
    // The camera one focal length behind it.
    expect(planeZ(beam, objective.plane) - result.values[position.id]).toBeCloseTo(150, 1);
    const moved = toDesign(design, beam, [position], result.values);
    expect(moved.symbols.find((s) => s.id === 'T')!.x).toBeCloseTo(5, 2);
  });

  it('stays inside the bounds it is given', () => {
    const { design, path } = emission();
    const beam = beamOf(design, path, lookup)!;
    const position = { ...variablesOf(beam)[1].variables[0], min: 100, max: 150 };
    const result = run(beam, [position], { kind: 'rms-spot', plane: { part: 'C', offsetMm: 0 } }, pupilOf(beam, 2));
    expect(result.values[position.id]).toBeCloseTo(150, 3);
  });

  it('bends a designed lens to a focal length by its radii, and the prescription follows into the design', () => {
    const { design, path } = straight([part('L', 'laser', 0), designedLens('D', 2), part('C', 'camera', 6)]);
    const beam = beamOf(design, path, lookup)!;
    const radii = variablesOf(beam)[0].variables.filter((v) => v.kind === 'radius');
    const objective: Objective = { kind: 'focal-length', part: 'D', targetMm: 80 };
    const result = run(beam, radii, objective, pupilOf(beam, 2));
    expect(measure(withValues(beam, radii, result.values), objective, pupilOf(beam, 2))).toBeCloseTo(80, 1);
    const d = toDesign(design, beam, radii, result.values).symbols.find((s) => s.id === 'D')!;
    expect(focalLength(d.prescription!)).toBeCloseTo(80, 0);
    expect(d.inputs!.find((i) => i.label === 'Focal length')!.value).toBeCloseTo(80, 0);
  });
});
