/**
 * The landing page's 3D bench, in four steps:
 *
 *  - sketch:   the design as Optikit draws it: simple glyphs on the cell grid,
 *              cube outlines, the beam axis (optikit-v2's schematic style).
 *  - simulate: the light, traced paraxially through the actual optics, runs
 *              slowly along each path as a beam of the right width: first the
 *              excitation, then (after the sample lights up) the emission.
 *  - cubify:   the real openUC2 modules (GLB) appear part by part, all at the
 *              same time: optics, then inserts, then one cube half, then the
 *              other, then the screws.
 *  - control:  the instrument is plugged into the openUC2 controller: the
 *              z-stage finds focus, the galvo sweeps the spot over the sample
 *              and the emission follows it onto the cameras.
 *
 * Plain three.js, loaded only when the section is on screen; it renders on
 * demand and stops when nothing moves. Coordinates follow the meshes:
 * millimetres, z up, one cell = 50 mm, a cube centred on its cell; cubes on
 * the plate are at z = 0 and each level up adds a cube height (50 mm, like the
 * horizontal pitch). The root group turns z-up into three's y-up.
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type BenchStep = 'sketch' | 'simulate' | 'cubify' | 'control';
export type Axis = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';
export type OpticKind =
  | 'source'
  | 'galvo'
  | 'lens'
  | 'objective'
  | 'mirror'
  | 'dichroic'
  | 'splitter'
  | 'sample'
  | 'detector'
  | 'spacer';
/** Grid cell [x, y] on the plate, or [x, y, level] for a cube stacked above it. */
export type BenchCell = [number, number] | [number, number, number];

/**
 * A light path through cell centres. `excitation` starts at a source as a
 * parallel beam; `emission` starts at the sample as light from a point on it.
 */
export interface BenchBeam {
  id: string;
  cells: BenchCell[];
  light: 'excitation' | 'emission';
  /**
   * A branch: the light is traced from the start of the path but drawn only
   * from this cell on (where a beamsplitter sends part of it another way).
   */
  drawFrom?: BenchCell;
}

export interface BenchOptic {
  kind: OpticKind;
  /** Focal length in mm (lenses; negative for a diverging lens). */
  f?: number;
}

export interface BenchPart {
  id: string;
  label: string;
  /** GLB URL of the module. */
  url: string;
  /** Grid cell; a third number stacks the cube that many levels up. */
  cell: BenchCell;
  /** How many levels the module stands (a z-stage is two). */
  levels?: number;
  /** Where the optic sits when it is not in the module's own cell (an objective on a z-stage arm). */
  opticCell?: BenchCell;
  /** Names of the meshes the module moves in the control step (a z-stage's carriage), as a regular expression. */
  carriage?: string;
  /**
   * Orientation as in optikit-v2 designs: where the module's local z and x
   * axes point in the world (z up). Identity when omitted.
   */
  axes?: { z: Axis; x: Axis };
  optic: BenchOptic;
}

/** The controller the instrument is plugged into in the control step. */
export interface BenchController {
  url: string;
  /** Centre on the table, mm (x, y). */
  at: [number, number];
  /** Cables, in the order they are plugged in: which part, into which of its faces. */
  wires: { to: string; face: Axis }[];
}

export interface BenchColors {
  /** Excitation light. */
  beam: string;
  /** The sample's response (fluorescence). */
  beamEmission: string;
  plate: string;
  tile: string;
  outline: string;
  selection: string;
  grid: string;
  gridMajor: string;
  /** optikit-v2 glyph colours per kind; kinds left out use optikit-v2's defaults. */
  glyphs: Partial<Record<OpticKind, string>>;
  sensor: string;
  coating: string;
  /** Cables to the controller. */
  cable?: string;
  /** The controller's status light. */
  led?: string;
}

export interface BenchPin {
  id: string;
  x: number;
  y: number;
  /** In front of the camera and inside the canvas. */
  visible: boolean;
}

/** Where the control step is, for the live view beside the stage. */
export interface BenchControlState {
  phase: 'plug' | 'focus' | 'scan' | 'done';
  /** How far the cables are plugged in, 0–1. */
  plugged: number;
  /** The objective's distance from focus, mm. */
  defocus: number;
  /** Scan progress over one frame, 0–1 (1 once done). */
  scan: number;
  /** Lines per frame. */
  lines: number;
}

export interface BenchSceneOptions {
  parts: BenchPart[];
  /** Light paths, in the order the light travels them. */
  beams: BenchBeam[];
  /** Plate size in cells. */
  plate: [number, number];
  controller?: BenchController;
  colors: BenchColors;
  onPins?: (pins: BenchPin[]) => void;
  onSelect?: (id: string | null) => void;
  /** A part's mesh finished loading (or failed). */
  onPartLoaded?: (id: string, ok: boolean) => void;
  /** Every frame of the control step. */
  onControl?: (state: BenchControlState) => void;
  initialStep?: BenchStep;
  /** Camera flights, the light run and the cubify frames; off for reduced motion. */
  motion?: boolean;
  /** Drag to turn and click to pick; off for a picture (a card). Default on. */
  interactive?: boolean;
  /** Camera per step, relative to the bench's centre (mm, z up), replacing the defaults. */
  poses?: Partial<Record<BenchStep, BenchPose>>;
  /** One cubify frame, ms. */
  frameMs?: number;
  /** Turn slowly once cubify is done. Default on. */
  turntable?: boolean;
}

/** A camera: where it is and what it looks at, both relative to the bench's centre. */
export interface BenchPose {
  from: [number, number, number];
  at: [number, number, number];
  fov: number;
}

export interface BenchScene {
  setStep: (step: BenchStep) => void;
  setColors: (colors: BenchColors) => void;
  select: (id: string | null) => void;
  /** Pause rendering while off screen. */
  setActive: (active: boolean) => void;
  /** Play the current step again from its start (cubify builds up again). */
  restart: () => void;
  dispose: () => void;
}

const CELL = 50;
const PLATE_TOP = -26.9; // cube bottoms sit on the tiles
const FLOOR = PLATE_TOP - 11; // underside of the plate: the table

/** optikit-v2's glyph colours (frontend/src/components/schematic/colors.ts). */
const V2_GLYPHS: Record<OpticKind, string> = {
  source: '#e74c3c',
  galvo: '#c86bd8', // v2's programmable surfaces
  lens: '#4aa3ff',
  objective: '#2f6fd6',
  mirror: '#b8c4cc',
  dichroic: '#2ec4a5',
  splitter: '#9b7fd4',
  sample: '#7cc142',
  detector: '#546878',
  spacer: '#8a8f98',
};

/** Beam radius leaving the laser, mm. */
const BEAM_RADIUS = 2.5;
/** Speed of the light front in the simulate step, mm per second. */
const LIGHT_SPEED = 85;
/** Pause at the end of a light run before it starts again, ms. */
const LIGHT_HOLD = 2600;
/** One cubify frame, ms. */
const DEFAULT_FRAME_MS = 1400;
/** Lateral offset of the second imaged point on the sample, mm. */
const OBJECT_HEIGHT = 1.2;
/** Height at the first lens of the emission's marginal ray, mm. */
const EMISSION_APERTURE = 8;
/** The sample lights up this long before its emission sets off, ms. */
const SAMPLE_PAUSE = 500;

/* Control step timing, ms, and travel. */
const PLUG_MS = 1900;
const CABLE_MS = 900;
const FOCUS_MS = 2400;
const SCAN_MS = 6400;
const DONE_MS = 2000;
/** How far off focus the objective starts, mm (exaggerated to be seen). */
const DEFOCUS = 9;
/** Galvo tilt at the edge of the field, rad: the spot moves ±f·θ. */
const SCAN_ANGLE = 0.11;
const SCAN_LINES = 16;

