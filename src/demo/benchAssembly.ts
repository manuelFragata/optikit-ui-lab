/**
 * The laser microscope on the landing page's 3D bench, laid out so the optics
 * are real: the simulate step traces it paraxially and shows what it does.
 *
 *  - A Galilean beam expander: f −50 then f +100, 50 mm apart (f1 + f2), so a
 *    2.5 mm beam leaves collimated at 5 mm, twice as wide.
 *  - A 45° mirror folds the beam up the plate onto the sample.
 *  - 2f–2f imaging: sample, 100 mm to an f 50 lens, 100 mm to the camera.
 *    The illumination focuses in the empty cube between lens and camera, and
 *    the sample is imaged 1:1 (inverted) on the sensor.
 *
 * Modules are real openUC2 parts from the public OptiKit Store, loaded at run
 * time (not copied into this repo). Orientations use optikit-v2's convention:
 * where each module's local z (its optical axis) and local x point, world z up.
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
    role: 'Sends a 2.5 mm green beam',
    url: glb('ASS_-_2018_-_CUBLAS520_-_V04.glb'),
    cell: [0, 0],
    axes: { z: '+z', x: '+y' },
    optic: { kind: 'source' },
  },
  {
    id: 'l1',
    label: 'Lens f = −50',
    source: 'Core Box',
    role: 'Spreads the beam',
    url: glb('ASS_-_2023_-_CUBLEND43F-50_-_V04.glb'),
    cell: [1, 0],
    axes: { z: '+x', x: '+y' },
    optic: { kind: 'lens', f: -50 },
  },
  {
    id: 'l2',
    label: 'Lens f = 100',
    source: 'Core Box',
    role: 'Makes it parallel again, twice as wide',
    url: glb('ASS_-_2022_-_CUBLEND40F100_-_V04.glb'),
    cell: [2, 0],
    axes: { z: '+x', x: '+y' },
    optic: { kind: 'lens', f: 100 },
  },
  {
    id: 'mirror',
    label: 'Mirror 45°',
    source: 'Core Box',
    role: 'Folds the beam onto the sample',
    url: glb('ASS_-_2020_-_CUBMIR45°TH2_-_V04.glb'),
    cell: [3, 0],
    optic: { kind: 'mirror' },
  },
  {
    id: 'sample',
    label: 'Sample holder',
    source: 'Core Box',
    role: 'Holds the slide in the beam',
    url: glb('ASS_-_2024_-_CUBSAMHOL_-_V04.glb'),
    cell: [3, 1],
    axes: { z: '+y', x: '+x' },
    optic: { kind: 'sample' },
  },
  {
    id: 'spacer1',
    label: 'Empty cube',
    source: 'Core Box',
    role: 'Keeps the sample 2f from the lens',
    url: glb('ASS_-_2000_-_CUB_-_V04.glb'),
    cell: [3, 2],
    optic: { kind: 'spacer' },
  },
  {
    id: 'objective',
    label: 'Lens f = 50',
    source: 'Core Box',
    role: 'Images the sample 1:1',
    url: glb('ASS_-_2021_-_CUBLEND40F50_-_V04.glb'),
    cell: [3, 3],
    axes: { z: '+y', x: '+x' },
    optic: { kind: 'lens', f: 50 },
  },
  {
    id: 'spacer2',
    label: 'Empty cube',
    source: 'Core Box',
    role: 'The beam focuses in here',
    url: glb('ASS_-_2000_-_CUB_-_V04.glb'),
    cell: [3, 4],
    optic: { kind: 'spacer' },
  },
  {
    id: 'camera',
    label: 'Camera',
    source: 'Raspberry Pi Zero + camera v2.1',
    role: 'Records the image, 2f behind the lens',
    url: glb('ASS_-_2045_-_CUBCAM+RASPI0_-_V04.glb'),
    cell: [3, 5],
    axes: { z: '+y', x: '-x' },
    optic: { kind: 'detector' },
  },
];

/** Beam path through cell centres: laser → expander → mirror → sample → lens → camera. */
export const benchBeam: [number, number][] = [
  [0, 0],
  [3, 0],
  [3, 5],
];

export const benchPlate: [number, number] = [4, 6];
