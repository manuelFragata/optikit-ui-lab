/**
 * Placeholder design for the editor stories: the BF+Fluor FRAME optical core.
 * Not part of the component set; replace freely.
 */
import type { SketchGroup } from '../components/editor/panels/SketchPanel';
import type { Schematic, SymbolKind, SymbolParam } from '../components/editor/model';
import type { VersionEntryData } from '../components/editor/panels/HistoryPanel';
import type { ProjectFileData } from '../components/views/file/ProjectFiles';

export const demoSchematic: Schematic = {
  unitMm: 50,
  groups: [
    { id: 'laser', label: 'Laser module' },
    { id: 'fluor', label: 'Fluor box' },
  ],
  symbols: [
    {
      id: 'S1',
      label: 'Laser 488',
      kind: 'laser',
      type: 'laser source',
      group: 'laser',
      x: 0,
      y: 13,
      z: 1,
      placement: { state: 'in-cube', module: 'Laser 488 module', source: 'Fluor Box', version: '1.1.0', seat: 0 },
      inputs: [
        { label: 'Wavelength', value: 488, unit: 'nm', min: 400, max: 700, step: 1 },
        { label: 'Power', value: 20, unit: 'mW', min: 0, max: 100, step: 1 },
      ],
      notes: '',
    },
    {
      id: 'S2',
      label: 'Mirror M1',
      kind: 'mirror',
      type: 'mirror 45°',
      group: 'laser',
      x: 10,
      y: 13,
      z: 1,
      placement: { state: 'in-cube', module: 'Mirror cube 45°', source: 'Core Box', version: '2.0.1', seat: 1 },
      notes: '',
    },
    {
      id: 'S3',
      label: 'Dichroic + filters',
      kind: 'dichroic',
      type: 'dichroic + filters',
      group: 'fluor',
      x: 10,
      y: 4,
      z: 1,
      placement: { state: 'in-cube', module: 'Dichroic holder', source: 'Fluor Box', version: '1.2.0', seat: 1 },
      inputs: [
        { label: 'Cut-on wavelength', value: 505, unit: 'nm', min: 400, max: 700, step: 1 },
        { label: 'Emission band', value: 525, unit: 'nm', min: 450, max: 700, step: 1 },
      ],
      notes: 'Swap for DMLP490 if the 488 line bleeds into the emission band.',
    },
    {
      id: 'S4',
      label: 'Objective',
      kind: 'objective',
      type: 'objective',
      group: 'fluor',
      x: 17,
      y: 4,
      z: 1,
      placement: { state: 'in-cube', module: 'RMS objective insert', source: 'Core Box', version: '2.3.0', seat: 0 },
      inputs: [
        { label: 'Magnification', value: 10, unit: '×', min: 4, max: 60, step: 1 },
        { label: 'Numerical aperture', value: 0.25, unit: 'NA', min: 0.1, max: 1.4, step: 0.05 },
      ],
      notes: '',
    },
    {
      id: 'S5',
      label: 'Tube lens',
      kind: 'lens',
      type: 'lens',
      group: 'fluor',
      x: 5,
      y: 4,
      z: 1,
      placement: { state: 'unmounted', part: 'AC254-050-A', source: 'Thorlabs parts' },
      inputs: [
        { label: 'Focal length', value: 50, unit: 'mm', min: 10, max: 300, step: 1 },
        { label: 'Diameter', value: 25, unit: 'mm', min: 6, max: 50, step: 0.5 },
      ],
      notes: '',
    },
    {
      id: 'S6',
      label: 'Camera',
      kind: 'camera',
      type: 'camera',
      group: 'fluor',
      x: 0,
      y: 4,
      z: 1,
      placement: { state: 'in-cube', module: 'IMX477 camera', source: 'Core Box', version: '1.0.4', seat: 0 },
      notes: '',
    },
  ],
};

export const demoHistory: VersionEntryData[] = [
  { version: '0.4.2', hash: 'a41f9c0', message: 'Move the emission filter into the Fluor Box group', when: '6 days ago', author: 'manu', changes: ['Dichroic + filters: moved into Fluor Box'] },
  { hash: '8dc01b2', message: 'Swap DMLP490 for DMLP505', when: '9 days ago', author: 'manu', changes: ['Dichroic + filters: cut-on 490 → 505 nm'] },
  {
    version: '0.4.1',
    hash: '51b7e2a',
    message: 'Add tube lens, link to Thorlabs AC254-050-A',
    when: '12 Mar 2026',
    author: 'paulh',
    changes: ['Tube lens: added (AC254-050-A, not mounted)', 'Emission path: now through the tube lens'],
  },
  { hash: '0c9d3f4', message: 'Snap the laser module to the grid', when: '11 Mar 2026', author: 'manu', changes: ['Laser 488: moved 0.4 → 0 along x'] },
  { version: '0.4.0', hash: 'e2a8b71', message: 'First fluorescence path on the BF core', when: '2 Mar 2026', author: 'manu', changes: ['6 parts, 2 light paths'] },
];

export const demoFiles: ProjectFileData[] = [
  { id: 'f1', name: 'bf-fluor-core.optikit', kind: 'design', size: '48 KB', updated: '6 days ago' },
  { id: 'f2', name: 'assembly.step', kind: 'export', size: '12.4 MB', updated: '6 days ago' },
  { id: 'f3', name: 'parts-list.csv', kind: 'export', size: '3 KB', updated: '6 days ago' },
  { id: 'f4', name: 'assembly-instructions.md', kind: 'doc', size: '9 KB', updated: '12 Mar 2026' },
];

