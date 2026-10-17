import { describe, expect, it } from 'vitest';
import type { SchematicSymbol, Seat, SymbolKind } from '../../components/editor/model';
import { demoLight } from './light';

const part = (id: string, kind: SymbolKind, x: number, y: number, seat: Seat = 0, patch: Partial<SchematicSymbol> = {}): SchematicSymbol => ({
  id,
  label: id,
  kind,
  type: kind,
  x,
  y,
  z: 1,
  placement: { state: 'in-cube', module: kind, source: 'Core Box', seat },
  notes: '',
  ...patch,
});

const lightOf = (...symbols: SchematicSymbol[]) => demoLight({ symbols, groups: [], unitMm: 50 });
/** The one path of a design with one, or the path that starts at `start`. */
const pathOf = (symbols: SchematicSymbol[], start = 'L') => lightOf(...symbols).paths.find((p) => p.parts?.[0] === start)!;

const laser = (x = 0, y = 0, seat: Seat = 0, nm = 488) => part('L', 'laser', x, y, seat, { label: 'Laser', inputs: [{ label: 'Wavelength', value: nm, unit: 'nm', min: 400, max: 700, step: 1 }] });
const dichroic = (x: number, y: number, seat: Seat, cutOn: number) =>
  part('D', 'dichroic', x, y, seat, { inputs: [{ label: 'Cut-on wavelength', value: cutOn, unit: 'nm', min: 400, max: 700, step: 1 }] });

describe('the demo light, found from the parts', () => {
  it('shines the way its source faces: +x at seat 0, a quarter turn clockwise per seat', () => {
    expect(pathOf([laser(0, 0, 1)]).points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: -5 },
    ]);
  });

  it('has no light without a source', () => {
    expect(lightOf(part('C', 'camera', 3, 0)).paths).toEqual([]);
  });

  it('turns at a mirror as its plate sits: "/" at seat 0, "\\" at seat 1', () => {
    expect(pathOf([laser(), part('M', 'mirror', 4, 0, 0)]).points[2]).toEqual({ x: 4, y: 5 });
    expect(pathOf([laser(), part('M', 'mirror', 4, 0, 1)]).points[2]).toEqual({ x: 4, y: -5 });
  });

  it('stops at a camera, and names the path from its start to its end', () => {
    const path = pathOf([laser(), part('A', 'lens', 3, 0), part('C', 'camera', 6, 0, 0, { label: 'Camera' })]);
    expect(path.parts).toEqual(['L', 'A', 'C']);
    expect(path.open).toBe(false);
    expect(path.ray.label).toBe('Laser → Camera');
  });

  it('runs out past a mirror moved away, and says which detector no light reaches', () => {
    const light = lightOf(laser(), part('M', 'mirror', 4, 2, 1), part('C', 'camera', 4, -4, 0, { label: 'Camera' }));
    expect(light.paths[0].points).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
    ]);
    expect(light.paths[0].open).toBe(true);
    expect(light.paths[0].ray.label).toBe('Laser → open end');
    expect(light.misses).toMatchObject([{ label: 'Camera', at: { x: 4, y: -4 }, from: { x: 5, y: 0 } }]);
  });

  it('still catches a part a little off the line, within its aperture', () => {
    expect(pathOf([laser(), part('A', 'lens', 3, 0.2)]).parts).toContain('A');
    expect(pathOf([laser(), part('A', 'lens', 3, 0.5)]).parts).not.toContain('A');
  });

  it('turns at a dichroic below its cut-on, and passes it above', () => {
    expect(pathOf([laser(0, 0, 0, 488), dichroic(4, 0, 1, 505)]).points[2]).toEqual({ x: 4, y: -5 });
    expect(pathOf([laser(0, 0, 0, 488), dichroic(4, 0, 1, 470)]).points[2]).toEqual({ x: 9, y: 0 });
  });

  it('stops at the sample through the objective, and the sample shines back through the dichroic to the camera', () => {
    const parts = [laser(), dichroic(4, 0, 1, 505), part('O', 'objective', 4, -3, 1), part('C', 'camera', 4, 6, 0, { label: 'Camera' })];
    // The dichroic turns the laser down to the objective, which looks along −y at the sample 4.5 below it.
    const light = lightOf(...parts);
    const onto = light.paths.find((p) => p.parts?.[0] === 'L')!;
    expect(onto.parts).toEqual(['L', 'D', 'O', 'sample']);
    expect(onto.points.at(-1)).toEqual({ x: 4, y: -7.5 });
    expect(onto.ray.label).toBe('Laser → Sample');
    const back = light.paths.find((p) => p.parts?.[0] === 'sample')!;
    expect(back.parts).toEqual(['sample', 'O', 'D', 'C']);
    expect(back.ray.label).toBe('Sample → Camera');
    // Side by side where they share the line, each in its own colour.
    expect(onto.ray.offset).toBe(-back.ray.offset);
    expect(onto.ray.color).not.toBe(back.ray.color);
    expect(light.misses).toEqual([]);
  });

  it('lets light from elsewhere pass through the sample, and the sample does not shine back', () => {
    // A source below shines up (seat 3) through the sample, which the objective (looking down, seat 1) sees 4.5 below it.
    const light = lightOf(part('L', 'laser', 0, -8, 3), part('O', 'objective', 0, 0, 1), part('C', 'camera', 0, 5));
    expect(light.paths).toHaveLength(1);
    expect(light.paths[0].parts).toEqual(['L', 'sample', 'O', 'C']);
  });

  it('passes under parts on other layers', () => {
    expect(pathOf([laser(), part('C', 'camera', 3, 0, 0, { z: 2 })]).open).toBe(true);
  });

  it('sends light both ways at a beam splitter: turned, and through', () => {
    const light = lightOf(laser(), part('B', 'beamsplitter', 4, 0), part('C', 'camera', 4, 5, 0, { label: 'C' }), part('K', 'camera', 9, 0, 0, { label: 'K' }));
    expect(light.paths.map((p) => p.parts)).toEqual([
      ['L', 'B', 'K'],
      ['L', 'B', 'C'],
    ]);
    expect(light.paths.map((p) => p.ray.label)).toEqual(['Laser → K', 'Laser → C']);
    expect(new Set(light.paths.map((p) => p.ray.id)).size).toBe(2);
  });

  it('passes the source’s light through a filter inside its band, and stops it outside', () => {
    const filter = (centre: number) =>
      part('F', 'filter', 3, 0, 0, {
        inputs: [
          { label: 'Centre wavelength', value: centre, unit: 'nm', min: 350, max: 1100, step: 1 },
          { label: 'Bandwidth', value: 40, unit: 'nm', min: 2, max: 200, step: 1 },
        ],
      });
    expect(lightOf(laser(), filter(500), part('C', 'camera', 6, 0)).misses).toEqual([]);
    const stopped = lightOf(laser(), filter(600), part('C', 'camera', 6, 0));
    expect(stopped.paths[0].parts).toEqual(['L', 'F']);
    expect(stopped.misses.map((m) => m.label)).toEqual(['C']);
  });

  it('turns a sketched part as its seat says, with no cube', () => {
    const sketched = part('M', 'mirror', 4, 0, 0, { placement: { state: 'ideal', seat: 1 } });
    expect(pathOf([laser(), sketched]).points[2]).toEqual({ x: 4, y: -5 });
  });
});
