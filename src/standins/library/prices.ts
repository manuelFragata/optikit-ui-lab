/**
 * DEMO ONLY: made-up prices for the lab's modules and optics, EUR each.
 * The real ones come from the shop (Odoo, by optikit id), never from the
 * library. The Laser 488 module is left out on purpose: a line with no
 * price shows as unpriced.
 */
import type { PriceList } from '../../ports/library';

export const demoPrices: PriceList = {
  'Laser cube 520 nm': 189,
  'Laser 635 module': 149,
  'LED module': 39,
  'Mirror cube 45°': 24,
  'Kinematic mirror cube': 59,
  'Dichroic holder': 34,
  'Lens holder, f = 25': 29,
  'Lens holder, f = 40': 29,
  'Lens holder, f = 50': 29,
  'Lens holder, f = 100': 29,
  'RMS objective insert': 45,
  'IMX477 camera': 89,
  'AC254-050-A': 92.5,
  'AC254-075-A': 92.5,
};
