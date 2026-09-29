/**
 * The epi-fluorescence microscope on the landing page's 3D bench, built as a
 * tower (an inverted microscope): the sample on top, the light paths folded
 * down through the stack and out along the plate. The optics are real: the
 * simulate step traces both light paths paraxially.
 *
 *  Excitation (green, 520 nm): the laser, one level up, is focused by an f 50
 *  lens into the objective's back focal plane; the 532 nm dichroic sends it
 *  up, and it leaves the objective as an even, parallel beam over the sample.
 *
 *  Emission (orange): the sample answers with its own light. It goes back down
 *  through the objective (sample at its focal plane, so the light is parallel),
 *  straight through the dichroic and its emission filter, is folded onto the
 *  plate by a mirror, and an f 100 tube lens images it onto the camera, 2×
 *  magnified.
 *
 * Every gap is a multiple of 50 mm, horizontally and between levels, which is
 * what makes the focal lengths line up. Modules are real openUC2 parts from
 * the public OptiKit Store, loaded at run time (not copied into this repo).
 * Orientations use optikit-v2's convention: where each module's local z (its
 * optical axis) and local x point, world z up.
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
    id: 'sample',
    label: 'Sample',
    source: 'Core Box',
    role: 'Glows orange where the green light hits it',
    url: glb('ASS_-_2024_-_CUBSAMHOL_-_V04.glb'),
    cell: [3, 0, 3],
    axes: { z: '+z', x: '+x' },
    optic: { kind: 'sample' },
  },
  {
    id: 'objective',
    label: 'Objective, f = 50',
    source: 'Core Box',
    role: 'Lights the sample and collects its light',
    url: glb('ASS_-_2021_-_CUBLEND40F50_-_V04.glb'),
    cell: [3, 0, 2],
    axes: { z: '+z', x: '+x' },
    optic: { kind: 'objective', f: 50 },
  },
  {
    id: 'dichroic',
    label: 'Dichroic 532 nm',
    source: 'Fluor Box',
    role: 'Sends the green laser up, lets the orange light down through its filter',
    url: glb('ASS_-_2027_-_CUBDICSPL+EMIFIL_WLS532.glb'),
    cell: [3, 0, 1],
    // The emission filter faces down, toward the camera.
    axes: { z: '-y', x: '-x' },
    optic: { kind: 'dichroic' },
  },
  {
    id: 'laser',
    label: 'Laser 520 nm',
    source: 'Q Box',
    role: 'Excites the sample with green light',
    url: glb('ASS_-_2018_-_CUBLAS520_-_V04.glb'),
    cell: [1, 0, 1],
    axes: { z: '+z', x: '+y' },
    optic: { kind: 'source' },
  },
  {
    id: 'lex',
    label: 'Lens f = 50',
    source: 'Core Box',
    role: 'Focuses the laser into the objective, for even light on the sample',
    url: glb('ASS_-_2021_-_CUBLEND40F50_-_V04.glb'),
    cell: [2, 0, 1],
    axes: { z: '+x', x: '+y' },
    optic: { kind: 'lens', f: 50 },
  },
  {
    id: 'mirror',
    label: 'Mirror 45°',
    source: 'Core Box',
    role: 'Folds the image out of the tower, onto the plate',
    url: glb('ASS_-_2020_-_CUBMIR45°TH2_-_V04.glb'),
    cell: [3, 0, 0],
    // Its mirror faces up and toward the tube lens.
    axes: { z: '+y', x: '+z' },
    optic: { kind: 'mirror' },
  },
  {
    id: 'tube',
    label: 'Tube lens f = 100',
    source: 'Core Box',
    role: 'Forms the image on the camera, 2× magnified',
    url: glb('ASS_-_2022_-_CUBLEND40F100_-_V04.glb'),
    cell: [2, 0, 0],
    axes: { z: '+x', x: '+y' },
    optic: { kind: 'lens', f: 100 },
  },
  {
    id: 'spacer',
    label: 'Empty cube',
    source: 'Core Box',
    role: 'Keeps the camera one focal length behind the tube lens, and holds up the laser',
    url: glb('ASS_-_2000_-_CUB_-_V04.glb'),
    cell: [1, 0, 0],
    optic: { kind: 'spacer' },
  },
  {
    id: 'camera',
    label: 'Camera',
    source: 'Raspberry Pi Zero + camera v2.1',
    role: 'Records the fluorescence image',
    url: glb('ASS_-_2045_-_CUBCAM+RASPI0_-_V04.glb'),
    cell: [0, 0, 0],
    axes: { z: '-x', x: '+y' },
    optic: { kind: 'detector' },
  },
];

/** Excitation first, then emission: the order the light travels them. */
export const benchBeams: BenchBeam[] = [
  {
    id: 'excitation',
    light: 'excitation',
    cells: [
      [1, 0, 1],
      [3, 0, 1],
      [3, 0, 3],
    ],
  },
  {
    id: 'emission',
    light: 'emission',
    cells: [
      [3, 0, 3],
      [3, 0, 0],
      [0, 0, 0],
    ],
  },
];

/** Plate size in cells; the tower stands on its right end. */
export const benchPlate: [number, number] = [4, 1];

/** How many levels the tallest stack has. */
export const benchLevels = Math.max(...benchParts.map((p) => (p.cell[2] ?? 0) + 1));