const AXIS: Record<Axis, [number, number, number]> = {
  '+x': [1, 0, 0],
  '-x': [-1, 0, 0],
  '+y': [0, 1, 0],
  '-y': [0, -1, 0],
  '+z': [0, 0, 1],
  '-z': [0, 0, -1],
};

const cellPoint = (cell: BenchCell) => new Vector3(cell[0] * CELL, cell[1] * CELL, (cell[2] ?? 0) * CELL);

/** Rotation that sends local z and x to the given world axes (y = z × x). */
function orientation(axes: { z: Axis; x: Axis }) {
  const z = new Vector3(...AXIS[axes.z]);
  const x = new Vector3(...AXIS[axes.x]);
  const y = new Vector3().crossVectors(z, x);
  return new Matrix4().makeBasis(x, y, z);
}

/* ------------------------------------------------------------------ */
/* Beam path and paraxial trace                                        */
/* ------------------------------------------------------------------ */

interface PathModel {
  length: number;
  /** Position, direction and a lateral direction (for ray heights) at distance s. */
  at: (s: number) => { pos: Vector3; dir: Vector3; lat: Vector3 };
  /** Distance along the path of a point on it, or null when it is off the path. */
  distanceOf: (p: Vector3) => number | null;
  /** Directions before and after a point (they differ at a fold). */
  dirsAt: (s: number) => { before: Vector3; after: Vector3 };
}

function makePath(cells: BenchCell[]): PathModel {
  const pts = cells.map(cellPoint);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const length = cum[cum.length - 1];
  const segDir = (i: number) => new Vector3().subVectors(pts[i + 1], pts[i]).normalize();

  // The lateral direction starts in the plane of the first fold and is
  // mirrored at every fold, as a ray's height is: the traced heights stay
  // on the right side of the axis around corners and between levels.
  const dirs = pts.slice(0, -1).map((_, i) => segDir(i));
  const lats: Vector3[] = [];
  const bend = dirs.length > 1 ? new Vector3().crossVectors(dirs[0], dirs[1]) : new Vector3();
  if (bend.lengthSq() > 1e-6) lats.push(new Vector3().crossVectors(bend, dirs[0]).normalize());
  else if (Math.abs(dirs[0].z) > 0.9) lats.push(new Vector3(1, 0, 0));
  else lats.push(new Vector3(-dirs[0].y, dirs[0].x, 0));
  for (let i = 1; i < dirs.length; i++) {
    const n = new Vector3().subVectors(dirs[i], dirs[i - 1]).normalize();
    const prev = lats[i - 1];
    lats.push(n.lengthSq() > 1e-6 ? prev.clone().addScaledVector(n, -2 * prev.dot(n)) : prev.clone());
  }

  const segmentOf = (s: number) => {
    for (let i = 0; i < pts.length - 1; i++) if (s <= cum[i + 1] + 1e-6) return i;
    return pts.length - 2;
  };

  return {
    length,
    at(s) {
      const c = Math.min(Math.max(s, 0), length);
      const i = segmentOf(c);
      const dir = segDir(i);
      return { pos: pts[i].clone().addScaledVector(dir, c - cum[i]), dir, lat: lats[i].clone() };
    },
    distanceOf(p) {
      for (let i = 0; i < pts.length - 1; i++) {
        const d = segDir(i);
        const t = new Vector3().subVectors(p, pts[i]).dot(d);
        const len = cum[i + 1] - cum[i];
        if (t < -1e-6 || t > len + 1e-6) continue;
        const foot = pts[i].clone().addScaledVector(d, t);
        if (foot.distanceTo(p) < 1) return cum[i] + t;
      }
      return null;
    },
    dirsAt(s) {
      const i = segmentOf(s);
      const atVertex = Math.abs(s - cum[i + 1]) < 1e-6 && i + 1 < pts.length - 1;
      return { before: segDir(i), after: atVertex ? segDir(i + 1) : segDir(i) };
    },
  };
}

/** A thin lens (f) or a tilt (du, a galvo mirror turning the beam) at distance s. */
interface OpticEvent {
  s: number;
  f?: number;
  du?: number;
}

/**
 * Paraxial trace of one ray: height y (mm) at every millimetre from `from`
 * to `to`. Thin lenses bend the ray by −y/f; a galvo adds its tilt; fold
 * mirrors only turn the path, which the path model already does.
 */
function trace(y0: number, u0: number, from: number, to: number, events: OpticEvent[]) {
  const n = Math.floor(to - from) + 1;
  const out = new Float32Array(n);
  const ev = events.filter((l) => l.s >= from - 1e-6).sort((a, b) => a.s - b.s);
  let y = y0;
  let u = u0;
  let e = 0;
  for (let i = 0; i < n; i++) {
    const s = from + i;
    out[i] = y;
    while (e < ev.length && ev[e].s < s + 1 - 1e-6) {
      // Advance to the event, act, then carry on to the next millimetre.
      const d = ev[e].s - s;
      const yl = y + u * d;
      if (ev[e].f) u -= yl / (ev[e].f as number);
      if (ev[e].du) u += ev[e].du as number;
      y = yl - u * d;
      e++;
    }
    y += u;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

const loader = new GLTFLoader();
const cache = new Map<string, Promise<Group>>();

/** raw.githubusercontent.com drops the odd connection; try a few times. */
async function fetchModel(url: string, attempts = 3): Promise<Group> {
  for (let i = 1; ; i++) {
    try {
      return (await loader.loadAsync(url)).scene;
    } catch (err) {
      if (i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 600 * i));
    }
  }
}

function loadModel(url: string): Promise<Group> {
  let p = cache.get(url);
  if (!p) {
    p = fetchModel(url);
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p.then((scene) => scene.clone(true));
}

/**
 * Most modules are modelled around their cube's centre; a few (the galvo
 * scanner) are not. Centre those on their cube halves.
 */
function centreOnCube(model: Group) {
  model.updateMatrixWorld(true);
  const box = new Box3();
  model.traverse((o) => {
    const name = `${o.name} ${o.parent?.name ?? ''}`;
    if ((o as Mesh).isMesh && /CUBHLF/i.test(name)) box.expandByObject(o);
  });
  if (!box.isEmpty()) model.position.sub(box.getCenter(new Vector3()));
}

type SubName = 'optics' | 'insert' | 'shellA' | 'shellB' | 'screws';
const SUBS: SubName[] = ['optics', 'insert', 'shellA', 'shellB', 'screws'];

/** What is shown in each cubify frame, in order. */
const FRAMES: SubName[][] = [['optics'], ['optics', 'insert'], ['optics', 'insert', 'shellA'], ['optics', 'insert', 'shellA', 'shellB'], SUBS];

interface Sub {
  group: Group;
  mats: MeshStandardMaterial[];
  v: number;
  target: number;
  /** Where it comes from when not yet placed (module frame). */
  from: Vector3;
}

const matte = (src: MeshStandardMaterial, metal: boolean) => {
  const glass = src.transparent || src.opacity < 1;
  const mat = new MeshStandardMaterial({
    color: src.color?.clone() ?? new Color('#cccccc'),
    roughness: glass ? 0.05 : metal ? 0.35 : 0.62,
    metalness: metal ? 0.7 : 0.02,
    transparent: true,
    opacity: 0,
    depthWrite: !glass,
  });
  mat.userData.base = glass ? 0.45 : 1;
  return { mat, glass };
};

/**
 * Sort a module's meshes into what goes in when: bought optics, printed
 * inserts, the two cube halves and the screws. Materials become matte (the
 * store's leave metalness at the glTF default, which reads as chrome).
 */
function splitModel(model: Group, localUp: Vector3): Record<SubName, Sub> {
  model.updateMatrixWorld(true);
  const meshes: Mesh[] = [];
  model.traverse((o) => {
    if ((o as Mesh).isMesh) meshes.push(o as Mesh);
  });
  const make = (from: Vector3): Sub => {
    const group = new Group();
    model.add(group);
    return { group, mats: [], v: 0, target: 0, from };
  };
  const subs: Record<SubName, Sub> = {
    optics: make(localUp.clone().multiplyScalar(30)),
    insert: make(localUp.clone().multiplyScalar(90)),
    shellA: make(new Vector3()),
    shellB: make(new Vector3()),
    screws: make(localUp.clone().multiplyScalar(60)),
  };

  const shells: Mesh[] = [];
  for (const mesh of meshes) {
    const name = `${mesh.name} ${mesh.parent?.name ?? ''}`;
    mesh.userData.fullName = name; // the parent's name is lost once the mesh moves into its group
    let sub: SubName;
    if (/CUBHLF/i.test(name)) {
      shells.push(mesh);
      continue;
    } else if (/screw|ISO|DIN|TP lens|nut/i.test(name)) sub = 'screws';
    else if (/\bBUY\b/.test(name)) sub = 'optics';
    else sub = 'insert';
    subs[sub].group.attach(mesh);
  }

  // The two halves separate along the line between their centres.
  const centres = shells.map((m) => new Box3().setFromObject(m).getCenter(new Vector3()));
  const axis = centres.length === 2 ? new Vector3().subVectors(centres[0], centres[1]).normalize() : new Vector3(0, 0, 1);
  if (!Number.isFinite(axis.x)) axis.set(0, 0, 1);
  shells.forEach((m, i) => {
    const sub = i === 0 ? subs.shellA : subs.shellB;
    sub.group.attach(m);
    sub.from = axis.clone().multiplyScalar(85 * (i === 0 ? 1 : -1));
  });

  for (const s of SUBS) {
    subs[s].group.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const { mat, glass } = matte(mesh.material as MeshStandardMaterial, s === 'screws');
      mesh.material = mat;
      mesh.castShadow = !glass;
      mesh.receiveShadow = true;
      subs[s].mats.push(mat);
    });
  }
  return subs;
}

