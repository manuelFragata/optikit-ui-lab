import { describe, expect, it } from 'vitest';
import type { Schematic, SchematicSymbol } from '../model';
import { boundsOf, cubeCenter, layout3d, toThree, type View3D } from './layout3d';

const part = (id: string, patch: Partial<SchematicSymbol> = {}): SchematicSymbol => ({
  id,
  label: id,
  kind: 'lens',
  type: 'lens',
  x: 0,
  y: 0,
  z: 1,
  placement: { state: 'in-cube', module: 'Lens holder, f = 50', source: 'Core Box', seat: 0 },
  notes: '',
  ...patch,
});

const design = (symbols: SchematicSymbol[], rays: Schematic['rays'] = []): Schematic => ({ symbols, rays, groups: [], unitMm: 50 });

const view = (patch: Partial<View3D> = {}): View3D => ({
  layer: 1,
  otherLayers: true,
  fidelity: 'solids',
  cages: false,
  rays: true,
  rayLabels: true,
  selectedIds: [],
  ...patch,
});

const mesh = { url: 'lens.glb', axes: { z: '+x', x: '+y' } } as const;
const ray = { id: 'r', label: 'excitation', color: 'ray1' as const, path: ['A', 'B'], offset: 0, arrowSegment: 0, labelAt: 0 };

describe('frames', () => {
  it('puts a cube centre a grid step per unit, standing on its layer', () => {
    expect(cubeCenter({ x: 2, y: -1, z: 0 })).toEqual([100, -50, 25]);
    expect(cubeCenter({ x: 0, y: 0, z: 2 })).toEqual([0, 0, 135]); // layers are 55 mm apart
  });

  it('maps the document frame (z up) to three.js (y up) as optikit-v2 does', () => {
    expect(toThree([1, 2, 3])).toEqual([1, 3, -2]);
  });
});

describe('parts', () => {
  it('follow the fidelity on the current layer', () => {
    const d = design([part('A')]);
    expect(layout3d(d, view({ fidelity: 'symbols' })).parts[0].look).toBe('symbol');
    expect(layout3d(d, view({ fidelity: 'cubes' })).parts[0].look).toBe('cube');
    expect(layout3d(d, view({ fidelity: 'solids' }), () => mesh).parts[0].look).toBe('solid');
  });

  it('show a plain box at solids when the module has no mesh', () => {
    expect(layout3d(design([part('A')]), view()).parts[0].look).toBe('placeholder');
  });

  it('keep an unmounted optic a glyph in a dashed cube, even at solids', () => {
    const loose = part('A', { placement: { state: 'unmounted', part: 'AC254', source: 'Thorlabs' } });
    expect(layout3d(design([loose]), view(), () => mesh).parts[0]).toMatchObject({ look: 'symbol', mounted: false, cage: true, mesh: undefined });
  });

  it('on the other layers are ghosts, or left out', () => {
    const d = design([part('A'), part('B', { z: 0 })]);
    expect(layout3d(d, view()).parts.map((p) => p.look)).toEqual(['placeholder', 'ghost']);
    expect(layout3d(d, view({ otherLayers: false })).parts.map((p) => p.id)).toEqual(['A']);
  });

  it('get cages when asked, never as ghosts', () => {
    const d = design([part('A'), part('B', { z: 0 })]);
    expect(layout3d(d, view({ cages: true })).parts.map((p) => p.cage)).toEqual([true, false]);
  });

  it('turn by their seat, and know when they are selected', () => {
    const turned = part('A', { placement: { state: 'in-cube', module: 'm', source: 's', seat: 3 } });
    expect(layout3d(design([turned]), view({ selectedIds: ['A'] })).parts[0]).toMatchObject({ turns: 3, selected: true });
  });
});

describe('rays', () => {
  it('run through the parts they name, and are ghosts when they miss the layer', () => {
    const d = design([part('A'), part('B', { x: 2 })], [ray]);
    expect(layout3d(d, view()).rays[0]).toMatchObject({ points: [[0, 0, 80], [100, 0, 80]], ghost: false });
    expect(layout3d(d, view({ layer: 0 })).rays[0].ghost).toBe(true);
    expect(layout3d(d, view({ layer: 0, otherLayers: false })).rays).toEqual([]);
  });

  it('are left out when rays are off, or when a part they need is gone', () => {
    expect(layout3d(design([part('A'), part('B')], [ray]), view({ rays: false })).rays).toEqual([]);
    expect(layout3d(design([part('A')], [ray]), view()).rays).toEqual([]);
  });
});

describe('labels', () => {
  it('name the parts on the current layer, with a lock and a missing mesh', () => {
    const d = design([part('A', { label: 'Lens', locks: { y: true } }), part('B', { z: 0 })]);
    const [a, ...rest] = layout3d(d, view({ selectedIds: ['A'] })).labels;
    expect(a).toMatchObject({ key: 'A', text: '🔒 Lens · no mesh', tone: 'selected', at: [0, 0, 113] });
    expect(rest.map((l) => l.key)).toEqual(['layer']); // B is a ghost: no name
  });

  it('name the rays over their first leg, unless their labels are off', () => {
    const d = design([part('A'), part('B', { x: 2 })], [ray]);
    expect(layout3d(d, view()).labels.find((l) => l.tone === 'ray')).toMatchObject({ text: 'excitation', at: [50, 0, 90], color: 'ray1' });
    expect(layout3d(d, view({ rayLabels: false })).labels.some((l) => l.tone === 'ray')).toBe(false);
  });
});

describe('floor, anchor and bounds', () => {
  const d = design([part('A'), part('B', { x: 2, y: 1 }), part('C', { z: 0 })]);

  it('put a floor around the current layer’s parts, named at its corner', () => {
    const { floor, labels } = layout3d(d, view());
    expect(floor).toEqual({ x0: -65, y0: -65, x1: 165, y1: 115, z: 55.5 });
    expect(labels.at(-1)).toMatchObject({ text: 'z1', at: [165, -65, 55.5], below: true });
  });

  it('pin the action bar under the selection', () => {
    expect(layout3d(d, view({ selectedIds: ['A', 'B'] })).anchor).toEqual([50, 25, 55]);
    expect(layout3d(d, view({ selectedIds: ['C'] })).anchor).toBeNull(); // a ghost is not on screen to act on
  });

  it('frame everything drawn, and the selection', () => {
    const { bounds } = layout3d(d, view({ selectedIds: ['A'] }));
    expect(bounds.all).toEqual({ min: [-25, -25, 0], max: [125, 75, 105] });
    expect(bounds.selection).toEqual({ min: [-25, -25, 55], max: [25, 25, 105] });
  });

  it('put move arrows at the centre of the selection, leaving out axes every selected part is locked on', () => {
    expect(layout3d(d, view({ selectedIds: ['A', 'B'] })).handles).toEqual({ at: [50, 25, 80], axes: ['x', 'y', 'z'] });
    const locked = design([part('A', { locks: { x: true, z: true } }), part('B', { x: 2, locks: { x: true } })]);
    expect(layout3d(locked, view({ selectedIds: ['A', 'B'] })).handles?.axes).toEqual(['y', 'z']);
    expect(layout3d(d, view()).handles).toBeNull();
  });

  it('wrap no parts in no box', () => {
    expect(boundsOf([])).toBeNull();
  });
});
