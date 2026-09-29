/**
 * Cube assemblies for the landing page's 3D pictures: each example design as
 * its cubes on a plate (shown when the visitor switches a card from the
 * schematic to the assembly), and the community's build of the week.
 *
 * Same conventions as benchAssembly.ts: real openUC2 modules from the public
 * OptiKit Store, loaded at run time; cells of 50 mm, a third number stacks a
 * cube a level up; `axes` says where a module's local z and x point, world z
 * up. The light paths only need to be right enough to be drawn.
 */
import type { BenchBeam, BenchPart, BenchPose } from '../components/landing/bench3d/benchScene';

const STORE = 'https://raw.githubusercontent.com/beniroquai/openUC2-OptiKit-Store/main/GLB/';
const glb = (file: string) => STORE + encodeURIComponent(file);

const M = {
  laser: glb('ASS_-_2018_-_CUBLAS520_-_V04.glb'),
  led: glb('ASS_-_2043_-_CUBFLULEDGRENEWENE_-_V04.glb'),
  mirror: glb('ASS_-_2020_-_CUBMIR45°TH2_-_V04.glb'),
  dichroic488: glb('ASS_-_2041_-_CUBDICSPL+EMIFIL_WLS488.glb'),
  dichroic532: glb('ASS_-_2027_-_CUBDICSPL+EMIFIL_WLS532.glb'),
  lens50: glb('ASS_-_2021_-_CUBLEND40F50_-_V04.glb'),
  lens100: glb('ASS_-_2022_-_CUBLEND40F100_-_V04.glb'),
  rms: glb('ASS_-_2051_-_CUBRMSMNT_-_V04.glb'),
  sample: glb('ASS_-_2024_-_CUBSAMHOL_-_V04.glb'),
  camera: glb('ASS_-_2045_-_CUBCAM+RASPI0_-_V04.glb'),
  empty: glb('ASS_-_2000_-_CUB_-_V04.glb'),
};

export interface Assembly {
  parts: BenchPart[];
  beams: BenchBeam[];
  plate: [number, number];
  /** The camera for the picture. */
  pose: BenchPose;
}

/** Lenses and cameras along x, as on most of these benches. */
const alongX = { z: '+x', x: '+y' } as const;

/** Looking down on a flat bench from the front left. */
const flatPose: BenchPose = { from: [-230, -470, 400], at: [0, 10, -10], fov: 28 };

