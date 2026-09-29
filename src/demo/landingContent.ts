/**
 * Placeholder content for the signed-out landing page: playable examples,
 * community highlights and pricing. Not part of the component set; the plans
 * and prices are made up for the prototype.
 */
import type { Placement, Schematic } from '../components/editor/model';
import { demoSchematic } from './editorContent';

export interface ExampleDesign {
  id: string;
  title: string;
  /** One or two plain sentences: what it is and what to try. */
  summary: string;
  /** Something concrete to try, shown under the summary. */
  tryThis: string;
  cubes: number;
  schematic: Schematic;
}

const cube = (module: string, source = 'Core Box'): Placement => ({ state: 'in-cube', module, source, seat: 0 });
const loose = (part: string, source: string): Placement => ({ state: 'unmounted', part, source });

const brightfield: Schematic = {
  unitMm: 50,
  groups: [
    { id: 'illumination', label: 'Illumination' },
    { id: 'detection', label: 'Detection' },
  ],
  symbols: [
    {
      id: 'S1', placement: cube('LED module'),
      label: 'LED 520',
      kind: 'laser',
      type: 'LED source',
      group: 'illumination',
      x: 6,
      y: 12,
      z: 1,
      param: { label: 'Wavelength', value: 520, unit: 'nm', min: 400, max: 700, step: 1 },
      notes: '',
    },
    { id: 'S2', placement: cube('Mirror cube 45°'), label: 'Mirror M1', kind: 'mirror', type: 'mirror 45°', group: 'illumination', x: 22, y: 12, z: 1, notes: '' },
    { id: 'S3', placement: cube('Mirror cube 45°'), label: 'Mirror M2', kind: 'mirror', type: 'mirror 45°', x: 22, y: 4, z: 1, notes: '' },
    {
      id: 'S4', placement: cube('Lens holder, f = 40'),
      label: 'Condenser',
      kind: 'lens',
      type: 'lens',
      x: 19.5,
      y: 4,
      z: 1,
      param: { label: 'Focal length', value: 40, unit: 'mm', min: 10, max: 200, step: 1 },
      notes: '',
    },
    {
      id: 'S5', placement: cube('RMS objective insert'),
      label: 'Objective',
      kind: 'objective',
      type: 'objective',
      group: 'detection',
      x: 12,
      y: 4,
      z: 1,
      param: { label: 'Magnification', value: 4, unit: '×', min: 4, max: 60, step: 1 },
      notes: '',
    },
    {
      id: 'S6', placement: cube('Lens holder, f = 100'),
      label: 'Tube lens',
      kind: 'lens',
      type: 'lens',
      group: 'detection',
      x: 6,
      y: 4,
      z: 1,
      param: { label: 'Focal length', value: 100, unit: 'mm', min: 10, max: 300, step: 1 },
      notes: '',
    },
    { id: 'S7', placement: cube('IMX477 camera'), label: 'Camera', kind: 'camera', type: 'camera', group: 'detection', x: 1, y: 4, z: 1, notes: '' },
  ],
  rays: [
    {
      id: 'light',
      label: 'transmitted light',
      color: 'ray3',
      path: ['S1', 'S2', 'S3', 'S4', 'sample', 'S5', 'S6', 'S7'],
      offset: 0,
      arrowSegment: 0,
      labelAt: 1,
    },
  ],
};