/**
 * A stand-in RMS objective for the z-stage's mount (the store's mount holds
 * none): a dark barrel with a coloured magnification ring, pointing up.
 */
function makeObjective(up: Vector3) {
  const g = new Group();
  const body = new MeshStandardMaterial({ color: '#2a2e33', roughness: 0.4, metalness: 0.5, transparent: true, opacity: 0 });
  const ring = new MeshStandardMaterial({ color: '#e0b43a', roughness: 0.5, metalness: 0.1, transparent: true, opacity: 0 });
  const chrome = new MeshStandardMaterial({ color: '#b9c0c7', roughness: 0.25, metalness: 0.8, transparent: true, opacity: 0 });
  for (const m of [body, ring, chrome]) m.userData.base = 1;
  const Y = new Vector3(0, 1, 0);
  const seg = (r0: number, r1: number, z0: number, z1: number, mat: MeshStandardMaterial) => {
    const mesh = new Mesh(new CylinderGeometry(r1, r0, z1 - z0, 32), mat);
    mesh.quaternion.setFromUnitVectors(Y, up);
    mesh.position.copy(up).multiplyScalar((z0 + z1) / 2);
    mesh.castShadow = true;
    g.add(mesh);
  };
  seg(10, 10, 6, 20, body);
  seg(10.2, 10.2, 20, 22.5, ring);
  seg(9, 5.5, 22.5, 30, chrome);
  return { group: g, mats: [body, ring, chrome] };
}

