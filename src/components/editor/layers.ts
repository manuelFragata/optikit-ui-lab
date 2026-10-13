/**
 * The layer rules both views follow (the 2D schematic and the 3D view): one
 * layer is worked on; the others show faintly as ghosts, or not at all.
 */

/** How something on a layer shows while another layer may be the current one. */
export type LayerShow = 'current' | 'ghost' | 'hidden';

/**
 * How a part on layer `z` shows. `current` undefined means no layer is
 * singled out: everything shows in full. `others` is the "other layers"
 * toggle (UI-V4's onion skin).
 */
export function layerShow(z: number, current: number | undefined, others: boolean): LayerShow {
  if (current === undefined || z === current) return 'current';
  return others ? 'ghost' : 'hidden';
}

/** Something made of several parts (a light path, a group) belongs to the current layer when any of its parts does. */
export function layerShowOfAny(partLayers: (number | undefined)[], current: number | undefined, others: boolean): LayerShow {
  const anyCurrent = partLayers.some((z) => z !== undefined && layerShow(z, current, others) === 'current');
  if (anyCurrent) return 'current';
  return others ? 'ghost' : 'hidden';
}
