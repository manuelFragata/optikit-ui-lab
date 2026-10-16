import { describe, expect, it } from 'vitest';
import { holderMismatch, realize, type ModuleOption, type SchematicSymbol } from './model';

const F50: ModuleOption = { module: 'Lens holder, f = 50', source: 'openUC2 Core Box', fixes: { 'Focal length': 50 } };
const F100: ModuleOption = { module: 'Lens holder, f = 100', source: 'openUC2 Core Box', fixes: { 'Focal length': 100 } };

const lens = (focal: number, patch: Partial<SchematicSymbol> = {}): SchematicSymbol => ({
  id: 'S1',
  label: 'Lens holder, f = 50',
  kind: 'lens',
  type: 'Lens holder, f = 50',
  x: 0,
  y: 0,
  z: 1,
  placement: { state: 'in-cube', ...F50, seat: 2 },
  inputs: [
    { label: 'Focal length', value: focal, unit: 'mm', min: 10, max: 300, step: 1 },
    { label: 'Diameter', value: 25, unit: 'mm', min: 6, max: 50, step: 0.5 },
  ],
  notes: '',
  ...patch,
});

describe('realize', () => {
  it('swaps the module, keeps the seat, and takes the inputs the module fixes', () => {
    const patch = realize(lens(50), F100);
    expect(patch.placement).toMatchObject({ state: 'in-cube', module: 'Lens holder, f = 100', seat: 2 });
    expect(patch.inputs?.map((i) => i.value)).toEqual([100, 25]);
  });

  it('renames the part and its type after the module, unless they were changed', () => {
    expect(realize(lens(50), F100)).toMatchObject({ label: 'Lens holder, f = 100', type: 'Lens holder, f = 100' });
    const named = realize(lens(50, { label: 'L2', type: 'lens' }), F100);
    expect(named.label).toBeUndefined();
    expect(named.type).toBeUndefined();
  });

  it('mounts a part that has no cube yet, in seat 0', () => {
    const patch = realize(lens(50, { label: 'AC254-050-A', placement: { state: 'unmounted', part: 'AC254-050-A', source: 'Thorlabs' } }), F50);
    expect(patch).toMatchObject({ label: 'Lens holder, f = 50', placement: { state: 'in-cube', seat: 0 } });
  });
});

describe('holderMismatch', () => {
  it('is nothing while the part matches its holder', () => {
    expect(holderMismatch(lens(50), [F50, F100])).toBeNull();
  });

  it('says what differs, and which module fits instead', () => {
    expect(holderMismatch(lens(100), [F50, F100])).toEqual({
      inputs: [{ label: 'Focal length', unit: 'mm', part: 100, module: 50 }],
      fits: F100,
    });
  });

  it('has no module to offer when none fits', () => {
    expect(holderMismatch(lens(75), [F50, F100])?.fits).toBeUndefined();
  });
});
