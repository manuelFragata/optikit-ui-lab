import { describe, expect, it } from 'vitest';
import type { Schematic, SchematicSymbol, Seat, SymbolKind } from '../../components/editor/model';
import { traceRay } from './light';

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

const ray = (path: string[]): Schematic['rays'][number] => ({ id: 'r', label: 'beam', color: 'ray1', path, offset: 0, arrowSegment: 0, labelAt: 0 });
const laser = (x = 0, y = 0, seat: Seat = 0, nm = 488) => part('L', 'laser', x, y, seat, { inputs: [{ label: 'Wavelength', value: nm, unit: 'nm', min: 400, max: 700, step: 1 }] });
const dichroic = (x: number, y: number, seat: Seat, cutOn: number) =>
  part('D', 'dichroic', x, y, seat, { inputs: [{ label: 'Cut-on wavelength', value: cutOn, unit: 'nm', min: 400, max: 700, step: 1 }] });

describe('the demo light', () => {
  it('shines the way its source faces: +x at seat 0, a quarter turn clockwise per seat', () => {
    const seat1 = traceRay(ray(['L']), [laser(0, 0, 1)])!;
    expect(seat1.path.points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: -5 },
    ]);
  });

  it('turns at a mirror as its plate sits: "/" at seat 0, "\\" at seat 1', () => {
    const up = traceRay(ray(['L', 'M']), [laser(), part('M', 'mirror', 4, 0, 0)])!;
    expect(up.path.points[2]).toEqual({ x: 4, y: 5 });
    const down = traceRay(ray(['L', 'M']), [laser(), part('M', 'mirror', 4, 0, 1)])!;
    expect(down.path.points[2]).toEqual({ x: 4, y: -5 });
  });

  it('stops at a camera, and reaches everything meant', () => {
    const beam = traceRay(ray(['L', 'A', 'C']), [laser(), part('A', 'lens', 3, 0), part('C', 'camera', 6, 0)])!;
    expect(beam.reached).toEqual(['L', 'A', 'C']);
    expect(beam.path.open).toBe(false);
    expect(beam.miss).toBeNull();
  });

  it('keeps going straight when a mirror is moved away: it is not dragged along, and the hint says what it misses', () => {
    const beam = traceRay(ray(['L', 'M', 'C']), [laser(), part('M', 'mirror', 4, 2, 1), part('C', 'camera', 4, -4)])!;
    expect(beam.path.points).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
    ]);
    expect(beam.path.open).toBe(true);
    expect(beam.miss).toMatchObject({ label: 'M', at: { x: 4, y: 2 }, from: { x: 0, y: 0 } });
  });

  it('still catches a part a little off the line, within its aperture', () => {
    expect(traceRay(ray(['L', 'A']), [laser(), part('A', 'lens', 3, 0.2)])!.miss).toBeNull();
    expect(traceRay(ray(['L', 'A']), [laser(), part('A', 'lens', 3, 0.5)])!.miss?.label).toBe('A');
  });

  it('turns at a dichroic below its cut-on, and passes it above', () => {
    expect(traceRay(ray(['L', 'D']), [laser(0, 0, 0, 488), dichroic(4, 0, 1, 505)])!.path.points[2]).toEqual({ x: 4, y: -5 });
    expect(traceRay(ray(['L', 'D']), [laser(0, 0, 0, 488), dichroic(4, 0, 1, 470)])!.path.points[2]).toEqual({ x: 9, y: 0 });
  });

  it('ends at the sample in front of the objective; the emission comes back from it through the dichroic', () => {
    const parts = [laser(), dichroic(4, 0, 1, 505), part('O', 'objective', 4, -3, 1), part('C', 'camera', 4, 6)];
    // The dichroic turns the laser down to the objective, which looks along −y at the sample 4.5 below it.
    const excitation = traceRay(ray(['L', 'D', 'O', 'sample']), parts)!;
    expect(excitation.reached).toEqual(['L', 'D', 'O', 'sample']);
    expect(excitation.path.points.at(-1)).toEqual({ x: 4, y: -7.5 });
    const emission = traceRay(ray(['sample', 'O', 'D', 'C']), parts)!;
    expect(emission.reached).toEqual(['sample', 'O', 'D', 'C']);
  });

  it('passes under parts on other layers', () => {
    const beam = traceRay(ray(['L']), [laser(), part('C', 'camera', 3, 0, 0, { z: 2 })])!;
    expect(beam.path.open).toBe(true);
  });
  it('sends light on at a beam splitter the way the path names next: turned, or through', () => {
    const parts = [laser(), part('B', 'beamsplitter', 4, 0), part('C', 'camera', 4, 5), part('K', 'camera', 9, 0)];
    expect(traceRay(ray(['L', 'B', 'C']), parts)!.reached).toEqual(['L', 'B', 'C']);
    expect(traceRay(ray(['L', 'B', 'K']), parts)!.reached).toEqual(['L', 'B', 'K']);
  });

  it('passes the source’s light through a filter inside its band, and stops it outside', () => {
    const filter = (centre: number) =>
      part('F', 'filter', 3, 0, 0, {
        inputs: [
          { label: 'Centre wavelength', value: centre, unit: 'nm', min: 350, max: 1100, step: 1 },
          { label: 'Bandwidth', value: 40, unit: 'nm', min: 2, max: 200, step: 1 },
        ],
      });
    const through = traceRay(ray(['L', 'F', 'C']), [laser(), filter(500), part('C', 'camera', 6, 0)])!;
    expect(through.miss).toBeNull();
    const stopped = traceRay(ray(['L', 'F', 'C']), [laser(), filter(600), part('C', 'camera', 6, 0)])!;
    expect(stopped.reached).toEqual(['L', 'F']);
    expect(stopped.miss?.label).toBe('C');
  });

  it('turns a sketched part as its seat says, with no cube', () => {
    const sketched = part('M', 'mirror', 4, 0, 0, { placement: { state: 'ideal', seat: 1 } });
    expect(traceRay(ray(['L', 'M']), [laser(), sketched])!.path.points[2]).toEqual({ x: 4, y: -5 });
  });
});
