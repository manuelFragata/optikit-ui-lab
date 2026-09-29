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
 *  - build:    exploded, with the cube halves pulled apart.
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

export type BenchStep = 'sketch' | 'simulate' | 'cubify' | 'build';
export type Axis = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';
export type OpticKind = 'source' | 'lens' | 'objective' | 'mirror' | 'dichroic' | 'sample' | 'detector' | 'spacer';
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
  /**
   * Orientation as in optikit-v2 designs: where the module's local z and x
   * axes point in the world (z up). Identity when omitted.
   */
  axes?: { z: Axis; x: Axis };
  optic: BenchOptic;
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
  /** optikit-v2 glyph colours per kind. */
  glyphs: Record<OpticKind, string>;
  sensor: string;
  coating: string;
}

export interface BenchPin {
  id: string;
  x: number;
  y: number;
  /** In front of the camera and inside the canvas. */
  visible: boolean;
}

export interface BenchSceneOptions {
  parts: BenchPart[];
  /** Light paths, in the order the light travels them. */
  beams: BenchBeam[];
  /** Plate size in cells. */
  plate: [number, number];
  colors: BenchColors;
  onPins?: (pins: BenchPin[]) => void;
  onSelect?: (id: string | null) => void;
  /** A part's mesh finished loading (or failed). */
  onPartLoaded?: (id: string, ok: boolean) => void;
  initialStep?: BenchStep;
  /** Camera flights, the light run and the cubify frames; off for reduced motion. */
  motion?: boolean;
}

export interface BenchScene {
  setStep: (step: BenchStep) => void;
  setColors: (colors: BenchColors) => void;
  select: (id: string | null) => void;
  /** Pause rendering while off screen. */
  setActive: (active: boolean) => void;
  dispose: () => void;
}

const CELL = 50;

const cellPoint = (cell: BenchCell) => new Vector3(cell[0] * CELL, cell[1] * CELL, (cell[2] ?? 0) * CELL);
const PLATE_TOP = -26.9; // cube bottoms sit on the tiles

/** Beam radius leaving the laser, mm. */
const BEAM_RADIUS = 2.5;
/** Speed of the light front in the simulate step, mm per second. */
const LIGHT_SPEED = 85;
/** Pause at the end of a light run before it starts again, ms. */
const LIGHT_HOLD = 2600;
/** One cubify frame, ms. */
const FRAME_MS = 1400;
/** Lateral offset of the second imaged point on the sample, mm. */
const OBJECT_HEIGHT = 1.2;
/** Height at the first lens of the emission's marginal ray, mm. */
const EMISSION_APERTURE = 8;
/** The sample lights up this long before its emission sets off, ms. */
const SAMPLE_PAUSE = 500;

const AXIS: Record<Axis, [number, number, number]> = {
  '+x': [1, 0, 0],
  '-x': [-1, 0, 0],
  '+y': [0, 1, 0],
  '-y': [0, -1, 0],
  '+z': [0, 0, 1],
  '-z': [0, 0, -1],
};

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

interface OpticEvent {
  s: number;
  f: number;
}

/**
 * Paraxial trace of one ray: height y (mm) at every millimetre from `from`
 * to `to`. Thin lenses bend the ray by −y/f; the fold mirror only turns the
 * path, which the path model already does.
 */