export const exampleAssemblies: Record<string, Assembly> = {
  // Laser → fold mirror → dichroic → objective → sample; the emission comes back to the camera.
  'ex-fluor': {
    plate: [5, 2],
    pose: flatPose,
    parts: [
      { id: 'laser', label: 'Laser', url: M.laser, cell: [0, 1], axes: { z: '+z', x: '+y' }, optic: { kind: 'source' } },
      { id: 'gap', label: 'Empty cube', url: M.empty, cell: [1, 1], optic: { kind: 'spacer' } },
      { id: 'm1', label: 'Mirror', url: M.mirror, cell: [2, 1], axes: { z: '-z', x: '-x' }, optic: { kind: 'mirror' } },
      { id: 'dichroic', label: 'Dichroic', url: M.dichroic488, cell: [2, 0], axes: { z: '+z', x: '+y' }, optic: { kind: 'dichroic' } },
      { id: 'objective', label: 'Objective', url: M.rms, cell: [3, 0], axes: alongX, optic: { kind: 'objective', f: 50 } },
      { id: 'sample', label: 'Sample', url: M.sample, cell: [4, 0], axes: { z: '+x', x: '-y' }, optic: { kind: 'sample' } },
      { id: 'tube', label: 'Tube lens', url: M.lens50, cell: [1, 0], axes: alongX, optic: { kind: 'lens', f: 50 } },
      { id: 'camera', label: 'Camera', url: M.camera, cell: [0, 0], axes: { z: '-x', x: '+y' }, optic: { kind: 'detector' } },
    ],
    beams: [
      { id: 'ex', light: 'excitation', cells: [[0, 1], [2, 1], [2, 0], [4, 0]] },
      { id: 'em', light: 'emission', cells: [[4, 0], [0, 0]] },
    ],
  },

  // LED → two fold mirrors → condenser → sample → objective → tube lens → camera.
  'ex-brightfield': {
    plate: [6, 2],
    pose: { from: [-260, -520, 430], at: [0, 10, -10], fov: 28 },
    parts: [
      { id: 'led', label: 'LED', url: M.led, cell: [3, 1], axes: alongX, optic: { kind: 'source' } },
      { id: 'gap', label: 'Empty cube', url: M.empty, cell: [4, 1], optic: { kind: 'spacer' } },
      { id: 'm1', label: 'Mirror M1', url: M.mirror, cell: [5, 1], axes: { z: '-z', x: '-x' }, optic: { kind: 'mirror' } },
      { id: 'm2', label: 'Mirror M2', url: M.mirror, cell: [5, 0], axes: { z: '-z', x: '+y' }, optic: { kind: 'mirror' } },
      { id: 'condenser', label: 'Condenser', url: M.lens50, cell: [4, 0], axes: alongX, optic: { kind: 'lens', f: 50 } },
      // Light passes the sample: no stop for it here, the beam runs on to the camera.
      { id: 'sample', label: 'Sample', url: M.sample, cell: [3, 0], axes: { z: '+x', x: '-y' }, optic: { kind: 'spacer' } },
      { id: 'objective', label: 'Objective', url: M.rms, cell: [2, 0], axes: alongX, optic: { kind: 'objective', f: 50 } },
      { id: 'tube', label: 'Tube lens', url: M.lens100, cell: [1, 0], axes: alongX, optic: { kind: 'lens', f: 100 } },
      { id: 'camera', label: 'Camera', url: M.camera, cell: [0, 0], axes: { z: '-x', x: '+y' }, optic: { kind: 'detector' } },
    ],
    beams: [{ id: 'light', light: 'excitation', cells: [[3, 1], [5, 1], [5, 0], [0, 0]] }],
  },

  // Laser → f 50 and f 100 (a 1:2 expander) → two mirrors → camera.
  'ex-expander': {
    plate: [6, 2],
    pose: { from: [-260, -520, 430], at: [0, 10, -10], fov: 28 },
    parts: [
      { id: 'laser', label: 'Laser', url: M.laser, cell: [0, 0], axes: { z: '+z', x: '+y' }, optic: { kind: 'source' } },
      { id: 'l1', label: 'L1', url: M.lens50, cell: [1, 0], axes: alongX, optic: { kind: 'lens', f: 50 } },
      { id: 'gap1', label: 'Empty cube', url: M.empty, cell: [2, 0], optic: { kind: 'spacer' } },
      { id: 'gap2', label: 'Empty cube', url: M.empty, cell: [3, 0], optic: { kind: 'spacer' } },
      { id: 'l2', label: 'L2', url: M.lens100, cell: [4, 0], axes: alongX, optic: { kind: 'lens', f: 100 } },
      { id: 'm1', label: 'Mirror M1', url: M.mirror, cell: [5, 0], axes: { z: '+z', x: '-x' }, optic: { kind: 'mirror' } },
      { id: 'm2', label: 'Mirror M2', url: M.mirror, cell: [5, 1], axes: { z: '+z', x: '-y' }, optic: { kind: 'mirror' } },
      { id: 'camera', label: 'Camera', url: M.camera, cell: [4, 1], axes: { z: '-x', x: '+y' }, optic: { kind: 'detector' } },
    ],
    beams: [{ id: 'beam', light: 'excitation', cells: [[0, 0], [5, 0], [5, 1], [4, 1]] }],
  },
};

/**
 * The community's build of the week: an inverted fluorescence microscope as
 * a tower (sample on top, a mirror folding the image onto the plate).
 */
export const featuredBuild: Assembly = {
  plate: [4, 1],
  // Further back and aimed low, so the tower stands in the upper half, clear of the title below.
  pose: { from: [-500, -660, 270], at: [-30, 0, -80], fov: 30 },
  parts: [
    { id: 'sample', label: 'Sample', url: M.sample, cell: [3, 0, 3], axes: { z: '+z', x: '+x' }, optic: { kind: 'sample' } },
    { id: 'objective', label: 'Objective', url: M.lens50, cell: [3, 0, 2], axes: { z: '+z', x: '+x' }, optic: { kind: 'objective', f: 50 } },
    { id: 'dichroic', label: 'Dichroic', url: M.dichroic532, cell: [3, 0, 1], axes: { z: '-y', x: '-x' }, optic: { kind: 'dichroic' } },
    { id: 'laser', label: 'Laser', url: M.laser, cell: [1, 0, 1], axes: { z: '+z', x: '+y' }, optic: { kind: 'source' } },
    { id: 'lex', label: 'Lens', url: M.lens50, cell: [2, 0, 1], axes: alongX, optic: { kind: 'lens', f: 50 } },
    { id: 'mirror', label: 'Mirror', url: M.mirror, cell: [3, 0, 0], axes: { z: '+y', x: '+z' }, optic: { kind: 'mirror' } },
    { id: 'tube', label: 'Tube lens', url: M.lens100, cell: [2, 0, 0], axes: alongX, optic: { kind: 'lens', f: 100 } },
    { id: 'gap', label: 'Empty cube', url: M.empty, cell: [1, 0, 0], optic: { kind: 'spacer' } },
    { id: 'camera', label: 'Camera', url: M.camera, cell: [0, 0, 0], axes: { z: '-x', x: '+y' }, optic: { kind: 'detector' } },
  ],
  beams: [
    { id: 'ex', light: 'excitation', cells: [[1, 0, 1], [3, 0, 1], [3, 0, 3]] },
    { id: 'em', light: 'emission', cells: [[3, 0, 3], [3, 0, 0], [0, 0, 0]] },
  ],
};
