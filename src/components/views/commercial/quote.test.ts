import { describe, expect, it } from 'vitest';
import type { Bom } from '../../../ports/service';
import { buildQuote } from './quote';

const bom: Bom = {
  lines: [
    { name: 'Mirror cube', kind: 'module', source: 'Core Box', qty: 2, partIds: ['A', 'C'], unitPrice: 30 },
    { name: 'Camera', kind: 'module', source: 'Core Box', qty: 1, partIds: ['B'], unitPrice: 100 },
    { name: 'Laser', kind: 'module', source: 'Fluor Box', qty: 1, partIds: ['D'], unitPrice: null },
  ],
  parts: 4,
  total: 160,
  unpriced: 1,
};
const supply = { 'Mirror cube': { cost: 12, leadDays: 3 }, Laser: { cost: 80, leadDays: 15 } };
const terms = { discount: 0, labourHours: 0, labourRate: 60 };

describe('quote', () => {
  it('gives each line its cost, margin of the list price and lead time, where they are known', () => {
    const [mirror, camera, laser] = buildQuote(bom, supply, terms).lines;
    expect(mirror).toMatchObject({ cost: 12, marginShare: 0.6, leadDays: 3 });
    expect(camera).toMatchObject({ cost: null, marginShare: null, leadDays: null });
    expect(laser).toMatchObject({ cost: 80, marginShare: null, leadDays: 15 }); // no price, no margin
  });

  it('totals the parts, takes the discount off them, and adds the labour', () => {
    const q = buildQuote(bom, supply, { discount: 0.1, labourHours: 2, labourRate: 60 });
    expect(q.parts).toBe(160);
    expect(q.discount).toBe(16);
    expect(q.labour).toBe(120);
    expect(q.total).toBe(264);
  });

  it('counts the margin on the lines with both a price and a cost, after the discount', () => {
    const q = buildQuote(bom, supply, { ...terms, discount: 0.5 });
    // Mirrors: sold 60 × 0.5 = 30, bought 24.
    expect(q.margin).toBe(6);
    expect(q.marginShare).toBeCloseTo(0.2);
    expect([q.unpriced, q.uncosted]).toEqual([1, 1]);
  });

  it('ships when the slowest line arrives', () => {
    expect(buildQuote(bom, supply, terms).leadDays).toBe(15);
    expect(buildQuote(bom, {}, terms).leadDays).toBeNull();
  });
});
