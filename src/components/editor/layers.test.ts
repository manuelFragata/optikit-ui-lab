import { describe, expect, it } from 'vitest';
import { layerShow, layerShowOfAny } from './layers';

describe('layerShow', () => {
  it('shows the current layer in full and the others as ghosts, or hides them', () => {
    expect(layerShow(1, 1, true)).toBe('current');
    expect(layerShow(0, 1, true)).toBe('ghost');
    expect(layerShow(0, 1, false)).toBe('hidden');
  });

  it('shows everything in full when no layer is singled out', () => {
    expect(layerShow(3, undefined, false)).toBe('current');
  });
});

describe('layerShowOfAny', () => {
  it('puts a light path or a group on the current layer when any of its parts is', () => {
    expect(layerShowOfAny([0, 1], 1, false)).toBe('current');
    expect(layerShowOfAny([0, 2], 1, true)).toBe('ghost');
    expect(layerShowOfAny([0, 2], 1, false)).toBe('hidden');
  });

  it('ignores parts that no longer exist', () => {
    expect(layerShowOfAny([undefined, 1], 1, true)).toBe('current');
    expect(layerShowOfAny([undefined], 1, true)).toBe('ghost');
  });
});
