/**
 * Placeholder starting points for New project. Not part of the component set;
 * replace freely. Template ids match the example drawings where one exists;
 * the boxes are the shop's (shop.openuc2.com, 2026-09-23, from the UI-V4 brief).
 */
import type { KitBox, ProjectTemplate } from '../api/types';

export const projectTemplates: ProjectTemplate[] = [
  {
    id: 'frame-histology',
    name: 'FRAME histology scanner',
    description: 'XYZ stage, camera, LED, objective and slide holder on the FRAME chassis. The M1 instrument.',
    cubes: 6,
  },
  { id: 'ex-brightfield', name: 'Brightfield microscope', description: 'An LED, two fold mirrors and a condenser; a 4× objective and a tube lens.', cubes: 8 },
  { id: 'ex-fluor', name: 'Fluorescence microscope', description: 'A 488 nm laser through a dichroic, the emission back to the camera.', cubes: 9 },
  { id: 'ex-expander', name: 'Beam expander', description: 'Two lenses widen a laser beam three times; two mirrors fold it onto a camera.', cubes: 6 },
];

export const kitBoxes: KitBox[] = [
  {
    id: 'corebox',
    name: 'Discovery | CoreBox',
    price: '€449',
    contents: [
      { qty: 2, name: '45° mirror' },
      { qty: 2, name: 'lens f 50 mm' },
      { qty: 1, name: 'lens f 100 mm' },
      { qty: 1, name: 'lens f −50 mm' },
      { qty: 1, name: 'eyepiece' },
      { qty: 1, name: 'smartphone carrier' },
      { qty: 1, name: 'sample mount' },
      { qty: 1, name: 'Z-stage 25 mm' },
      { qty: 10, name: 'puzzle base plates' },
      { qty: 1, name: 'objective 4× NA 0.1' },
      { qty: 1, name: 'LED torch' },
    ],
  },
  {
    id: 'qbox',
    name: 'Discovery | QBox',
    price: '€1 499',
    contents: [
      { qty: 2, name: 'kinematic mirror' },
      { qty: 1, name: 'fixed mirror' },
      { qty: 1, name: 'laser cube 520 nm' },
      { qty: 1, name: 'dichroic holder' },
      { qty: 2, name: 'polarizing beam splitter' },
      { qty: 4, name: 'rotating polarizer' },
      { qty: 2, name: 'lenses 16 / 28 mm' },
      { qty: 1, name: 'XYZ stage' },
      { qty: 1, name: 'ESP32-S3 module' },
      { qty: 10, name: 'puzzle plates' },
    ],
  },
];
