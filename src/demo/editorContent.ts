/**
 * Placeholder design for the editor stories: the BF+Fluor FRAME optical core.
 * Not part of the component set; replace freely.
 */
import type { Schematic, SymbolKind } from '../components/editor/model';

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
      param: { label: 'Wavelength', value: 488, unit: 'nm', min: 400, max: 700, step: 1 },
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
      placement: { state: 'in-cube', module: 'Mirror cube 45°', source: 'Core Box', version: '2.0.1', seat: 0 },
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
      placement: { state: 'in-cube', module: 'Dichroic holder', source: 'Fluor Box', version: '1.2.0', seat: 0 },
      param: { label: 'Cut-on wavelength', value: 505, unit: 'nm', min: 400, max: 700, step: 1 },
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
      param: { label: 'Magnification', value: 10, unit: '×', min: 4, max: 60, step: 1 },
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
      param: { label: 'Focal length', value: 50, unit: 'mm', min: 10, max: 300, step: 1 },
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
  rays: [
    { id: 'excitation', label: 'excitation', color: 'ray1', path: ['S1', 'S2', 'S3', 'S4', 'sample'], offset: 0.2, arrowSegment: 2, labelAt: 4 },
    { id: 'emission', label: 'emission', color: 'ray2', path: ['sample', 'S4', 'S3', 'S5', 'S6'], offset: -0.2, arrowSegment: 2, labelAt: 4 },
  ],
};

export interface PaletteEntry {
  id: string;
  label: string;
}

export interface PaletteGroup {
  id: string;
  label: string;
  /** Total parts in the library, even when only some are listed. */
  count: number;
  mount: 'mounted' | 'unmounted';
  entries: PaletteEntry[];
}

export const demoPalette: PaletteGroup[] = [
  {
    id: 'core',
    label: 'openUC2 Core Box',
    count: 5,
    mount: 'mounted',
    entries: [
      { id: 'bs', label: 'Beam splitter cube' },
      { id: 'mirror', label: 'Mirror cube 45°' },
      { id: 'lens50', label: 'Lens holder, f = 50' },
      { id: 'rms', label: 'RMS objective insert' },
      { id: 'xyz', label: 'xyz-stage' },
    ],
  },
  {
    id: 'fluor',
    label: 'openUC2 Fluor Box',
    count: 3,
    mount: 'mounted',
    entries: [
      { id: 'dichroic', label: 'Dichroic holder' },
      { id: 'emfilter', label: 'Emission filter slot' },
      { id: 'laser488', label: 'Laser 488 module' },
    ],
  },
  {
    id: 'thorlabs',
    label: 'Thorlabs parts',
    count: 62,
    mount: 'unmounted',
    entries: [
      { id: 'ac254', label: 'AC254-050-A achromat' },
      { id: 'dmlp505', label: 'DMLP505 dichroic' },
      { id: 'md498', label: 'MD498 filter set' },
    ],
  },
];

export interface VersionEntry {
  version?: string;
  hash: string;
  message: string;
  when: string;
  author: string;
}

export const demoHistory: VersionEntry[] = [
  { version: '0.4.2', hash: 'a41f9c0', message: 'Move the emission filter into the Fluor Box group', when: '6 days ago', author: 'manu' },
  { hash: '8dc01b2', message: 'Swap DMLP490 for DMLP505', when: '9 days ago', author: 'manu' },
  { version: '0.4.1', hash: '51b7e2a', message: 'Add tube lens, link to Thorlabs AC254-050-A', when: '12 Mar 2026', author: 'paulh' },
  { hash: '0c9d3f4', message: 'Snap the laser module to the grid', when: '11 Mar 2026', author: 'manu' },
  { version: '0.4.0', hash: 'e2a8b71', message: 'First fluorescence path on the BF core', when: '2 Mar 2026', author: 'manu' },
];

export interface ProjectFile {
  id: string;
  name: string;
  kind: 'design' | 'export' | 'doc';
  size: string;
  updated: string;
}

export const demoFiles: ProjectFile[] = [
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

/** Existing modules a part of each kind can be realized as (swapped for). */
export const demoModules: Record<SymbolKind, { module: string; source: string; version?: string }[]> = {
  laser: [{ module: 'Laser 488 module', source: 'Fluor Box', version: '1.1.0' }, { module: 'Laser cube 520 nm', source: 'Q Box' }],
  mirror: [{ module: 'Mirror cube 45°', source: 'Core Box', version: '2.0.1' }, { module: 'Kinematic mirror cube', source: 'Q Box' }],
  dichroic: [{ module: 'Dichroic holder', source: 'Fluor Box', version: '1.2.0' }],
  lens: [
    { module: 'Lens holder, f = 50', source: 'Core Box', version: '1.4.0' },
    { module: 'Lens holder, f = 100', source: 'Core Box', version: '1.4.0' },
  ],
  objective: [{ module: 'RMS objective insert', source: 'Core Box', version: '2.3.0' }],
  camera: [{ module: 'IMX477 camera', source: 'Core Box', version: '1.0.4' }],
};
