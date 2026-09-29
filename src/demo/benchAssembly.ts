/**
 * The small laser microscope on the landing page's 3D bench: real openUC2
 * modules from the public OptiKit Store, loaded at run time (not copied into
 * this repo). Orientations use optikit-v2's convention: where each module's
 * local z (its optical axis) and local x point, world z up.
 */
import type { BenchPart } from '../components/landing/bench3d/benchScene';

const STORE = 'https://raw.githubusercontent.com/beniroquai/openUC2-OptiKit-Store/main/GLB/';
const glb = (file: string) => STORE + encodeURIComponent(file);

export interface BenchPartInfo extends BenchPart {
  /** Where it comes from, as shown in the callout. */
  source: string;
  /** One line: what it does here. */
  role: string;
}

export const benchParts: BenchPartInfo[] = [
  {
    id: 'laser',
    label: 'Laser 520 nm',
    source: 'Q Box',
    role: 'Green light source',
    url: glb('ASS_-_2018_-_CUBLAS520_-_V04.glb'),
    cell: [0, 0],
    axes: { z: '+z', x: '+y' },
  },
  {
    id: 'l1',
    label: 'Lens f = 50',
    source: 'Core Box',
    role: 'Expander, first lens',
    url: glb('ASS_-_2021_-_CUBLEND40F50_-_V04.glb'),
    cell: [1, 0],
    axes: { z: '+x', x: '+y' },
  },
  {
    id: 'l2',
    label: 'Lens f = 100',
    source: 'Core Box',
    role: 'Expander, second lens',
    url: glb('ASS_-_2022_-_CUBLEND40F100_-_V04.glb'),
    cell: [2, 0],
    axes: { z: '+x', x: '+y' },
    mountDemo: true,
  },
  {
    id: 'mirror',
    label: 'Mirror 45°',
    source: 'Core Box',
    role: 'Turns the beam',
    url: glb('ASS_-_2020_-_CUBMIR45°TH2_-_V04.glb'),
    cell: [3, 0],
  },
  {
    id: 'sample',
    label: 'Sample holder',
    source: 'Core Box',
    role: 'Holds the slide',
    url: glb('ASS_-_2024_-_CUBSAMHOL_-_V04.glb'),
    cell: [3, 1],
    axes: { z: '+y', x: '+x' },
  },
  {
    id: 'objective',
    label: 'Lens f = 50',
    source: 'Core Box',
    role: 'Images the sample',
    url: glb('ASS_-_2021_-_CUBLEND40F50_-_V04.glb'),
    cell: [3, 2],
    axes: { z: '+y', x: '+x' },
  },
  {
    id: 'camera',
    label: 'Camera',
    source: 'Raspberry Pi Zero + camera v2.1',
    role: 'Records the image',
    url: glb('ASS_-_2045_-_CUBCAM+RASPI0_-_V04.glb'),
    cell: [3, 3],
    axes: { z: '+y', x: '-x' },
  },
];

/** Beam path through cell centres: laser → expander → mirror → sample → lens → camera. */
export const benchBeam: [number, number][] = [
  [0, 0],
  [3, 0],
  [3, 3],
];

export const benchPlate: [number, number] = [4, 4];
