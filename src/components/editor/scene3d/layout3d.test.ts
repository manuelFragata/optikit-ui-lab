import { describe, expect, it } from 'vitest';
import type { Schematic, SchematicSymbol } from '../model';
import type { Light, LightPath } from '../../../ports/light';
import { boundsOf, cubeCenter, layout3d, minimumScale, toThree, type View3D } from './layout3d';

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

const design = (symbols: SchematicSymbol[]): Schematic => ({ symbols, groups: [], unitMm: 50 });

const view = (patch: Partial<View3D> = {}): View3D => ({
  layer: 1,
  otherLayers: true,
  cages: false,
  rays: true,
  partLabels: true,
  rayLabels: true,
  selectedIds: [],
  ...patch,
});

const mesh = { url: 'lens.glb', axes: { z: '+x', x: '+y' } } as const;
const ray = { id: 'r', label: 'A → B', color: 'ray1' as const, offset: 0, arrowSegment: 0, labelAt: 0 };
/** The light the app's light source would give: from A (0, 0) to B (2, 0), on layer 1. */
const light = (patch: Partial<LightPath> = {}, misses: Light['misses'] = []): Light => ({
  paths: [{ ray, z: 1, points: [{ x: 0, y: 0 }, { x: 2, y: 0 }], open: false, ...patch }],
  misses,
});

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
  it('in a cube are their module’s meshes', () => {
    expect(layout3d(design([part('A')]), view(), () => mesh).parts[0].look).toBe('solid');
  });

  it('show a plain box when the module has no mesh', () => {
    expect(layout3d(design([part('A')]), view()).parts[0].look).toBe('placeholder');
  });

  it('draw a real part not in a cube as its optic, from its prescription, in a dashed cube', () => {
    const loose = part('A', { placement: { state: 'unmounted', part: 'AC254', source: 'Thorlabs' } });
    const glass = [{ geometry: { radius: 50 }, thickness: 4, semi_aperture: 12.7, material_post: 'N-BK7' }, { geometry: { radius: -50 }, semi_aperture: 12.7 }];
    expect(layout3d(design([loose]), view(), undefined, light(), () => glass).parts[0]).toMatchObject({ look: 'optic', mounted: false, cage: true, glass });
  });

  it('draw an ideal part as the line art of what it does, at the size its inputs give: no cube, no mesh, no glass', () => {
    const ideal = part('A', {
      kind: 'lens',
      placement: { state: 'ideal' },
      inputs: [
        { label: 'Focal length', value: 50, unit: 'mm', min: 10, max: 300, step: 1 },
        { label: 'Diameter', value: 25, unit: 'mm', min: 6, max: 50, step: 0.5 },
      ],
    });
    const p = layout3d(design([ideal]), view({ cages: true }), () => mesh).parts[0];
    expect(p).toMatchObject({ look: 'sketch', cage: false, mesh: undefined, glass: undefined });
    expect(p.sketch).toMatchObject({ apertureMm: 12.5, foci: [-50, 50] });
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

  it('turn by their seat (clockwise from above, so negative turns for three.js), and know when they are selected', () => {
    const turned = part('A', { placement: { state: 'in-cube', module: 'm', source: 's', seat: 3 } });
    expect(layout3d(design([turned]), view({ selectedIds: ['A'] })).parts[0]).toMatchObject({ turns: -3, selected: true });
  });
});

describe('rays', () => {
  const d = design([part('A'), part('B', { x: 2 })]);

  it('go where the light source says, at the height of their layer, and are ghosts on another layer', () => {
    expect(layout3d(d, view(), undefined, light()).rays[0]).toMatchObject({ points: [[0, 0, 80], [100, 0, 80]], open: false, miss: null, ghost: false });
    expect(layout3d(d, view({ layer: 0 }), undefined, light()).rays[0].ghost).toBe(true);
    expect(layout3d(d, view({ layer: 0, otherLayers: false }), undefined, light()).rays).toEqual([]);
  });

  it('carry a run into nothing, and the hint to the part they miss', () => {
    const miss = { ray, label: 'B', from: { x: 0, y: 0 }, at: { x: 2, y: 1 } };
    expect(layout3d(d, view(), undefined, light({ open: true }, [miss])).rays[0]).toMatchObject({ open: true, miss: [[0, 0, 80], [100, 50, 80]] });
  });

  it('are left out when rays are off, or with no light source', () => {
    expect(layout3d(d, view({ rays: false }), undefined, light()).rays).toEqual([]);
    expect(layout3d(d, view()).rays).toEqual([]);
  });
});

describe('labels', () => {
  it('name the parts on the current layer, with a lock and a missing mesh', () => {
    const d = design([part('A', { label: 'Lens', locks: { y: true } }), part('B', { z: 0 })]);
    const [a, ...rest] = layout3d(d, view({ selectedIds: ['A'] })).labels;
    expect(a).toMatchObject({ key: 'A', text: '🔒 Lens · no mesh', tone: 'selected', at: [0, 0, 113] });
    expect(rest.map((l) => l.key)).toEqual(['layer']); // B is a ghost: no name
  });

  it('leave the parts unnamed when part labels are off (the layer keeps its name)', () => {
    expect(layout3d(design([part('A')]), view({ partLabels: false })).labels.map((l) => l.key)).toEqual(['layer']);
  });

  it('name the rays over their first leg, unless their labels are off', () => {
    const d = design([part('A'), part('B', { x: 2 })]);
    expect(layout3d(d, view(), undefined, light()).labels.find((l) => l.tone === 'ray')).toMatchObject({ text: 'A → B', at: [50, 0, 90], color: 'ray1' });
    expect(layout3d(d, view({ rayLabels: false }), undefined, light()).labels.some((l) => l.tone === 'ray')).toBe(false);
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

describe('the least size of an optic in 2D', () => {
  it('enlarges a Ø25 lens, 5 mm thick, to 12 px across and 3 px thick when zoomed out, and leaves it true zoomed in', () => {
    expect(minimumScale({ across: 25, along: 5 }, 0.1)).toEqual({ across: 12 / 2.5, along: 3 / 0.5 });
    expect(minimumScale({ across: 25, along: 5 }, 1)).toEqual({ across: 1, along: 1 });
  });

  it('leaves a face with no thickness as it is along its axis', () => {
    expect(minimumScale({ across: 25, along: 0 }, 0.1).along).toBe(1);
  });
});
