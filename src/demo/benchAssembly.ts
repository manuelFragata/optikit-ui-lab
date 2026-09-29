/**
 * The instrument on the landing page's 3D bench: a laser-scanning
 * fluorescence microscope, stacked like an inverted microscope, with two
 * cameras. The optics are real: the simulate and control steps trace the
 * light paraxially.
 *
 *  Excitation (green, 520 nm): the laser shines into the galvo scanner from
 *  behind. An f 50 scan lens and an f 50 tube lens relay the galvo mirrors
 *  onto the objective's back focal plane (at the dichroic), so the objective
 *  focuses the beam to a spot on the sample, and tilting the galvo moves that
 *  spot across the sample without moving the beam off the objective.
 *
 *  Emission (orange): the sample answers from wherever the spot is. Its light
 *  goes back down through the objective (sample at its focal plane, so the
 *  light is parallel), through the dichroic and its emission filter, and a
 *  mirror folds it onto the plate. A beamsplitter shares it between two
 *  arms, each an f 100 tube lens and a camera: two 2× images.
 *
 *  The objective hangs from a motorised z-stage through a gap in the tower;
 *  in the control step the stage finds focus and the galvo scans.
 *
 * Every gap is a multiple of 50 mm, horizontally and between levels, which is
 * what makes the focal lengths line up. Modules are real openUC2 parts from
 * the public OptiKit Store, loaded at run time (not copied into this repo).
 * Orientations use optikit-v2's convention: where each module's local z (its
 * optical axis) and local x point, world z up.
 */
import type { BenchBeam, BenchController, BenchPart } from '../components/landing/bench3d/benchScene';

const STORE = 'https://raw.githubusercontent.com/beniroquai/openUC2-OptiKit-Store/main/GLB/';
const glb = (file: string) => STORE + encodeURIComponent(file);

export interface BenchPartInfo extends BenchPart {
  /** Where it comes from, as shown in the callout. */
  source: string;
  /** One line: what it does here. */
  role: string;
}

const LENS_F50 = glb('ASS_-_2021_-_CUBLEND40F50_-_V04.glb');
const LENS_F100 = glb('ASS_-_2022_-_CUBLEND40F100_-_V04.glb');
const EMPTY = glb('ASS_-_2000_-_CUB_-_V04.glb');
const CAMERA = glb('ASS_-_2045_-_CUBCAM+RASPI0_-_V04.glb');

