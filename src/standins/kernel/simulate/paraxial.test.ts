import { describe, expect, it } from 'vitest';
import type { LightPath } from '../../../ports/light';
import { beamOf, targetsOf } from './beam';
import { results, startRay, trace } from './paraxial';
import { lookup, part, straight } from './testDesigns';

describe('the beam and its paraxial trace', () => {
  it("puts the sample at the objective's focus on the way in, too", () => {
    const { design, path } = straight([part('L', 'laser', 0, { Wavelength: 488 }), part('O', 'objective', 2, { Magnification: 10 })]);
    const withSample: LightPath = { ...path, points: [...path.points, { x: 6.5, y: 0 }], parts: [...path.parts!, 'sample'] };
    const beam = beamOf(design, withSample, lookup)!;
    expect(beam.elements.map((e) => e.atMm)).toEqual([0, 100, 118]);
    expect(beam.endMm).toBe(118);
    // A collimated beam comes to its focus right on the sample.
    const r = results(beam, trace(beam, startRay(beam, 2)), 2);
    expect(r.out.focusMm).toBeCloseTo(118, 6);
  });

  it('focuses at f off an ideal curved mirror, and starts a source beam at its waist, opening at its divergence', () => {
    const { design, path } = straight([part('L', 'laser', 0, { 'Waist diameter': 2, Divergence: 0 }), part('M', 'mirror', 2, { 'Focal length': 50 }, { state: 'ideal' }), part('C', 'camera', 4)]);
    const beam = beamOf(design, path, lookup)!;
    expect(beam.sourceBeamMm).toBe(2);
    expect(results(beam, trace(beam, startRay(beam, 2)), 2).out.focusMm).toBeCloseTo(150, 6);
    // 4 mrad: the edge ray climbs 2 µm per mm.
    const opening = beamOf(
      straight([part('L', 'laser', 0, { 'Waist diameter': 2, Divergence: 4 }), part('C', 'camera', 2)]).design,
      straight([part('L', 'laser', 0), part('C', 'camera', 2)]).path,
      lookup,
    )!;
    expect(startRay(opening, 2).u).toBeCloseTo(0.002, 6);
  });

  it('expands a laser beam with two lenses a sum of focal lengths apart', () => {
    const { design, path } = straight([
      part('L', 'laser', 0, { Wavelength: 488, Power: 10 }),
      part('A', 'lens', 2, { 'Focal length': 50 }),
      part('B', 'lens', 5, { 'Focal length': 100 }),
      part('C', 'camera', 8),
    ]);
    const beam = beamOf(design, path, lookup)!;
    expect(beam.elements.map((e) => e.atMm)).toEqual([0, 100, 250, 400]);
    const r = results(beam, trace(beam, startRay(beam, 2)), 2);
    expect(r.out.collimated).toBe(true);
    expect(r.expansion).toBeCloseTo(2, 6);
    expect(r.elements.find((e) => e.id === 'B')!.beamMm).toBeCloseTo(4, 6);
    // Two ideal lenses: no coatings known, the budget counts them lossless.
    expect(r.budget).toMatchObject({ fraction: 1, known: 0, unknown: 2, powerMw: 10 });
  });

  it('images the sample at 10× through an objective and a 180 mm tube lens, on the camera', () => {
    const { design, path } = straight([part('O', 'objective', 2, { Magnification: 10, 'Numerical aperture': 0.25 }), part('T', 'lens', 5, { 'Focal length': 180 }), part('C', 'camera', 8.6)], 0);
    const beam = beamOf(design, path, lookup)!;
    // The sample sits at the objective's front focus, not where its symbol is drawn; distances count from it.
    expect(beam.elements.map((e) => e.atMm)).toEqual([0, 18, 168, 348]);
    const r = results(beam, trace(beam, startRay(beam, 2)), 2);
    expect(r.focusOffsetMm).toBeCloseTo(0, 6);
    expect(Math.abs(r.magnification!)).toBeCloseTo(10, 6);
    // The cone fills the objective's pupil: 2·NA·f.
    expect(r.elements.find((e) => e.id === 'O')!.beamMm).toBeCloseTo(9, 6);
  });

  it('traces a catalogue lens surface by surface, and knows what its coatings pass', () => {
    const tube = part('T', 'lens', 5, { 'Focal length': 50 }, { state: 'unmounted', part: 'AC254-050-A', source: 'Thorlabs parts' });
    const { design, path } = straight([part('L', 'laser', 0, { Wavelength: 488, Power: 20 }), tube, part('C', 'camera', 8)]);
    const beam = beamOf(design, path, lookup)!;
    const t = beam.elements[1];
    expect(t.surfaces).toHaveLength(3);
    const r = results(beam, trace(beam, startRay(beam, 2)), 2);
    // A thick doublet focuses about its back focal length behind its back vertex, near f.
    expect(r.out.focusMm! - t.atMm).toBeGreaterThan(40);
    expect(r.out.focusMm! - t.atMm).toBeLessThan(50);
    expect(r.budget.known).toBe(1);
    expect(r.budget.powerMw).toBeGreaterThan(19.8);
  });

  it('says when a part clips the beam', () => {
    const { design, path } = straight([part('L', 'laser', 0), part('A', 'lens', 2, { 'Focal length': 50, Diameter: 6 })]);
    const beam = beamOf(design, path, lookup)!;
    expect(results(beam, trace(beam, startRay(beam, 8)), 8).elements[1].clipped).toBe(true);
  });
});

describe('where the light is read', () => {
  it('names each path by the detector it reaches: a camera, the sample, or where it runs out', () => {
    const cam = straight([part('O', 'objective', 2, { Magnification: 10 }), part('C', 'camera', 6)], 0);
    const onto = straight([part('L', 'laser', 0), part('O', 'objective', 2, { Magnification: 10 })]);
    const toSample: LightPath = { ...onto.path, ray: { ...onto.path.ray, id: 'x' }, points: [...onto.path.points, { x: 6.5, y: 0 }], parts: [...onto.path.parts!, 'sample'] };
    const out = straight([part('L', 'laser', 0), part('A', 'lens', 2, { 'Focal length': 50 })]);
    const runsOut: LightPath = { ...out.path, ray: { ...out.path.ray, id: 'y', label: 'beam' }, open: true, points: [...out.path.points, { x: 7, y: 0 }] };
    const beams = [beamOf(cam.design, cam.path, lookup)!, beamOf(onto.design, toSample, lookup)!, beamOf(out.design, runsOut, lookup)!];
    expect(targetsOf(beams).map((t) => [t.label, t.part])).toEqual([
      ['C', 'C'],
      ['Sample', 'sample'],
      ['Open end', 'end'],
    ]);
  });
});