function trace(y0: number, u0: number, from: number, to: number, lenses: OpticEvent[]) {
  const n = Math.floor(to - from) + 1;
  const out = new Float32Array(n);
  const ev = lenses.filter((l) => l.s >= from - 1e-6).sort((a, b) => a.s - b.s);
  let y = y0;
  let u = u0;
  let e = 0;
  for (let i = 0; i < n; i++) {
    const s = from + i;
    out[i] = y;
    while (e < ev.length && ev[e].s < s + 1 - 1e-6) {
      // Advance to the lens, bend, then carry on to the next millimetre.
      const d = ev[e].s - s;
      const yl = y + u * d;
      u -= yl / ev[e].f;
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
  /** How far it moves apart in the build step (module frame). */
  apart: Vector3;
}

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
  const make = (from: Vector3, apart = new Vector3()): Sub => {
    const group = new Group();
    model.add(group);
    return { group, mats: [], v: 0, target: 0, from, apart };
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
    const sign = i === 0 ? 1 : -1;
    sub.from = axis.clone().multiplyScalar(85 * sign);
    sub.apart = axis.clone().multiplyScalar(16 * sign);
  });

  for (const s of SUBS) {
    subs[s].group.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as MeshStandardMaterial;
      const glass = src.transparent || src.opacity < 1;
      const metal = s === 'screws';
      const mat = new MeshStandardMaterial({
        color: src.color?.clone() ?? new Color('#cccccc'),
        roughness: glass ? 0.05 : metal ? 0.35 : 0.62,
        metalness: metal ? 0.7 : 0.02,
        transparent: true,
        opacity: 0,
        depthWrite: !glass,
      });
      mat.userData.base = glass ? 0.45 : 1;
      mesh.material = mat;
      mesh.castShadow = !glass;
      mesh.receiveShadow = true;
      subs[s].mats.push(mat);
    });
  }
  return subs;
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
  const { parts, beams, plate } = options;
  const motion = options.motion ?? true;
  let colors = options.colors;

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
  sun.position.set(-160, 460, 260);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0004;
  const levels = Math.max(...parts.map((p) => p.cell[2] ?? 0)) + 1;
  const span = Math.max(plate[0], plate[1], levels) * CELL;
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 10, far: 1600 });
  scene.add(sun);

  const root = new Group();
  root.rotation.x = -Math.PI / 2; // z-up content
  scene.add(root);

  const centre = new Vector3(((plate[0] - 1) * CELL) / 2, ((plate[1] - 1) * CELL) / 2, ((levels - 1) * CELL) / 2);
  sun.target.position.set(centre.x, centre.z, -centre.y);
  scene.add(sun.target);

  /* ---- sketch grid (cell boundaries, a major line every 5 cells) ---- */
  // A flat bench is drawn from above, on the plate; a stacked one from the
  // front, so its grid stands behind it like the sheet of a side view.
  const gridGroup = new Group();
  const minorMat = new LineBasicMaterial({ color: colors.grid, transparent: true, opacity: 1 });
  const majorMat = new LineBasicMaterial({ color: colors.gridMajor, transparent: true, opacity: 1 });
  {
    const upright = levels > 1;
    const margin = upright ? 6 : 2;
    const u0 = -margin;
    const u1 = plate[0] + margin;
    const v0 = upright ? 0 : -margin;
    const v1 = (upright ? levels : plate[1]) + margin;
    const minor: number[] = [];
    const major: number[] = [];
    const wall = plate[1] * CELL - CELL / 2 + 1;
    const pt = (u: number, v: number) => (upright ? [u, wall, v + CELL / 2 + PLATE_TOP] : [u, v, PLATE_TOP]);
    for (let i = u0; i <= u1; i++) {
      const u = i * CELL - CELL / 2;
      (i % 5 === 0 ? major : minor).push(...pt(u, v0 * CELL - CELL / 2), ...pt(u, v1 * CELL - CELL / 2));
    }
    for (let j = v0; j <= v1; j++) {
      const v = j * CELL - CELL / 2;
      (j % 5 === 0 ? major : minor).push(...pt(u0 * CELL - CELL / 2, v), ...pt(u1 * CELL - CELL / 2, v));
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
  slab.position.set(centre.x, centre.y, PLATE_TOP - 5 - 3);
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
  const isLens = (k: OpticKind) => k === 'lens' || k === 'objective';
  const RING = 20;

  interface BeamModel {
    def: BenchBeam;
    path: PathModel;
    end: number;
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

  const beamModels: BeamModel[] = beams.map((def) => {
    const path = makePath(def.cells);
    const on = parts.flatMap((part) => {
      const at = path.distanceOf(cellPoint(part.cell));
      return at === null ? [] : [{ part, s: at }];
    });
    const lenses: OpticEvent[] = on.flatMap((x) => (isLens(x.part.optic.kind) && x.part.optic.f ? [{ s: x.s, f: x.part.optic.f }] : []));
    const first = (kind: OpticKind) => on.filter((x) => x.part.optic.kind === kind).sort((m, n) => m.s - n.s)[0]?.s ?? null;

    let end: number;
    let envelopeYs: Float32Array;
    let rayYs: Float32Array[] = [];
    if (def.light === 'excitation') {
      // A parallel beam from the source, as far as the sample.
      end = first('sample') ?? first('detector') ?? path.length;
      envelopeYs = trace(BEAM_RADIUS, 0, 0, end, lenses);
    } else {
      // Light from points on the sample: the on-axis marginal ray gives the
      // envelope; two small fans (on axis and off axis) show the image.
      end = first('detector') ?? path.length;
      const lens = lenses.filter((l) => l.s > 0).sort((m, n) => m.s - n.s)[0];
      const d = lens ? lens.s : CELL;
      envelopeYs = trace(0, EMISSION_APERTURE / d, 0, end, lenses);
      rayYs = [0, OBJECT_HEIGHT].flatMap((h) =>
        [-EMISSION_APERTURE, 0, EMISSION_APERTURE].map((yl) => trace(h, (yl - h) / d, 0, end, lenses)),
      );
    }

    const color = beamColor(def, colors);
    const rings = envelopeYs.length;
    const envPositions = new Float32Array(rings * RING * 3);
    const axisPositions = new Float32Array(rings * 3);
    for (let i = 0; i < rings; i++) {
      const { pos, dir, lat } = path.at(i);
      const lat2 = new Vector3().crossVectors(dir, lat);
      const r = Math.max(0.35, Math.abs(envelopeYs[i]));
      for (let k = 0; k < RING; k++) {
        const ang = (k / RING) * Math.PI * 2;
        const q = pos.clone().addScaledVector(lat, Math.cos(ang) * r).addScaledVector(lat2, Math.sin(ang) * r);
        envPositions.set([q.x, q.y, q.z], (i * RING + k) * 3);
      }
      axisPositions.set([pos.x, pos.y, pos.z], i * 3);
    }
    const index: number[] = [];
    for (let i = 0; i < rings - 1; i++) {
      for (let k = 0; k < RING; k++) {
        const v0 = i * RING + k;
        const v1 = i * RING + ((k + 1) % RING);
        const v2 = (i + 1) * RING + k;
        const v3 = (i + 1) * RING + ((k + 1) % RING);
        index.push(v0, v2, v1, v1, v2, v3);
      }
    }
    const envGeo = new BufferGeometry();
    envGeo.setAttribute('position', new BufferAttribute(envPositions, 3));
    envGeo.setIndex(index);
    const envMat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false, side: DoubleSide });
    const envelope = new Mesh(envGeo, envMat);
    envelope.renderOrder = 3;

    const axisGeo = new BufferGeometry().setAttribute('position', new BufferAttribute(axisPositions, 3));
    const axisMat = new LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const axisLine = new Line(axisGeo, axisMat);
    axisLine.renderOrder = 4;

    const rayMat = new LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const rays = rayYs.map((ys) => {
      const arr = new Float32Array(ys.length * 3);
      ys.forEach((y, i) => {
        const { pos, lat } = path.at(i);
        const q = pos.addScaledVector(lat, y);
        arr.set([q.x, q.y, q.z], i * 3);
      });
      const line = new Line(new BufferGeometry().setAttribute('position', new BufferAttribute(arr, 3)), rayMat);
      line.renderOrder = 4;
      return line;
    });

    const glowMat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false });
    const glow = new Mesh(new SphereGeometry(4, 16, 12), glowMat);
    let sampleGlow: Mesh | null = null;
    if (def.light === 'emission') {
      sampleGlow = new Mesh(new SphereGeometry(9, 24, 16), new MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false }));
      sampleGlow.position.copy(path.at(0).pos);
      sampleGlow.visible = false;
    }
    const group = new Group();
    group.add(envelope, axisLine, ...rays, glow, ...(sampleGlow ? [sampleGlow] : []));
    root.add(group);
    return { def, path, end, envGeo, envelope, axisGeo, axisLine, rays, glow, sampleGlow, envMat, axisMat, rayMat, glowMat };
  });

  /** Show a path's light up to distance `front`; `lit` lights the sample (emission). */
  function setFront(bm: BeamModel, front: number, lit = false, now = 0) {
    const f = Math.max(0, Math.min(front, bm.end));
    const shown = f > 0 ? Math.floor(f) + 1 : 0;
    bm.envGeo.setDrawRange(0, Math.max(0, shown - 1) * RING * 6);
    bm.axisGeo.setDrawRange(0, shown);
    for (const line of bm.rays) line.geometry.setDrawRange(0, shown);
    bm.glow.position.copy(bm.path.at(f).pos);
    bm.glow.visible = f > 0 && f < bm.end - 0.5;
    if (bm.sampleGlow) {
      bm.sampleGlow.visible = lit;
      if (lit) bm.sampleGlow.scale.setScalar(1 + 0.18 * Math.sin(now / 160));
    }
  }

  /** Each part's place on the first path it lies on (for glyph orientation). */
  const placed = parts.map((part) => {
    const at = cellPoint(part.cell);
    for (const bm of beamModels) {
      const s = bm.path.distanceOf(at);
      if (s !== null) return { part, at, s, path: bm.path as PathModel | null };
    }
    return { part, at, s: null as number | null, path: null as PathModel | null };
  });

  /* ---- sketch glyphs (optikit-v2 style) and cube outlines ---- */
  const glyphMats: Material[] = [];
  const glyphObjects: Object3D[] = [];
  const outlineMat = new LineBasicMaterial({ color: colors.outline, transparent: true, opacity: 0.55 });
  const outlineGeo = new EdgesGeometry(new BoxGeometry(CELL, CELL, 55));
  const glyphMat = (color: string, opacity: number) => {
    const m = new MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05, transparent: true, opacity, depthWrite: opacity >= 1 });
    glyphMats.push(m);
    return m;
  };
  const X = new Vector3(1, 0, 0);
  const Y = new Vector3(0, 1, 0);

  for (const p of placed) {
    const g = new Group();
    g.position.copy(p.at);
    const { kind } = p.part.optic;
    const color = kind === 'source' ? colors.beam : colors.glyphs[kind];
    const dirs = p.s === null || !p.path ? { before: X, after: X } : p.path.dirsAt(p.s);
    const dir = kind === 'detector' ? dirs.before : dirs.after;
    // Beam frame: x along the beam, y lateral, z the third axis (up on a flat bench).
    const lat = p.s === null || !p.path ? Y : p.path.at(kind === 'detector' ? p.s - 0.5 : p.s + 0.5).lat;
    const frame = new Group();
    frame.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(dir, lat, new Vector3().crossVectors(dir, lat)));
    g.add(frame);
    const along = (mesh: Mesh) => {
      mesh.quaternion.setFromUnitVectors(Y, X);
      return mesh;
    };
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
        if ((p.part.optic.f ?? 1) < 0) {
          // A diverging lens is thin in the middle: mark its thick edges.
          for (const side of [-1, 1]) {
            const rim = new Mesh(new BoxGeometry(5, 3, 26), glyphMat(color, 0.85));
            rim.position.y = side * 12.5;
            frame.add(rim);
          }
        }
        break;
      }
      case 'mirror': {
        const normal = new Vector3().subVectors(dirs.after, dirs.before).normalize();
        const disc = new Mesh(new CylinderGeometry(14, 14, 2.5, 32), glyphMat(color, 1));
        disc.quaternion.setFromUnitVectors(Y, normal);
        const coat = new Mesh(new CylinderGeometry(14, 14, 0.4, 32), glyphMat(colors.coating, 1));
        coat.quaternion.copy(disc.quaternion);
        coat.position.copy(normal).multiplyScalar(1.5);
        g.add(disc, coat);
        break;
      }
      case 'dichroic': {
        // optikit-v2: a faint cube with the coloured plate on its diagonal.
        const normal = new Vector3().subVectors(dirs.after, dirs.before).normalize();
        const plateMesh = new Mesh(new BoxGeometry(34, 2.5, 26), glyphMat(color, 0.9));
        plateMesh.quaternion.setFromUnitVectors(Y, normal);
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
    g.add(new LineSegments(outlineGeo, outlineMat));
    root.add(g);
    glyphObjects.push(g);
  }

  /* ---- modules ---- */
  interface PartState {
    part: BenchPart;
    group: Group;
    subs: Record<SubName, Sub> | null;
    lift: number;
    liftTarget: number;
    apart: number;
    apartTarget: number;
    /** Height of its level, mm. */
    base: number;
  }
  const states: PartState[] = parts.map((part) => {
    const group = new Group();
    group.position.copy(cellPoint(part.cell));
    if (part.axes) group.quaternion.setFromRotationMatrix(orientation(part.axes));
    group.userData.partId = part.id;
    root.add(group);
    return { part, group, subs: null, lift: 0, liftTarget: 0, apart: 0, apartTarget: 0, base: group.position.z };
  });

  function placeSub(s: PartState, sub: Sub) {
    const e = 1 - Math.pow(1 - sub.v, 3); // ease-out
    sub.group.position.copy(sub.from).multiplyScalar(1 - e).addScaledVector(sub.apart, s.apart);
    for (const m of sub.mats) m.opacity = (m.userData.base as number) * e;
    sub.group.visible = sub.v > 0.005;
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
  };

  /* ---- camera and controls ---- */
  const camera = new PerspectiveCamera(30, 1, 5, 8000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false; // never steal the page's scroll wheel
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.autoRotateSpeed = 0.5;

  const world = (x: number, y: number, z: number) => new Vector3(x, z, -y);
  const c = centre;
  // Cameras look at the front of the stack (from -y), so the arms run along
  // the bottom of the wide stage and the tower rises on its right, over the
  // step list; targets are nudged so it clears the title notch.
  const POSES: Record<BenchStep, { position: Vector3; target: Vector3; fov: number }> = {
    sketch: { position: world(c.x - 48, c.y - 680, c.z + 60), target: world(c.x - 48, c.y, c.z - 13), fov: 22 },
    simulate: { position: world(c.x - 300, c.y - 600, c.z + 170), target: world(c.x - 42, c.y, c.z - 14), fov: 24 },
    cubify: { position: world(c.x + 330, c.y - 600, c.z + 260), target: world(c.x - 40, c.y, c.z - 18), fov: 24 },
    build: { position: world(c.x - 400, c.y - 660, c.z + 300), target: world(c.x - 55, c.y, c.z + 78), fov: 31 },
  };


  let step: BenchStep = options.initialStep ?? 'sketch';
  type Pose = (typeof POSES)[BenchStep];
  /**
   * The pose for the canvas's shape. The wide poses push the bench right of
   * the title; a narrower canvas centres it, lower, and steps back until it fits.
   */
  function fitted(p: Pose): Pose {
    const aspect = camera.aspect;
    const wide = Math.min(1, Math.max(0, (aspect - 0.6) / 0.9));
    const target = p.target.clone();
    target.x = c.x + (p.target.x - c.x) * wide;
    // On a phone the title sits over the top of the stage: keep the bench low.
    target.y += (1 - wide) * 70;
    const back = Math.max(1, 0.9 / aspect);
    const position = target.clone().add(new Vector3().subVectors(p.position, p.target).multiplyScalar(back));
    return { position, target, fov: p.fov };
  }

  let pose = POSES[step];
  let flying = true;
  let stepStart = performance.now();
  camera.position.copy(pose.position);
  controls.target.copy(pose.target);
  camera.fov = pose.fov;
  camera.updateProjectionMatrix();

  /** Targets for everything, from the step (and, in cubify, the frame). */
  function applyTargets(now = performance.now()) {
    // rAF timestamps can trail performance.now() slightly; never go below 0.
    const t = Math.max(0, now - stepStart);
    const layers: Record<keyof typeof faders, number> = {
      grid: step === 'sketch' || step === 'simulate' ? 1 : 0,
      plate: step === 'cubify' || step === 'build' ? 1 : 0,
      glyphs: step === 'sketch' || step === 'simulate' ? 1 : 0,
      envelope: step === 'simulate' ? 1 : step === 'cubify' ? 0.55 : 0,
      axis: step === 'build' ? 0 : 1,
      imaging: step === 'simulate' ? 1 : step === 'cubify' ? 0.5 : 0,
    };
    (Object.keys(faders) as (keyof typeof faders)[]).forEach((k) => (faders[k].target = layers[k]));

    const frame = step === 'cubify' ? (motion ? Math.min(FRAMES.length - 1, Math.floor(t / FRAME_MS)) : FRAMES.length - 1) : -1;
    for (const s of states) {
      s.liftTarget = step === 'build' ? 40 + (s.part.cell[2] ?? 0) * 30 : 0;
      s.apartTarget = step === 'build' ? 1 : 0;
      if (!s.subs) continue;
      for (const name of SUBS) {
        const shown = step === 'build' || (step === 'cubify' && FRAMES[frame].includes(name));
        s.subs[name].target = shown ? 1 : 0;
      }
    }
    controls.autoRotate = motion && step === 'cubify' && frame === FRAMES.length - 1 && !userTookOver;
  }

  let disposed = false;
  let userTookOver = false;
  for (const s of states) {
    loadModel(s.part.url)
      .then((model) => {
        if (disposed) return;
        const localUp = new Vector3(0, 0, 1).applyQuaternion(s.group.quaternion.clone().invert());
        s.subs = splitModel(model, localUp);
        s.group.add(model);
        applyTargets();
        for (const name of SUBS) {
          const sub = s.subs[name];
          sub.v = sub.target; // appear in the current state, no fly-in
          placeSub(s, sub);
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

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.getSize(size);
    if (size.x !== w || size.y !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!userTookOver) flying = true; // re-fit to the new shape
    }
  }

  function emitPins() {
    if (!options.onPins) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    options.onPins(
      states.map((s) => {
        s.group.getWorldPosition(tmp);
        tmp.project(camera);
        const x = ((tmp.x + 1) / 2) * w;
        const y = ((1 - tmp.y) / 2) * h;
        return { id: s.part.id, x, y, visible: tmp.z < 1 && x >= 0 && x <= w && y >= 0 && y <= h };
      }),
    );
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

    const kk = motion ? 1 - Math.exp(-dt * 6) : 1;
    const ks = motion ? 1 - Math.exp(-dt * 4.2) : 1;
    for (const s of states) {
      for (const key of ['lift', 'apart'] as const) {
        const target = key === 'lift' ? s.liftTarget : s.apartTarget;
        if (Math.abs(s[key] - target) > 0.002) {
          s[key] += (target - s[key]) * kk;
          moving = true;
        } else s[key] = target;
      }
      s.group.position.z = s.base + s.lift;
      if (!s.subs) continue;
      for (const name of SUBS) {
        const sub = s.subs[name];
        if (Math.abs(sub.v - sub.target) > 0.002) {
          sub.v += (sub.target - sub.v) * ks;
          moving = true;
        } else sub.v = sub.target;
        placeSub(s, sub);
      }
    }

    // The light: in the simulate step each path runs in turn (the emission
    // sets off once the excitation has lit the sample); full elsewhere.
    if (step === 'simulate' && motion) {
      const runs = beamModels.map((bm) => (bm.end / LIGHT_SPEED) * 1000);
      const total = runs.reduce((sum, r) => sum + r, 0) + SAMPLE_PAUSE * (runs.length - 1);
      const tt = Math.max(0, now - stepStart) % (total + LIGHT_HOLD);
      let start = 0;
      beamModels.forEach((bm, i) => {
        const local = tt - start;
        const lit = bm.def.light === 'emission' && local > -SAMPLE_PAUSE;
        setFront(bm, local <= 0 ? 0 : (Math.min(local, runs[i]) / 1000) * LIGHT_SPEED, lit, now);
        start += runs[i] + SAMPLE_PAUSE;
      });
      moving = true;
    } else {
      for (const bm of beamModels) setFront(bm, bm.end, false);
    }

    // Cubify keeps ticking until its last frame has settled.
    if (step === 'cubify' && now - stepStart < FRAME_MS * FRAMES.length) moving = true;

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

  /* ---- picking: the part whose centre is nearest the ray ---- */
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
      s.group.getWorldPosition(tmp);
      const d = raycaster.ray.distanceToPoint(tmp);
      if (d < 32 && (!best || d < best.d)) best = { id: s.part.id, d };
    }
    const id = best?.id ?? null;
    select(id);
    options.onSelect?.(id);
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);

  const selectionMat = new LineBasicMaterial({ color: colors.selection });
  const selectionBox = new LineSegments(new EdgesGeometry(new BoxGeometry(CELL + 2, CELL + 2, 57)), selectionMat);
  selectionBox.visible = false;
  root.add(selectionBox);
  function select(id: string | null) {
    const s = states.find((x) => x.part.id === id);
    selectionBox.visible = Boolean(s);
    if (s) selectionBox.position.copy(s.group.position);
    requestRender();
  }

  const resizeObserver = new ResizeObserver(() => requestRender());
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
      requestRender();
    },
    select,
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
