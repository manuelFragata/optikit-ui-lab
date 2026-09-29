/**
 * The epi-fluorescence microscope on the landing page's 3D bench, laid out so
 * the optics are real: the simulate step traces both light paths paraxially.
 *
 *  Excitation (green, 520 nm): the laser beam is focused by an f 50 lens into
 *  the objective's back focal plane, reflected up by the 532 nm dichroic, and
 *  leaves the objective as an even, parallel beam over the sample.
 *
 *  Emission (orange): the sample answers with its own light. It goes back
 *  through the objective (sample at its focal plane, so the light is parallel),
 *  straight through the dichroic and its CB565 emission filter, and an f 100
 *  tube lens images it onto the camera, 2× magnified.
 *
 * Modules are real openUC2 parts from the public OptiKit Store, loaded at run
 * time (not copied into this repo). Orientations use optikit-v2's convention:
 * where each module's local z (its optical axis) and local x point, world z up.
 */
import type { BenchBeam, BenchPart } from '../components/landing/bench3d/benchScene';

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
    role: 'Excites the sample with green light',
    url: glb('ASS_-_2018_-_CUBLAS520_-_V04.glb'),
    cell: [0, 3],
    axes: { z: '+z', x: '+y' },
    optic: { kind: 'source' },
  },
  {
    id: 'lex',
    label: 'Lens f = 50',
    source: 'Core Box',
    role: 'Focuses the laser into the objective, for even light on the sample',
    url: glb('ASS_-_2021_-_CUBLEND40F50_-_V04.glb'),
    cell: [1, 3],
    axes: { z: '+x', x: '+y' },
    optic: { kind: 'lens', f: 50 },
  },
  {
    id: 'dichroic',
    label: 'Dichroic 532 nm',
    source: 'Fluor Box',
    role: 'Reflects the green laser, lets the orange emission through its filter',
    url: glb('ASS_-_2027_-_CUBDICSPL+EMIFIL_WLS532.glb'),
    cell: [2, 3],
    // Turned half a turn so the emission filter faces the camera.
    axes: { z: '+z', x: '-x' },
    optic: { kind: 'dichroic' },
  },
  {
    id: 'objective',
    label: 'Objective, f = 50',
    source: 'Core Box',
    role: 'Lights the sample and collects its light',
    url: glb('ASS_-_2021_-_CUBLEND40F50_-_V04.glb'),
    cell: [2, 4],
    axes: { z: '+y', x: '+x' },
    optic: { kind: 'objective', f: 50 },
  },
  {
    id: 'sample',
    label: 'Sample',
    source: 'Core Box',
    role: 'Glows orange where the green light hits it',
    url: glb('ASS_-_2024_-_CUBSAMHOL_-_V04.glb'),
    cell: [2, 5],
    axes: { z: '+y', x: '+x' },
    optic: { kind: 'sample' },
  },
  {
    id: 'tube',
    label: 'Tube lens f = 100',
    source: 'Core Box',
    role: 'Forms the image on the camera, 2× magnified',
    url: glb('ASS_-_2022_-_CUBLEND40F100_-_V04.glb'),
    cell: [2, 2],
    axes: { z: '+y', x: '+x' },
    optic: { kind: 'lens', f: 100 },
  },
  {
    id: 'spacer',
    label: 'Empty cube',
    source: 'Core Box',
    role: 'Keeps the camera one focal length behind the tube lens',
    url: glb('ASS_-_2000_-_CUB_-_V04.glb'),
    cell: [2, 1],
    optic: { kind: 'spacer' },
  },
  {
    id: 'camera',
    label: 'Camera',
    source: 'Raspberry Pi Zero + camera v2.1',
    role: 'Records the fluorescence image',
    url: glb('ASS_-_2045_-_CUBCAM+RASPI0_-_V04.glb'),
    cell: [2, 0],
    axes: { z: '-y', x: '-x' },
    optic: { kind: 'detector' },
  },
];

/** Excitation first, then emission: the order the light travels them. */
export const benchBeams: BenchBeam[] = [
  {
    id: 'excitation',
    light: 'excitation',
    cells: [
      [0, 3],
      [2, 3],
      [2, 5],
    ],
  },
  {
    id: 'emission',
    light: 'emission',
    cells: [
      [2, 5],
      [2, 0],
    ],
  },
];

export const benchPlate: [number, number] = [3, 6];