const beamExpander: Schematic = {
  unitMm: 50,
  groups: [
    { id: 'expander', label: 'Expander 1:3' },
    { id: 'profiler', label: 'Beam profiler' },
  ],
  symbols: [
    {
      id: 'S1', placement: cube('Laser 635 module', 'Q Box'),
      label: 'Laser 635',
      kind: 'laser',
      type: 'laser source',
      x: 0,
      y: 4,
      z: 1,
      param: { label: 'Wavelength', value: 635, unit: 'nm', min: 400, max: 700, step: 1 },
      notes: '',
    },
    {
      id: 'S2', placement: cube('Lens holder, f = 25'),
      label: 'L1',
      kind: 'lens',
      type: 'lens',
      group: 'expander',
      x: 5,
      y: 4,
      z: 1,
      param: { label: 'Focal length', value: 25, unit: 'mm', min: 10, max: 200, step: 1 },
      notes: '',
    },
    {
      id: 'S3', placement: loose('AC254-075-A', 'Thorlabs parts'),
      label: 'L2',
      kind: 'lens',
      type: 'lens',
      group: 'expander',
      x: 11,
      y: 4,
      z: 1,
      param: { label: 'Focal length', value: 75, unit: 'mm', min: 10, max: 300, step: 1 },
      notes: '',
    },
    { id: 'S4', placement: cube('Mirror cube 45°'), label: 'Mirror M1', kind: 'mirror', type: 'mirror 45°', x: 18, y: 4, z: 1, notes: '' },
    { id: 'S5', placement: cube('Mirror cube 45°'), label: 'Mirror M2', kind: 'mirror', type: 'mirror 45°', group: 'profiler', x: 18, y: 11, z: 1, notes: '' },
    { id: 'S6', placement: cube('IMX477 camera'), label: 'Camera', kind: 'camera', type: 'camera', group: 'profiler', x: 9, y: 11, z: 1, notes: '' },
  ],
  rays: [
    { id: 'beam', label: 'beam', color: 'ray4', path: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'], offset: 0, arrowSegment: 1, labelAt: 1 },
  ],
};

export const exampleDesigns: ExampleDesign[] = [
  {
    id: 'ex-fluor',
    title: 'Fluorescence microscope',
    summary: 'A 488 nm laser excites the sample through a dichroic; the emission comes back through the same objective to the camera.',
    tryThis: 'Click the dichroic and move its cut-on wavelength.',
    cubes: 9,
    schematic: demoSchematic,
  },
  {
    id: 'ex-brightfield',
    title: 'Brightfield microscope',
    summary: 'An LED, two fold mirrors and a condenser light the sample from behind; a 4× objective and a tube lens image it.',
    tryThis: 'Click the objective and change the magnification.',
    cubes: 8,
    schematic: brightfield,
  },
  {
    id: 'ex-expander',
    title: 'Beam expander',
    summary: 'Two lenses widen a laser beam three times, then two mirrors fold it onto a camera to check its profile.',
    tryThis: 'Click L2 and change its focal length.',
    cubes: 6,
    schematic: beamExpander,
  },
];

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  /** Under the price, e.g. "per month". */
  period?: string;
  pitch: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    period: 'forever',
    pitch: 'Everything you need to design and build one instrument.',
    features: ['Full editor and ray view', 'Every example and gallery design', '3 private projects', 'Parts list export (CSV)'],
    cta: 'Create a free account',
  },
  {
    id: 'maker',
    name: 'Maker',
    price: '€8',
    period: 'per month',
    pitch: 'For people who keep building.',
    features: ['Unlimited private projects', 'STEP export for printing', 'Version history', 'Share links with comments'],
    cta: 'Start with Maker',
    highlighted: true,
  },
  {
    id: 'lab',
    name: 'Lab & classroom',
    price: 'Talk to us',
    pitch: 'For research groups, schools and workshops.',
    features: ['Shared team workspace', 'Class sets and assignments', 'Bulk kit ordering', 'Invoices and single sign-on'],
    cta: 'Contact openUC2',
  },
];

export interface FeatureHighlight {
  id: 'sketch' | 'simulate' | 'cubify' | 'build';
  title: string;
  text: string;
}

export const featureHighlights: FeatureHighlight[] = [
  { id: 'sketch', title: 'Sketch', text: 'Put the laser, lenses, dichroic, sample and camera on the grid, the way Optikit draws them. Each symbol is a real part.' },
  {
    id: 'simulate',
    title: 'Simulate',
    text: 'The green laser lights the sample, and the sample answers in orange. That light goes back through the objective and the dichroic, and lands on the camera as a 2× image.',
  },
  { id: 'cubify', title: 'Cubify', text: 'Every part gets its cube: the optic, then the insert that holds it, then one half of the cube, then the other.' },
  { id: 'build', title: 'Build', text: 'Take the parts list and STEP files to your printer, or order the cubes as a kit.' },
];

/** Plain facts for the community section (placeholder numbers). */
export const communityFacts = [
  { value: '214', label: 'shared designs' },
  { value: '31', label: 'countries' },
  { value: 'CC BY-SA', label: 'by default' },
];

/** A few of the people sharing designs (initials for the avatar stack). */
export const communityMakers = ['pa', 'oh', 'ma', 'fr'];

/** Real kits, for people who would rather not print (shop.openuc2.com, 2026-09-23). */
export const kitOffers = [
  { id: 'corebox', name: 'Discovery CoreBox', price: '€449', note: 'Lenses, mirrors, sample mount, Z-stage' },
  { id: 'qbox', name: 'Discovery QBox', price: '€1 499', note: '520 nm laser, polarisers, beam splitters, ESP32' },
];