function disposeObject(obj: Object3D) {
  obj.traverse((o) => {
    const m = o as Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as Material | Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}

/* ------------------------------------------------------------------ */
/* Faders                                                              */
/* ------------------------------------------------------------------ */

/** A set of materials whose opacity eases toward a target. */
class Fader {
  v: number;
  target: number;
  readonly mats: Material[];
  readonly objects: Object3D[];
  constructor(mats: Material[], objects: Object3D[], initial: number) {
    this.mats = mats;
    this.objects = objects;
    this.v = initial;
    this.target = initial;
    for (const m of mats) m.userData.base ??= m.opacity;
    this.apply();
  }
  apply() {
    for (const m of this.mats) m.opacity = (m.userData.base as number) * this.v;
    for (const o of this.objects) o.visible = this.v > 0.005;
  }
  /** Returns true while still moving. */
  step(k: number) {
    if (Math.abs(this.v - this.target) < 0.004) {
      if (this.v !== this.target) {
        this.v = this.target;
        this.apply();
      }
      return false;
    }
    this.v += (this.target - this.v) * k;
    this.apply();
    return true;
  }
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export function createBenchScene(canvas: HTMLCanvasElement, options: BenchSceneOptions): BenchScene {
  const { parts, beams, plate, controller } = options;
  const motion = options.motion ?? true;
  const interactive = options.interactive ?? true;
  const turntable = options.turntable ?? true;
  const FRAME_MS = options.frameMs ?? DEFAULT_FRAME_MS;
  let colors = options.colors;
  const glyphColor = (kind: OpticKind) => colors.glyphs[kind] ?? V2_GLYPHS[kind];

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.55;

  scene.add(new HemisphereLight('#ffffff', '#8a929c', 0.55));
  scene.add(new AmbientLight('#ffffff', 0.15));
  const sun = new DirectionalLight('#ffffff', 1.6);
  sun.position.set(-160, 520, 260);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0004;
  const levels = Math.max(...parts.map((p) => (p.cell[2] ?? 0) + (p.levels ?? 1)));
  const span = Math.max(plate[0], plate[1], levels) * CELL + (controller ? 120 : 0);
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 10, far: 1800 });
  scene.add(sun);

  const root = new Group();
  root.rotation.x = -Math.PI / 2; // z-up content
  scene.add(root);

  const centre = new Vector3(((plate[0] - 1) * CELL) / 2, ((plate[1] - 1) * CELL) / 2, ((levels - 1) * CELL) / 2);
  sun.target.position.set(centre.x, centre.z, -centre.y);
  scene.add(sun.target);

  /* ---- sketch grid on the plate (cell boundaries, a major line every 5 cells) ---- */
  const gridGroup = new Group();
  const minorMat = new LineBasicMaterial({ color: colors.grid, transparent: true, opacity: 1 });
  const majorMat = new LineBasicMaterial({ color: colors.gridMajor, transparent: true, opacity: 1 });
  {
    const margin = 3;
    const x0 = -margin;
    const x1 = plate[0] + margin;
    const y0 = -margin;
    const y1 = plate[1] + margin;
    const minor: number[] = [];
    const major: number[] = [];
    const z = PLATE_TOP;
    for (let i = x0; i <= x1; i++) {
      const x = i * CELL - CELL / 2;
      (i % 5 === 0 ? major : minor).push(x, y0 * CELL - CELL / 2, z, x, y1 * CELL - CELL / 2, z);
    }
    for (let j = y0; j <= y1; j++) {
      const y = j * CELL - CELL / 2;
      (j % 5 === 0 ? major : minor).push(x0 * CELL - CELL / 2, y, z, x1 * CELL - CELL / 2, y, z);
    }
    const g = (arr: number[]) => new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(arr), 3));
    gridGroup.add(new LineSegments(g(minor), minorMat), new LineSegments(g(major), majorMat));
  }
  root.add(gridGroup);

  /* ---- baseplate: a dark slab with one light puzzle tile per cell ---- */
  const plateGroup = new Group();
  const slabMat = new MeshStandardMaterial({ color: colors.plate, roughness: 0.8, metalness: 0, transparent: true });
  const tileMat = new MeshStandardMaterial({ color: colors.tile, roughness: 0.7, metalness: 0, transparent: true });
  const slab = new Mesh(new RoundedBoxGeometry(plate[0] * CELL + 8, plate[1] * CELL + 8, 6, 3, 3), slabMat);
  slab.position.set(((plate[0] - 1) * CELL) / 2, ((plate[1] - 1) * CELL) / 2, PLATE_TOP - 5 - 3);
  slab.receiveShadow = true;
  plateGroup.add(slab);
  const tileGeo = new RoundedBoxGeometry(CELL - 3, CELL - 3, 5, 2, 2);
  for (let gx = 0; gx < plate[0]; gx++) {
    for (let gy = 0; gy < plate[1]; gy++) {
      const tile = new Mesh(tileGeo, tileMat);
      tile.position.set(gx * CELL, gy * CELL, PLATE_TOP - 2.5);
      tile.receiveShadow = true;
      plateGroup.add(tile);
    }
  }
  root.add(plateGroup);

  /* ---- light paths: a paraxial trace per path, drawn as a tube and rays ---- */
  const opticPoint = (part: BenchPart) => cellPoint(part.opticCell ?? part.cell);
  const isLens = (k: OpticKind) => k === 'lens' || k === 'objective';
  const RING = 20;
  const FAN = [-1, 0, 1];

  interface BeamModel {
    def: BenchBeam;
    path: PathModel;
    end: number;
    /** Drawn from here on (a branch), mm along the path. */
    start: number;
    /** Per millimetre: position, direction, the two lateral directions. */
    pos: Vector3[];
    lat: Vector3[];
    lat2: Vector3[];
    /** Marginal ray: the beam's radius (signed) at every millimetre. */
    marginal: Float32Array;
    lenses: OpticEvent[];
    /** Where the galvo tilts the beam, if it passes one. */
    galvoAt: number | null;
    /** Emission: sample to the first lens, for the chief ray from a point. */
    toLens: number;
    envGeo: BufferGeometry;
    envelope: Mesh;
    axisGeo: BufferGeometry;
    axisLine: Line;
    rays: Line[];
    glow: Mesh;
    /** Emission only: the sample lighting up. */
    sampleGlow: Mesh | null;
    envMat: MeshBasicMaterial;
    axisMat: LineBasicMaterial;
    rayMat: LineBasicMaterial;
    glowMat: MeshBasicMaterial;
  }

  const beamColor = (def: BenchBeam, c: BenchColors) => (def.light === 'emission' ? c.beamEmission : c.beam);
  const zeros = (n: number) => new Float32Array(n);

  const beamModels: BeamModel[] = beams.map((def) => {
    const path = makePath(def.cells);
    const on = parts.flatMap((part) => {
      const at = path.distanceOf(opticPoint(part));
      return at === null ? [] : [{ part, s: at }];
    });
    const lenses: OpticEvent[] = on.flatMap((x) => (isLens(x.part.optic.kind) && x.part.optic.f ? [{ s: x.s, f: x.part.optic.f }] : []));
    const first = (kind: OpticKind) => on.filter((x) => x.part.optic.kind === kind).sort((m, n) => m.s - n.s)[0]?.s ?? null;
    const galvoAt = first('galvo');
    const firstLens = lenses.filter((l) => l.s > 0).sort((m, n) => m.s - n.s)[0];
    const toLens = firstLens ? firstLens.s : CELL;

    let end: number;
    let marginal: Float32Array;
    if (def.light === 'excitation') {
      // A parallel beam from the source, as far as the sample.
      end = first('sample') ?? first('detector') ?? path.length;
      marginal = trace(BEAM_RADIUS, 0, 0, end, lenses);
    } else {
      // Light from a point on the sample: the on-axis marginal ray is the envelope.
      end = first('detector') ?? path.length;
      marginal = trace(0, EMISSION_APERTURE / toLens, 0, end, lenses);
    }
    const start = def.drawFrom ? (path.distanceOf(cellPoint(def.drawFrom)) ?? 0) : 0;

    const n = marginal.length;
    const pos: Vector3[] = [];
    const lat: Vector3[] = [];
    const lat2: Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const a = path.at(i);
      pos.push(a.pos);
      lat.push(a.lat);
      lat2.push(new Vector3().crossVectors(a.dir, a.lat));
    }

    const color = beamColor(def, colors);
    const envGeo = new BufferGeometry();
    envGeo.setAttribute('position', new BufferAttribute(new Float32Array(n * RING * 3), 3));
    const index: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      for (let k = 0; k < RING; k++) {
        const v0 = i * RING + k;
        const v1 = i * RING + ((k + 1) % RING);
        const v2 = (i + 1) * RING + k;
        const v3 = (i + 1) * RING + ((k + 1) % RING);
        index.push(v0, v2, v1, v1, v2, v3);
      }
    }
    envGeo.setIndex(index);
    const envMat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false, side: DoubleSide });
    const envelope = new Mesh(envGeo, envMat);
    envelope.renderOrder = 3;
    envelope.frustumCulled = false;

    const axisGeo = new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    const axisMat = new LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const axisLine = new Line(axisGeo, axisMat);
    axisLine.renderOrder = 4;
    axisLine.frustumCulled = false;

    const rayMat = new LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const rays = def.light === 'emission'
      ? Array.from({ length: FAN.length * 2 }, () => {
          const line = new Line(new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3)), rayMat);
          line.renderOrder = 4;
          line.frustumCulled = false;
          return line;
        })
      : [];

    const glowMat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false });
    const glow = new Mesh(new SphereGeometry(4, 16, 12), glowMat);
    let sampleGlow: Mesh | null = null;
    if (def.light === 'emission' && !def.drawFrom) {
      sampleGlow = new Mesh(new SphereGeometry(9, 24, 16), new MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false }));
      sampleGlow.position.copy(pos[0]);
      sampleGlow.visible = false;
    }
    const group = new Group();
    group.add(envelope, axisLine, ...rays, glow, ...(sampleGlow ? [sampleGlow] : []));
    root.add(group);
    return { def, path, end, start, pos, lat, lat2, marginal, lenses, galvoAt, toLens, envGeo, envelope, axisGeo, axisLine, rays, glow, sampleGlow, envMat, axisMat, rayMat, glowMat };
  });

  /** A chief ray: heights along both lateral directions. */
  interface Chief {
    a: Float32Array;
    b: Float32Array;
  }

  const q = new Vector3();
  /**
   * Write a beam's geometry: its envelope and axis follow the chief ray, and
   * each fan (emission) draws three rays from a point on the sample.
   */
  function writeBeam(bm: BeamModel, chief: Chief | null, fans: Chief[]) {
    const n = bm.marginal.length;
    const env = bm.envGeo.getAttribute('position') as BufferAttribute;
    const axis = bm.axisGeo.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < n; i++) {
      const ca = chief ? chief.a[i] : 0;
      const cb = chief ? chief.b[i] : 0;
      const c = bm.pos[i].clone().addScaledVector(bm.lat[i], ca).addScaledVector(bm.lat2[i], cb);
      axis.setXYZ(i, c.x, c.y, c.z);
      const r = Math.max(0.35, Math.abs(bm.marginal[i]));
      for (let k = 0; k < RING; k++) {
        const ang = (k / RING) * Math.PI * 2;
        q.copy(c).addScaledVector(bm.lat[i], Math.cos(ang) * r).addScaledVector(bm.lat2[i], Math.sin(ang) * r);
        env.setXYZ(i * RING + k, q.x, q.y, q.z);
      }
    }
    env.needsUpdate = true;
    axis.needsUpdate = true;
    bm.rays.forEach((line, j) => {
      const fan = fans[Math.floor(j / FAN.length)];
      line.visible = Boolean(fan);
      if (!fan) return;
      const k = FAN[j % FAN.length];
      const attr = line.geometry.getAttribute('position') as BufferAttribute;
      for (let i = 0; i < n; i++) {
        q.copy(bm.pos[i]).addScaledVector(bm.lat[i], fan.a[i] + k * bm.marginal[i]).addScaledVector(bm.lat2[i], fan.b[i]);
        attr.setXYZ(i, q.x, q.y, q.z);
      }
      attr.needsUpdate = true;
    });
  }

  /** The chief ray from a point (a, b) on the sample, through an emission path. */
  const pointChief = (bm: BeamModel, a: number, b: number): Chief => ({
    a: trace(a, -a / bm.toLens, 0, bm.end, bm.lenses),
    b: trace(b, -b / bm.toLens, 0, bm.end, bm.lenses),
  });

  /** Everything at rest: the beam on axis, fans from two points on the sample. */
  function writeRest() {
    for (const bm of beamModels) {
      const n = bm.marginal.length;
      writeBeam(bm, null, bm.def.light === 'emission' ? [{ a: zeros(n), b: zeros(n) }, pointChief(bm, OBJECT_HEIGHT, 0)] : []);
    }
  }
  writeRest();
  let atRest = true;

  /** Show a path's light up to distance `front`; `lit` lights the sample (emission). */
  function setFront(bm: BeamModel, front: number, lit = false, now = 0) {
    const f = Math.max(0, Math.min(front, bm.end));
    const shown = f > 0 ? Math.floor(f) + 1 : 0;
    const from = Math.min(Math.ceil(bm.start), shown);
    const count = Math.max(0, shown - from);
    bm.envGeo.setDrawRange(from * RING * 6, Math.max(0, count - 1) * RING * 6);
    bm.axisGeo.setDrawRange(from, count);
    for (const line of bm.rays) line.geometry.setDrawRange(from, count);
    const at = Math.max(f, bm.start);
    const axis = bm.axisGeo.getAttribute('position') as BufferAttribute;
    const i = Math.min(Math.floor(at), bm.marginal.length - 1);
    bm.glow.position.set(axis.getX(i), axis.getY(i), axis.getZ(i));
    bm.glow.visible = f > bm.start && f < bm.end - 0.5;
    if (bm.sampleGlow) {
      bm.sampleGlow.visible = lit;
      if (lit) {
        bm.sampleGlow.position.set(axis.getX(0), axis.getY(0), axis.getZ(0));
        bm.sampleGlow.scale.setScalar(1 + 0.18 * Math.sin(now / 160));
      }
    }
  }

  /** Each part's place on the paths: at a fold if it makes one, else on the first path through it. */
  const placed = parts.map((part) => {
    const at = opticPoint(part);
    let hit: { s: number; path: PathModel } | null = null;
    for (const bm of beamModels) {
      const s = bm.path.distanceOf(at);
      if (s === null) continue;
      const d = bm.path.dirsAt(s);
      if (d.before.dot(d.after) < 0.99) return { part, at, s, path: bm.path as PathModel | null };
      hit ??= { s, path: bm.path };
    }
    return { part, at, s: hit?.s ?? null, path: hit?.path ?? null };
  });

  /* ---- sketch glyphs (optikit-v2 style) and cube outlines ---- */
  const glyphMats: Material[] = [];
  const glyphObjects: Object3D[] = [];
  const outlineMat = new LineBasicMaterial({ color: colors.outline, transparent: true, opacity: 0.55 });
  const outlineGeo = (lv: number) => new EdgesGeometry(new BoxGeometry(CELL, CELL, CELL * lv + 5));
  const glyphMat = (color: string, opacity: number) => {
    const m = new MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05, transparent: true, opacity, depthWrite: opacity >= 1 });
    glyphMats.push(m);
    return m;
  };
  const X = new Vector3(1, 0, 0);
  const Y = new Vector3(0, 1, 0);

  for (const p of placed) {
    const { kind } = p.part.optic;
    // The module's cube outline (a z-stage stands two levels tall).
    const lv = p.part.levels ?? 1;
    const box = new LineSegments(outlineGeo(lv), outlineMat);
    box.position.copy(cellPoint(p.part.cell)).add(new Vector3(0, 0, ((lv - 1) * CELL) / 2));
    root.add(box);
    glyphObjects.push(box);

    const g = new Group();
    g.position.copy(p.at);
    const color = kind === 'source' ? colors.beam : glyphColor(kind);
    const dirs = p.s === null || !p.path ? { before: X, after: X } : p.path.dirsAt(p.s);
    const dir = kind === 'detector' ? dirs.before : dirs.after;
    // Beam frame: x along the beam, y lateral, z the third axis.
    const lat = p.s === null || !p.path ? Y : p.path.at(kind === 'detector' ? p.s - 0.5 : p.s + 0.5).lat;
    const frame = new Group();
    frame.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(dir, lat, new Vector3().crossVectors(dir, lat)));
    g.add(frame);
    const along = (mesh: Mesh) => {
      mesh.quaternion.setFromUnitVectors(Y, X);
      return mesh;
    };
    const normal = new Vector3().subVectors(dirs.after, dirs.before).normalize();
    switch (kind) {
      case 'source': {
        const body = along(new Mesh(new CylinderGeometry(7, 7, 18, 24), glyphMat(color, 1)));
        body.position.x = -8;
        const cone = along(new Mesh(new ConeGeometry(5, 8, 24), glyphMat(color, 0.8)));
        cone.position.x = 4;
        frame.add(body, cone);
        break;
      }
      case 'lens':
      case 'objective': {
        const lens = new Mesh(new SphereGeometry(14, 32, 16), glyphMat(color, 0.55));
        lens.scale.set(kind === 'objective' ? 0.32 : 0.18, 1, 1);
        frame.add(lens);
        break;
      }
      case 'mirror':
      case 'galvo': {
        const disc = new Mesh(new CylinderGeometry(kind === 'galvo' ? 11 : 14, kind === 'galvo' ? 11 : 14, 2.5, 32), glyphMat(color, 1));
        disc.quaternion.setFromUnitVectors(Y, normal);
        const coat = new Mesh(new CylinderGeometry(kind === 'galvo' ? 11 : 14, kind === 'galvo' ? 11 : 14, 0.4, 32), glyphMat(colors.coating, 1));
        coat.quaternion.copy(disc.quaternion);
        coat.position.copy(normal).multiplyScalar(1.5);
        g.add(disc, coat);
        if (kind === 'galvo') {
          // optikit-v2 draws programmable surfaces in violet; the motor shaft marks it as moving.
          const shaft = new Mesh(new CylinderGeometry(3, 3, 22, 16), glyphMat(color, 0.7));
          shaft.quaternion.setFromUnitVectors(Y, normal);
          shaft.position.copy(normal).multiplyScalar(-12);
          g.add(shaft);
        }
        break;
      }
      case 'dichroic':
      case 'splitter': {
        // optikit-v2: a faint cube with the coloured plate on its diagonal.
        const plateMesh = new Mesh(new BoxGeometry(34, 2.5, 26), glyphMat(color, 0.9));
        plateMesh.quaternion.setFromUnitVectors(Y, normal.lengthSq() > 0.5 ? normal : new Vector3(1, 1, 0).normalize());
        g.add(plateMesh, new Mesh(new BoxGeometry(24, 24, 24), glyphMat(color, 0.16)));
        break;
      }
      case 'sample':
        frame.add(new Mesh(new BoxGeometry(6, 26, 16), glyphMat(color, 0.6)));
        break;
      case 'detector': {
        frame.add(new Mesh(new BoxGeometry(12, 22, 22), glyphMat(color, 1)));
        const sensor = new Mesh(new BoxGeometry(1, 16, 16), glyphMat(colors.sensor, 1));
        sensor.position.x = -6.5;
        frame.add(sensor);
        break;
      }
      case 'spacer':
        frame.add(new Mesh(new BoxGeometry(26, 26, 26), glyphMat(color, 0.3)));
        break;
    }
    root.add(g);
    glyphObjects.push(g);
  }

  /* ---- modules ---- */
  interface PartState {
    part: BenchPart;
    group: Group;
    subs: Record<SubName, Sub> | null;
    /** Where its hotspot sits (the optic's cell), root frame. */
    anchor: Vector3;
    /** Meshes that ride the z-stage, with their resting positions, and the stage's up (module frame). */
    carriage: { mesh: Object3D; base: Vector3 }[];
    up: Vector3;
  }
  const states: PartState[] = parts.map((part) => {
    const group = new Group();
    group.position.copy(cellPoint(part.cell));
    if (part.axes) group.quaternion.setFromRotationMatrix(orientation(part.axes));
    group.userData.partId = part.id;
    root.add(group);
    return { part, group, subs: null, anchor: opticPoint(part), carriage: [], up: new Vector3(0, 0, 1) };
  });

  function placeSub(sub: Sub) {
    const e = 1 - Math.pow(1 - sub.v, 3); // ease-out
    sub.group.position.copy(sub.from).multiplyScalar(1 - e);
    for (const m of sub.mats) m.opacity = (m.userData.base as number) * e;
    sub.group.visible = sub.v > 0.005;
  }

  /* ---- the controller and its cables (control step only) ---- */
  const controllerGroup = new Group();
  const controllerMats: Material[] = [];
  const cableMat = new MeshStandardMaterial({ color: colors.cable ?? '#3a4048', roughness: 0.55, metalness: 0.05 });
  const ledMat = new MeshBasicMaterial({ color: colors.led ?? '#85b918', transparent: true, opacity: 0 });
  const cables: { mesh: Mesh; segments: number }[] = [];
  if (controller) {
    const [cx, cy] = controller.at;
    controllerGroup.position.set(cx, cy, FLOOR);
    controllerGroup.visible = false;
    root.add(controllerGroup);
    const led = new Mesh(new SphereGeometry(2.4, 16, 12), ledMat);
    led.position.set(40, 40, 24);
    controllerGroup.add(led);
    controllerMats.push(ledMat);

    const byId = new Map(states.map((s) => [s.part.id, s]));
    // Cables lie on the table: off the controller, round the back of the
    // plate when they have to, then up into the module's face.
    const table = FLOOR + 1.6;
    const plateMax = new Vector3(plate[0] * CELL - CELL / 2, plate[1] * CELL - CELL / 2, 0);
    const backLane = plateMax.y + 40;
    controller.wires.forEach(({ to, face: faceAxis }, i) => {
      const s = byId.get(to);
      if (!s) return;
      const face = new Vector3(...AXIS[faceAxis]);
      const end = cellPoint(s.part.cell).addScaledVector(face, CELL / 2 + 1);
      const out = end.clone().addScaledVector(face, 26);
      const startP = new Vector3(cx + 60, cy - 36 + i * 18, FLOOR + 14);
      const clear = new Vector3(cx + 92, startP.y, table);
      const offPlate = out.x < -CELL / 2 && out.y < plateMax.y;
      const pts = [
        startP,
        clear,
        ...(offPlate ? [] : [new Vector3(clear.x + 10, backLane - i * 6, table), new Vector3(out.x, backLane - i * 6, table)]),
        new Vector3(out.x, out.y, table),
        new Vector3(out.x, out.y, end.z - 14),
        new Vector3(out.x - face.x * 10, out.y - face.y * 10, end.z),
        end,
      ];
      const curve = new CatmullRomCurve3(pts, false, 'centripetal');
      const segments = 96;
      const mesh = new Mesh(new TubeGeometry(curve, segments, 1.6, 8, false), cableMat);
      mesh.castShadow = true;
      mesh.visible = false;
      root.add(mesh);
      cables.push({ mesh, segments });
    });

    loadModel(controller.url)
      .then((model) => {
        if (disposed) return;
        model.updateMatrixWorld(true);
        const box = new Box3().setFromObject(model);
        const c = box.getCenter(new Vector3());
        model.position.set(-c.x, -c.y, -box.min.z);
        model.traverse((o) => {
          const mesh = o as Mesh;
          if (!mesh.isMesh) return;
          const src = mesh.material as MeshStandardMaterial;
          const { mat } = matte(src, /screw|ISO/i.test(mesh.name));
          // The export leaves the circuit board in CAD magenta: make it a board.
          const c = src.color;
          if (c && c.r > 0.5 && c.b > 0.8 && c.g < 0.2) mat.color.set('#1f5b45');
          mesh.material = mat;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          controllerMats.push(mat);
        });
        controllerGroup.add(model);
        const size = box.getSize(new Vector3());
        led.position.set(size.x / 2 - 14, size.y / 2 - 14, size.z + 1);
        faders.controller = new Fader(controllerMats, [controllerGroup], faders.controller.v);
        faders.controller.target = step === 'control' ? 1 : 0;
        requestRender();
      })
      .catch(() => undefined);
  }

  /* ---- faders for the non-module layers ---- */
  const faders = {
    grid: new Fader([minorMat, majorMat], [gridGroup], 1),
    plate: new Fader([slabMat, tileMat], [plateGroup], 0),
    glyphs: new Fader([...glyphMats, outlineMat], glyphObjects, 1),
    envelope: new Fader(
      beamModels.flatMap((bm) => [bm.envMat, bm.glowMat]),
      beamModels.map((bm) => bm.envelope),
      0,
    ),
    axis: new Fader(
      beamModels.map((bm) => bm.axisMat),
      beamModels.map((bm) => bm.axisLine),
      1,
    ),
    imaging: new Fader(
      beamModels.map((bm) => bm.rayMat),
      beamModels.flatMap((bm) => bm.rays),
      0,
    ),
    controller: new Fader(controllerMats, [controllerGroup], 0),
  };

  /* ---- camera and controls ---- */
  const camera = new PerspectiveCamera(30, 1, 5, 9000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false; // never steal the page's scroll wheel
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.autoRotateSpeed = 0.5;
  controls.enabled = interactive;

  const world = (x: number, y: number, z: number) => new Vector3(x, z, -y);
  const c = centre;
  // Cameras look at the front of the instrument (from -y) and a little from
  // the left, so the tower stands on the right of the wide stage, over the
  // step list, and the branches reach back across the plate.
  // `narrowX`: where a narrow canvas centres (the control step keeps the controller in view).
  const POSES: Record<BenchStep, { position: Vector3; target: Vector3; fov: number; narrowX?: number }> = {
    sketch: { position: world(c.x - 330, c.y - 620, c.z + 470), target: world(c.x - 40, c.y + 10, c.z - 35), fov: 30 },
    simulate: { position: world(c.x - 380, c.y - 600, c.z + 260), target: world(c.x - 45, c.y, c.z - 20), fov: 30 },
    cubify: { position: world(c.x + 380, c.y - 600, c.z + 330), target: world(c.x - 40, c.y + 10, c.z - 25), fov: 30 },
    control: { position: world(c.x - 520, c.y - 640, c.z + 420), target: world(c.x - 120, c.y, c.z - 30), fov: 32, narrowX: c.x - 95 },
  };

  for (const [key, spec] of Object.entries(options.poses ?? {}) as [BenchStep, BenchPose][]) {
    POSES[key] = {
      position: world(c.x + spec.from[0], c.y + spec.from[1], c.z + spec.from[2]),
      target: world(c.x + spec.at[0], c.y + spec.at[1], c.z + spec.at[2]),
      fov: spec.fov,
    };
  }

  type Pose = (typeof POSES)[BenchStep];
  /**
   * The pose for the canvas's shape. The wide poses push the bench right of
   * the title; a narrower canvas centres it, lower, and steps back until it fits.
   */
  function fitted(p: Pose): Pose {
    const aspect = camera.aspect;
    const wide = Math.min(1, Math.max(0, (aspect - 0.6) / 0.9));
    const target = p.target.clone();
    const narrowX = p.narrowX ?? c.x;
    target.x = narrowX + (p.target.x - narrowX) * wide;
    // On a phone the title sits over the top of the stage: keep the bench low.
    target.y += (1 - wide) * 70;
    const back = Math.max(1, 0.95 / aspect);
    const position = target.clone().add(new Vector3().subVectors(p.position, p.target).multiplyScalar(back));
    return { position, target, fov: p.fov };
  }

  let step: BenchStep = options.initialStep ?? 'sketch';
  let pose = POSES[step];
  let flying = true;
  let stepStart = performance.now();
  camera.position.copy(pose.position);
  controls.target.copy(pose.target);
  camera.fov = pose.fov;
  camera.updateProjectionMatrix();

  /** Where the control step is at time t (ms since it started). */
  function controlAt(t: number): BenchControlState & { tiltA: number; tiltB: number } {
    const plugged = Math.min(1, t / PLUG_MS);
    if (t < PLUG_MS) return { phase: 'plug', plugged, defocus: DEFOCUS, scan: 0, lines: SCAN_LINES, tiltA: 0, tiltB: 0 };
    const tc = motion ? (t - PLUG_MS) % (FOCUS_MS + SCAN_MS + DONE_MS) : FOCUS_MS + SCAN_MS + 1;
    if (tc < FOCUS_MS) {
      // Hunting for focus: a damped swing through it.
      const x = tc / 1000;
      const defocus = DEFOCUS * Math.exp(-2.1 * x) * Math.cos(2 * Math.PI * 0.95 * x);
      return { phase: 'focus', plugged, defocus, scan: 0, lines: SCAN_LINES, tiltA: 0, tiltB: 0 };
    }
    if (tc < FOCUS_MS + SCAN_MS) {
      // A raster: the fast axis sweeps, the slow axis steps a line at a time.
      const p = (tc - FOCUS_MS) / SCAN_MS;
      const line = Math.min(SCAN_LINES - 1, Math.floor(p * SCAN_LINES));
      const along = p * SCAN_LINES - line;
      return {
        phase: 'scan',
        plugged,
        defocus: 0,
        scan: p,
        lines: SCAN_LINES,
        tiltA: SCAN_ANGLE * (2 * along - 1),
        tiltB: SCAN_ANGLE * ((2 * (line + 0.5)) / SCAN_LINES - 1),
      };
    }
    return { phase: 'done', plugged, defocus: 0, scan: 1, lines: SCAN_LINES, tiltA: 0, tiltB: 0 };
  }

  /** Targets for everything, from the step (and, in cubify, the frame). */
  function applyTargets(now = performance.now()) {
    // rAF timestamps can trail performance.now() slightly; never go below 0.
    const t = Math.max(0, now - stepStart);
    const lit = step !== 'control' || t > PLUG_MS;
    const layers: Record<keyof typeof faders, number> = {
      grid: step === 'sketch' || step === 'simulate' ? 1 : 0,
      plate: step === 'cubify' || step === 'control' ? 1 : 0,
      glyphs: step === 'sketch' || step === 'simulate' ? 1 : 0,
      envelope: step === 'simulate' ? 1 : step === 'cubify' ? 0.55 : step === 'control' && lit ? 0.85 : 0,
      axis: lit ? 1 : 0,
      imaging: step === 'simulate' ? 1 : step === 'cubify' ? 0.5 : step === 'control' && lit ? 0.9 : 0,
      controller: step === 'control' ? 1 : 0,
    };
    (Object.keys(faders) as (keyof typeof faders)[]).forEach((k) => (faders[k].target = layers[k]));

    const frame = step === 'cubify' ? (motion ? Math.min(FRAMES.length - 1, Math.floor(t / FRAME_MS)) : FRAMES.length - 1) : -1;
    for (const s of states) {
      if (!s.subs) continue;
      for (const name of SUBS) {
        const shown = step === 'control' || (step === 'cubify' && FRAMES[frame].includes(name));
        s.subs[name].target = shown ? 1 : 0;
      }
    }
    controls.autoRotate = motion && turntable && step === 'cubify' && frame === FRAMES.length - 1 && !userTookOver;
  }

  let disposed = false;
  let userTookOver = false;
  for (const s of states) {
    loadModel(s.part.url)
      .then((model) => {
        if (disposed) return;
        centreOnCube(model);
        const localUp = new Vector3(0, 0, 1).applyQuaternion(s.group.quaternion.clone().invert());
        s.up = localUp;
        s.subs = splitModel(model, localUp);
        // An objective on a z-stage arm: add the stand-in barrel where the optic is.
        if (s.part.opticCell && s.part.optic.kind === 'objective') {
          const rel = new Vector3().subVectors(s.anchor, cellPoint(s.part.cell)).applyQuaternion(s.group.quaternion.clone().invert()).sub(model.position);
          const obj = makeObjective(localUp);
          obj.group.position.copy(rel);
          s.subs.optics.group.add(obj.group);
          s.subs.optics.mats.push(...obj.mats);
          s.carriage.push({ mesh: obj.group, base: obj.group.position.clone() });
        }
        if (s.part.carriage) {
          const re = new RegExp(s.part.carriage, 'i');
          for (const name of SUBS) {
            for (const child of [...s.subs[name].group.children]) {
              if (re.test(String(child.userData.fullName ?? child.name))) s.carriage.push({ mesh: child, base: child.position.clone() });
            }
          }
        }
        s.group.add(model);
        applyTargets();
        for (const name of SUBS) {
          const sub = s.subs[name];
          sub.v = sub.target; // appear in the current state, no fly-in
          placeSub(sub);
        }
        options.onPartLoaded?.(s.part.id, true);
        requestRender();
      })
      .catch(() => options.onPartLoaded?.(s.part.id, false));
  }

  /* ---- render loop (on demand) ---- */
  let active = true;
  let frameId = 0;
  let last = performance.now();
  const size = new Vector2();
  const tmp = new Vector3();

  function requestRender() {
    if (!frameId && active && !disposed) {
      last = performance.now();
      frameId = requestAnimationFrame(tick);
    }
  }

  // The canvas size, kept by the ResizeObserver below: reading it every frame
  // would make the browser lay the page out again mid-frame.
  let canvasW = canvas.clientWidth;
  let canvasH = canvas.clientHeight;

  function resize() {
    const w = canvasW;
    const h = canvasH;
    if (!w || !h) return;
    renderer.getSize(size);
    if (size.x !== w || size.y !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!userTookOver) flying = true; // re-fit to the new shape
    }
  }

  let lastPins: BenchPin[] = [];
  function emitPins() {
    if (!options.onPins) return;
    const w = canvasW;
    const h = canvasH;
    const pins = states.map((s) => {
      root.localToWorld(tmp.copy(s.anchor));
      tmp.project(camera);
      const x = Math.round(((tmp.x + 1) / 2) * w * 2) / 2;
      const y = Math.round(((1 - tmp.y) / 2) * h * 2) / 2;
      return { id: s.part.id, x, y, visible: tmp.z < 1 && x >= 0 && x <= w && y >= 0 && y <= h };
    });
    // Only when something moved (by half a pixel or more), so a still picture costs nothing.
    const same = pins.length === lastPins.length && pins.every((p, i) => p.x === lastPins[i].x && p.y === lastPins[i].y && p.visible === lastPins[i].visible);
    if (same) return;
    lastPins = pins;
    options.onPins(pins);
  }

  /** The control step: cables, focus, the galvo's raster and the light following it. */
  function tickControl(t: number, now: number) {
    const state = controlAt(t);
    cables.forEach((cable, i) => {
      const frac = Math.min(1, Math.max(0, (t - i * ((PLUG_MS - CABLE_MS) / Math.max(1, cables.length - 1))) / CABLE_MS));
      cable.mesh.visible = frac > 0;
      cable.mesh.geometry.setDrawRange(0, Math.floor(frac * cable.segments) * 8 * 6);
    });
    ledMat.opacity = state.plugged >= 1 ? 0.75 + 0.25 * Math.sin(now / 220) : 0;

    // The z-stage carries the objective.
    for (const s of states) for (const m of s.carriage) m.mesh.position.copy(m.base).addScaledVector(s.up, state.defocus);

    // Excitation: the galvo tilts the beam; the relay turns that into a spot moving over the sample.
    let spot: Vector3 | null = null;
    for (const bm of beamModels) {
      if (bm.def.light !== 'excitation') continue;
      const n = bm.marginal.length;
      const chief: Chief =
        bm.galvoAt === null
          ? { a: zeros(n), b: zeros(n) }
          : {
              a: trace(0, 0, 0, bm.end, [...bm.lenses, { s: bm.galvoAt, du: state.tiltA }]),
              b: trace(0, 0, 0, bm.end, [...bm.lenses, { s: bm.galvoAt, du: state.tiltB }]),
            };
      writeBeam(bm, chief, []);
      spot ??= bm.lat[n - 1].clone().multiplyScalar(chief.a[n - 1]).addScaledVector(bm.lat2[n - 1], chief.b[n - 1]);
    }
    // Emission: from wherever the spot is, onto both cameras.
    for (const bm of beamModels) {
      if (bm.def.light !== 'emission') continue;
      const a = spot ? spot.dot(bm.lat[0]) : 0;
      const b = spot ? spot.dot(bm.lat2[0]) : 0;
      const chief = pointChief(bm, a, b);
      writeBeam(bm, chief, [chief]);
    }
    atRest = false;
    for (const bm of beamModels) {
      setFront(bm, bm.end, bm.def.light === 'emission' && state.plugged >= 1, now);
      // The spot glows through the sample holder, so the scan reads in 3D.
      if (bm.sampleGlow) (bm.sampleGlow.material as MeshBasicMaterial).depthTest = false;
    }
    options.onControl?.({ phase: state.phase, plugged: state.plugged, defocus: state.defocus, scan: state.scan, lines: state.lines });
  }

  function tick(now: number) {
    frameId = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    resize();
    let moving = false;
    applyTargets(now);

    if (flying) {
      const goal = fitted(pose);
      const k = motion ? 1 - Math.exp(-dt * 3.2) : 1;
      camera.position.lerp(goal.position, k);
      controls.target.lerp(goal.target, k);
      camera.fov += (goal.fov - camera.fov) * k;
      camera.updateProjectionMatrix();
      if (camera.position.distanceTo(goal.position) < 0.5 && controls.target.distanceTo(goal.target) < 0.5) flying = false;
      else moving = true;
    }

    const k = motion ? 1 - Math.exp(-dt * 5) : 1;
    for (const f of Object.values(faders)) if (f.step(k)) moving = true;

    const ks = motion ? 1 - Math.exp(-dt * 4.2) : 1;
    for (const s of states) {
      if (!s.subs) continue;
      for (const name of SUBS) {
        const sub = s.subs[name];
        if (Math.abs(sub.v - sub.target) > 0.002) {
          sub.v += (sub.target - sub.v) * ks;
          moving = true;
        } else sub.v = sub.target;
        placeSub(sub);
      }
    }

    const t = Math.max(0, now - stepStart);
    if (step === 'control') {
      tickControl(t, now);
      moving = true;
    } else {
      if (!atRest) {
        writeRest();
        for (const bm of beamModels) if (bm.sampleGlow) (bm.sampleGlow.material as MeshBasicMaterial).depthTest = true;
        for (const s of states) for (const m of s.carriage) m.mesh.position.copy(m.base);
        for (const cable of cables) cable.mesh.visible = false;
        ledMat.opacity = 0;
        atRest = true;
      }
      // The light: in the simulate step the excitation runs first, then the
      // emission sets off (on every branch at once) once the sample lights up.
      if (step === 'simulate' && motion) {
        const run = (light: BenchBeam['light']) => Math.max(0, ...beamModels.filter((b) => b.def.light === light).map((b) => (b.end / LIGHT_SPEED) * 1000));
        const exRun = run('excitation');
        const emRun = run('emission');
        const tt = t % (exRun + SAMPLE_PAUSE + emRun + LIGHT_HOLD);
        for (const bm of beamModels) {
          const local = bm.def.light === 'excitation' ? tt : tt - exRun - SAMPLE_PAUSE;
          const lit = bm.def.light === 'emission' && local > -SAMPLE_PAUSE;
          setFront(bm, local <= 0 ? 0 : (local / 1000) * LIGHT_SPEED, lit, now);
        }
        moving = true;
      } else {
        for (const bm of beamModels) setFront(bm, bm.end, false);
      }
    }

    // Cubify keeps ticking until its last frame has settled.
    if (step === 'cubify' && t < FRAME_MS * FRAMES.length) moving = true;

    if (controls.update(dt)) moving = true;
    if (controls.autoRotate) moving = true;

    renderer.render(scene, camera);
    emitPins();
    if (moving) requestRender();
  }

  const onControlsStart = () => {
    flying = false;
    userTookOver = true;
    controls.autoRotate = false;
    requestRender();
  };
  controls.addEventListener('start', onControlsStart);
  controls.addEventListener('change', requestRender);

  /* ---- picking: the part whose hotspot is nearest the ray ---- */
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;
    down = null;
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    let best: { id: string; d: number } | null = null;
    for (const s of states) {
      root.localToWorld(tmp.copy(s.anchor));
      const d = raycaster.ray.distanceToPoint(tmp);
      if (d < 32 && (!best || d < best.d)) best = { id: s.part.id, d };
    }
    const id = best?.id ?? null;
    select(id);
    options.onSelect?.(id);
  };
  if (interactive) {
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
  }

  const selectionMat = new LineBasicMaterial({ color: colors.selection });
  const selectionBox = new LineSegments(new EdgesGeometry(new BoxGeometry(CELL + 2, CELL + 2, 57)), selectionMat);
  selectionBox.visible = false;
  root.add(selectionBox);
  function select(id: string | null) {
    const s = states.find((x) => x.part.id === id);
    selectionBox.visible = Boolean(s);
    if (s) selectionBox.position.copy(s.anchor);
    requestRender();
  }

  const resizeObserver = new ResizeObserver(([entry]) => {
    canvasW = entry.contentRect.width;
    canvasH = entry.contentRect.height;
    requestRender();
  });
  resizeObserver.observe(canvas);

  applyTargets();
  requestRender();

  return {
    setStep(next) {
      if (next === step) return;
      step = next;
      pose = POSES[next];
      flying = true;
      userTookOver = false;
      stepStart = performance.now();
      // Cubify starts from nothing: every module part out of place.
      if (next === 'cubify' && motion) {
        for (const s of states) if (s.subs) for (const name of SUBS) s.subs[name].v = 0;
      }
      requestRender();
    },
    setColors(next) {
      colors = next;
      for (const bm of beamModels) {
        const color = beamColor(bm.def, next);
        for (const m of [bm.envMat, bm.axisMat, bm.rayMat, bm.glowMat]) m.color.set(color);
        (bm.sampleGlow?.material as MeshBasicMaterial | undefined)?.color.set(color);
      }
      slabMat.color.set(next.plate);
      tileMat.color.set(next.tile);
      outlineMat.color.set(next.outline);
      selectionMat.color.set(next.selection);
      minorMat.color.set(next.grid);
      majorMat.color.set(next.gridMajor);
      cableMat.color.set(next.cable ?? '#3a4048');
      ledMat.color.set(next.led ?? '#85b918');
      requestRender();
    },
    select,
    restart() {
      stepStart = performance.now();
      flying = true;
      userTookOver = false;
      if (step === 'cubify' && motion) {
        for (const s of states) if (s.subs) for (const name of SUBS) s.subs[name].v = 0;
      }
      requestRender();
    },
    setActive(next) {
      active = next;
      if (next) requestRender();
      else if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    },
    dispose() {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      controls.removeEventListener('start', onControlsStart);
      controls.dispose();
      disposeObject(scene);
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