export const demoDesignInfo = {
  maintainer: 'manu',
  description:
    'Epifluorescence core for the FRAME chassis: 488 nm excitation, DMLP505 dichroic, 525/40 emission filter and a 50 mm tube lens onto an IMX477 sensor.',
  tags: ['fluorescence', 'frame', 'core-box', '488nm'],
  license: 'CERN-OHL-S-2.0',
  created: '2 Mar 2026',
};

/** The inputs a newly placed part of each kind starts with. */
export const demoInputs: Record<SymbolKind, SymbolParam[]> = {
  laser: [
    { label: 'Wavelength', value: 488, unit: 'nm', min: 400, max: 1100, step: 1 },
    { label: 'Waist diameter', value: 1, unit: 'mm', min: 0.1, max: 10, step: 0.1 },
    { label: 'Divergence', value: 1, unit: 'mrad', min: 0, max: 20, step: 0.1 },
    { label: 'Power', value: 10, unit: 'mW', min: 0, max: 100, step: 1 },
  ],
  mirror: [
    // 0: a flat mirror. A positive f focuses (concave), a negative one spreads the light (convex).
    { label: 'Focal length', value: 0, unit: 'mm', min: -500, max: 500, step: 1 },
    { label: 'Diameter', value: 25, unit: 'mm', min: 6, max: 50, step: 0.5 },
  ],
  dichroic: [
    { label: 'Cut-on wavelength', value: 505, unit: 'nm', min: 400, max: 700, step: 1 },
    { label: 'Diameter', value: 25, unit: 'mm', min: 6, max: 50, step: 0.5 },
  ],
  lens: [
    { label: 'Focal length', value: 50, unit: 'mm', min: -300, max: 300, step: 1 },
    { label: 'Diameter', value: 25, unit: 'mm', min: 6, max: 50, step: 0.5 },
  ],
  objective: [
    { label: 'Magnification', value: 10, unit: '×', min: 4, max: 60, step: 1 },
    { label: 'Numerical aperture', value: 0.25, unit: 'NA', min: 0.1, max: 1.4, step: 0.05 },
  ],
  camera: [
    { label: 'Exposure', value: 20, unit: 'ms', min: 1, max: 500, step: 1 },
    { label: 'Gain', value: 1, unit: '×', min: 1, max: 16, step: 0.5 },
  ],
  filter: [
    { label: 'Centre wavelength', value: 525, unit: 'nm', min: 350, max: 1100, step: 1 },
    { label: 'Bandwidth', value: 40, unit: 'nm', min: 2, max: 200, step: 1 },
    { label: 'Diameter', value: 25, unit: 'mm', min: 6, max: 50, step: 0.5 },
  ],
  beamsplitter: [
    { label: 'Reflectance', value: 50, unit: '%', min: 1, max: 99, step: 1 },
    { label: 'Diameter', value: 25, unit: 'mm', min: 6, max: 50, step: 0.5 },
  ],
  aperture: [{ label: 'Diameter', value: 10, unit: 'mm', min: 0.5, max: 25, step: 0.5 }],
};

/** An LED: a source of an emitter's size, spreading wide. */
const LED_INPUTS: SymbolParam[] = [
  { label: 'Wavelength', value: 470, unit: 'nm', min: 360, max: 940, step: 1 },
  { label: 'Emitter size', value: 3, unit: 'mm', min: 0.5, max: 10, step: 0.5 },
  { label: 'Divergence', value: 30, unit: '°', min: 1, max: 120, step: 1 },
  { label: 'Power', value: 200, unit: 'mW', min: 0, max: 1000, step: 10 },
];

/** A part's inputs with some values set. */
const withValues = (inputs: SymbolParam[], values: Readonly<Record<string, number>>) => inputs.map((i) => (i.label in values ? { ...i, value: values[i.label] } : i));

/**
 * The sketch (the left rail's Sketch panel): ideal parts only. Each does
 * exactly what its numbers say (a lens is a paraxial thin lens of f and Ø),
 * so layouts can be tried before any real part is chosen. A part is made
 * real later, on the canvas: from the catalogue, or designed here.
 */
const entry = (id: string, label: string, kind: SymbolKind, values: Readonly<Record<string, number>> = {}, inputs = demoInputs[kind]) => ({ id, label, kind, inputs: withValues(inputs, values) });

export const demoSketch: SketchGroup[] = [
  {
    id: 'optics',
    label: 'Optics',
    entries: [
      entry('ideal-lens', 'Lens', 'lens'),
      entry('ideal-lens-negative', 'Negative lens', 'lens', { 'Focal length': -50 }),
      entry('ideal-mirror', 'Mirror', 'mirror'),
      entry('ideal-mirror-curved', 'Focusing mirror', 'mirror', { 'Focal length': 100 }),
      entry('ideal-filter', 'Filter', 'filter'),
      entry('ideal-dichroic', 'Dichroic', 'dichroic'),
      entry('ideal-beamsplitter', 'Beam splitter', 'beamsplitter'),
    ],
  },
  {
    id: 'sources',
    label: 'Sources',
    entries: [
      entry('ideal-laser', 'Laser', 'laser'),
      entry('ideal-led', 'LED', 'laser', {}, LED_INPUTS),
    ],
  },
  {
    id: 'detectors',
    label: 'Detectors',
    entries: [entry('ideal-camera', 'Camera', 'camera')],
  },
];
