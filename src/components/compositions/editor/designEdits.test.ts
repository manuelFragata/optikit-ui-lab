import { describe, expect, it } from 'vitest';
import type { Schematic, SchematicSymbol } from '../../editor/model';
import { copyParts, mountAll, moveParts, newPart, nextIds, removeParts, turnParts } from './designEdits';

const part = (id: string, patch: Partial<SchematicSymbol> = {}): SchematicSymbol => ({
  id,
  label: id,
  kind: 'lens',
  type: 'lens',
  x: 0,
  y: 0,
  z: 1,
  placement: { state: 'in-cube', module: 'Lens holder', source: 'Core Box', seat: 0 },
  notes: '',
  ...patch,
});
const design = (...symbols: SchematicSymbol[]): Schematic => ({ symbols, rays: [], groups: [], unitMm: 50 });

describe('design edits', () => {
  it('number new parts after the highest id', () => {
    expect(nextIds(design(part('S2'), part('S9')), 2)).toEqual(['S10', 'S11']);
    expect(nextIds(design(), 1)).toEqual(['S1']);
  });

  it('move parts, except along their locked axes', () => {
    const d = moveParts(design(part('A'), part('B', { locks: { x: true } })), ['A', 'B'], { x: 2, y: 1 });
    expect(d.symbols.map((s) => [s.x, s.y])).toEqual([[2, 1], [0, 1]]);
  });

  it('turn parts in a cube a quarter, but not loose or turn-locked ones', () => {
    const loose = part('B', { placement: { state: 'unmounted', part: 'AC254', source: 'Thorlabs' } });
    const d = turnParts(design(part('A'), loose, part('C', { locks: { turn: true } })), ['A', 'B', 'C']);
    expect(d.symbols.map((s) => (s.placement.state === 'in-cube' ? s.placement.seat : null))).toEqual([1, null, 0]);
  });

  it('copy parts beside the originals, unlocked, with new ids', () => {
    const { design: d, ids } = copyParts(design(part('S1', { locks: { y: true } })), ['S1']);
    expect(ids).toEqual(['S2']);
    expect(d.symbols[1]).toMatchObject({ id: 'S2', label: 'S1 copy', x: 3, y: 0, locks: undefined });
  });

  it('copy parts onto another layer', () => {
    expect(copyParts(design(part('S1')), ['S1'], { z: 1 }).design.symbols[1]).toMatchObject({ x: 0, z: 2 });
  });

  it('remove parts', () => {
    expect(removeParts(design(part('A'), part('B')), ['A']).symbols.map((s) => s.id)).toEqual(['B']);
  });

  it('make a new part in a cube for a module, loose for a bare optic', () => {
    const entry = { id: 'e', label: 'Mirror cube', kind: 'mirror' as const, mount: 'mounted' as const, source: 'Core Box' };
    expect(newPart(entry, { x: 2, y: 3 }, 1, 'S7').placement).toMatchObject({ state: 'in-cube', module: 'Mirror cube' });
    expect(newPart({ ...entry, mount: 'unmounted' }, { x: 2, y: 3 }, 1, 'S7').placement.state).toBe('unmounted');
  });

  it('mount every loose part: realize it when a module fits, freeze a holder otherwise', () => {
    const loose = (id: string) => part(id, { placement: { state: 'unmounted', part: id, source: 'Thorlabs' } });
    const d = mountAll(design(loose('A'), loose('B'), part('C')), (kind) => (kind === 'lens' ? [{ module: 'Lens holder', source: 'Core Box' }] : []));
    expect(d.symbols.every((s) => s.placement.state === 'in-cube')).toBe(true);
    expect(mountAll(design(loose('A')), () => []).symbols[0].placement).toMatchObject({ state: 'in-cube', frozen: true });
  });
});
