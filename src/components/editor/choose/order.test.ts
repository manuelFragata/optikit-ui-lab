import { describe, expect, it } from 'vitest';
import { part, straight } from '../../../standins/kernel/simulate/testDesigns';
import { inLightOrder } from './order';

describe('the parts in the order the light meets them', () => {
  it('lists the path’s parts first, in its order, then the others', () => {
    const { design, path } = straight([part('L', 'laser', 0), part('A', 'lens', 2), part('C', 'camera', 4)]);
    const shuffled = { ...design, symbols: [design.symbols[2], part('X', 'mirror', 9), design.symbols[1], design.symbols[0]] };
    expect(inLightOrder(shuffled, { paths: [path], misses: [] }).map((s) => s.id)).toEqual(['L', 'A', 'C', 'X']);
  });
});