export const benchParts: BenchPartInfo[] = [
  /* The tower: sample on top, the objective on its z-stage, the dichroic, the fold mirror. */
  {
    id: 'sample',
    label: 'Sample',
    source: 'Core Box',
    role: 'Glows orange where the scanning spot hits it',
    url: glb('ASS_-_2024_-_CUBSAMHOL_-_V04.glb'),
    cell: [4, 0, 3],
    axes: { z: '+z', x: '+x' },
    optic: { kind: 'sample' },
  },
  {
    id: 'objective',
    label: 'Objective on a z-stage',
    source: 'Motorised z-stage + RMS objective',
    role: 'Focuses the laser to a spot on the sample; the stage moves it to find focus',
    url: glb('ASS_-_3002_-_CASAUTSTGR22.glb'),
    // The stage stands behind the tower, two levels tall; its arm holds the objective in the tower.
    cell: [4, 1, 2],
    levels: 2,
    opticCell: [4, 0, 2],
    carriage: 'OBJMNT|Adapter|M3 x 55|STKCAUHNDCRU',
    optic: { kind: 'objective', f: 50 },
  },
  {
    id: 'dichroic',
    label: 'Dichroic 532 nm',
    source: 'Fluor Box',
    role: 'Sends the green laser up, lets the orange light down through its filter',
    url: glb('ASS_-_2027_-_CUBDICSPL+EMIFIL_WLS532.glb'),
    cell: [4, 0, 1],
    // The emission filter faces down, toward the cameras.
    axes: { z: '-y', x: '-x' },
    optic: { kind: 'dichroic' },
  },
  {
    id: 'mirror',
    label: 'Mirror 45°',
    source: 'Core Box',
    role: 'Folds the image out of the tower, onto the plate',
    url: glb('ASS_-_2020_-_CUBMIR45°TH2_-_V04.glb'),
    cell: [4, 0, 0],
    axes: { z: '+y', x: '+z' },
    optic: { kind: 'mirror' },
  },

  /* Level 1: the laser, the galvo and the relay into the objective. */
  {
    id: 'laser',
    label: 'Laser 520 nm',
    source: 'Q Box',
    role: 'Excites the sample with green light',
    url: glb('ASS_-_2018_-_CUBLAS520_-_V04.glb'),
    cell: [0, 1, 1],
    axes: { z: '+z', x: '+x' },
    optic: { kind: 'source' },
  },
  {
    id: 'galvo',
    label: 'Galvo scanner',
    source: 'Galvo XY + cube insert',
    role: 'Two fast mirrors that tilt the beam: the spot sweeps across the sample',
    url: glb('ASS_-_GalvoScanner_China_Unknownbrand.glb'),
    cell: [0, 0, 1],
    // In from behind, out to the right; the motors face left and front.
    axes: { z: '-x', x: '-y' },
    optic: { kind: 'galvo' },
  },
  {
    id: 'scan',
    label: 'Scan lens f = 50',
    source: 'Core Box',
    role: 'With the tube lens, relays the galvo onto the objective',
    url: LENS_F50,
    cell: [1, 0, 1],
    axes: { z: '+x', x: '+y' },
    optic: { kind: 'lens', f: 50 },
  },
  {
    id: 'relay',
    label: 'Empty cube',
    source: 'Core Box',
    role: 'The gap between scan lens and tube lens: both focal lengths',
    url: EMPTY,
    cell: [2, 0, 1],
    optic: { kind: 'spacer' },
  },
  {
    id: 'tubeEx',
    label: 'Tube lens f = 50',
    source: 'Core Box',
    role: 'Sends the scanned beam through the objective’s back focal plane',
    url: LENS_F50,
    cell: [3, 0, 1],
    axes: { z: '+x', x: '+y' },
    optic: { kind: 'lens', f: 50 },
  },

  /* Level 0: two camera arms off a beamsplitter. */
  {
    id: 'splitter',
    label: 'Beamsplitter 50:50',
    source: 'Core Box',
    role: 'Shares the emission between the two cameras',
    url: glb('ASS_-_2011_-_CUBSPLCUB_-_V04.glb'),
    cell: [3, 0, 0],
    optic: { kind: 'splitter' },
  },
  {
    id: 'tubeA',
    label: 'Tube lens f = 100',
    source: 'Core Box',
    role: 'Forms the image on camera 1, 2× magnified',
    url: LENS_F100,
    cell: [2, 0, 0],
    axes: { z: '+x', x: '+y' },
    optic: { kind: 'lens', f: 100 },
  },
  {
    id: 'spacerA',
    label: 'Empty cube',
    source: 'Core Box',
    role: 'Keeps camera 1 one focal length behind its tube lens',
    url: EMPTY,
    cell: [1, 0, 0],
    optic: { kind: 'spacer' },
  },
  {
    id: 'cameraA',
    label: 'Camera 1',
    source: 'Raspberry Pi Zero + camera v2.1',
    role: 'Records the fluorescence image',
    url: CAMERA,
    cell: [0, 0, 0],
    axes: { z: '-x', x: '+y' },
    optic: { kind: 'detector' },
  },
  {
    id: 'tubeB',
    label: 'Tube lens f = 100',
    source: 'Core Box',
    role: 'Forms the image on camera 2, 2× magnified',
    url: LENS_F100,
    cell: [3, 1, 0],
    axes: { z: '+y', x: '+x' },
    optic: { kind: 'lens', f: 100 },
  },
  {
    id: 'spacerB',
    label: 'Empty cube',
    source: 'Core Box',
    role: 'Keeps camera 2 one focal length behind its tube lens',
    url: EMPTY,
    cell: [3, 2, 0],
    optic: { kind: 'spacer' },
  },
  {
    id: 'cameraB',
    label: 'Camera 2',
    source: 'Raspberry Pi Zero + camera v2.1',
    role: 'Records the same image: add a filter here for a second colour',
    url: CAMERA,
    cell: [3, 3, 0],
    axes: { z: '+y', x: '+x' },
    optic: { kind: 'detector' },
  },

  /* Empty cubes that hold things up. */
  {
    id: 'underLaser',
    label: 'Empty cube',
    source: 'Core Box',
    role: 'Holds up the laser',
    url: EMPTY,
    cell: [0, 1, 0],
    optic: { kind: 'spacer' },
  },
  {
    id: 'underStage0',
    label: 'Empty cube',
    source: 'Core Box',
    role: 'Holds up the z-stage',
    url: EMPTY,
    cell: [4, 1, 0],
    optic: { kind: 'spacer' },
  },
  {
    id: 'underStage1',
    label: 'Empty cube',
    source: 'Core Box',
    role: 'Holds up the z-stage',
    url: EMPTY,
    cell: [4, 1, 1],
    optic: { kind: 'spacer' },
  },
];

/** Excitation first, then emission: the order the light travels them. */
export const benchBeams: BenchBeam[] = [
  {
    id: 'excitation',
    light: 'excitation',
    cells: [
      [0, 1, 1],
      [0, 0, 1],
      [4, 0, 1],
      [4, 0, 3],
    ],
  },
  {
    id: 'camera1',
    light: 'emission',
    cells: [
      [4, 0, 3],
      [4, 0, 0],
      [0, 0, 0],
    ],
  },
  {
    id: 'camera2',
    light: 'emission',
    cells: [
      [4, 0, 3],
      [4, 0, 0],
      [3, 0, 0],
      [3, 3, 0],
    ],
    drawFrom: [3, 0, 0],
  },
];

/** Plate size in cells. */
export const benchPlate: [number, number] = [5, 4];

/** How many levels the tallest stack has. */
export const benchLevels = Math.max(...benchParts.map((p) => (p.cell[2] ?? 0) + (p.levels ?? 1)));

/** The openUC2 controller (ESP32 mainboard in its case), beside the plate; cables in plugging order. */
export const benchController: BenchController = {
  url: glb('ASS_-_4008_-_MAIBRD+CAS.glb'),
  at: [-165, 95],
  wires: [
    { to: 'laser', face: '-x' },
    { to: 'galvo', face: '-x' },
    { to: 'objective', face: '+x' },
    { to: 'cameraA', face: '-x' },
    { to: 'cameraB', face: '+y' },
  ],
};
