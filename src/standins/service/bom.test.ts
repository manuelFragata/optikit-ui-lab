import { describe, expect, it } from 'vitest';
import { bomCsv } from '../../components/editor/bomCsv';
import { buildBom } from './bom';
import type { Placement, Schematic, SchematicSymbol } from '../../components/editor/model';

const part = (id: string, placement: Placement): SchematicSymbol => ({ id, label: id, kind: 'lens', type: 'lens', x: 0, y: 0, z: 1, placement, notes: '' });
const cube = (module: string): Placement => ({ state: 'in-cube', module, source: 'Core Box', seat: 0 });
const loose = (part: string): Placement => ({ state: 'unmounted', part, source: 'Thorlabs' });
const design = (symbols: SchematicSymbol[]): Schematic => ({ symbols, groups: [], unitMm: 50 });

describe('bill of materials', () => {
  const d = design([part('A', cube('Mirror cube')), part('B', cube('Lens holder')), part('C', cube('Mirror cube')), part('D', loose('AC254-050-A'))]);

  it('counts the parts by what they are bought as: modules first, most first, then the optics with no holder', () => {
    const bom = buildBom(d, {});
    expect(bom.lines.map((l) => [l.qty, l.name, l.kind])).toEqual([
      [2, 'Mirror cube', 'module'],
      [1, 'Lens holder', 'module'],
      [1, 'AC254-050-A', 'optic'],
    ]);
    expect(bom.lines[0].partIds).toEqual(['A', 'C']);
    expect(bom.parts).toBe(4);
  });

  it('totals the priced lines only, and counts the others', () => {
    const bom = buildBom(d, { 'Mirror cube': 30, 'AC254-050-A': 70 });
    expect(bom.total).toBe(130);
    expect(bom.unpriced).toBe(1);
    expect(bom.lines[1].unitPrice).toBeNull();
  });

  it('writes the same numbers as CSV, with a total row', () => {
    const csv = bomCsv(buildBom(d, { 'Mirror cube': 30 })).trim().split('\n');
    expect(csv[1]).toBe('2,Mirror cube,module,Core Box,30.00,60.00,A C');
    expect(csv[2]).toBe('1,Lens holder,module,Core Box,,unpriced,B');
    expect(csv.at(-1)).toBe(',TOTAL,,,,60.00,+2 unpriced');
  });
});
