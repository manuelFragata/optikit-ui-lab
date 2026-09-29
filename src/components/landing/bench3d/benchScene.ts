/**
 * The landing page's 3D bench, in four steps:
 *
 *  - sketch:   the design as Optikit draws it: simple glyphs on the cell grid,
 *              cube outlines, the beam axis (optikit-v2's schematic style).
 *  - simulate: the light, traced paraxially through the actual optics, runs
 *              slowly along the path as a beam of the right width.
 *  - cubify:   the real openUC2 modules (GLB) appear part by part, all at the
 *              same time: optics, then inserts, then one cube half, then the
 *              other, then the screws.
 *  - build:    exploded, with the cube halves pulled apart.
 *
 * Plain three.js, loaded only when the section is on screen; it renders on
 * demand and stops when nothing moves. Coordinates follow the meshes:
 * millimetres, z up, one cell = 50 mm, a cube centred on its cell at z = 0.
 * The root group turns z-up into three's y-up.
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
export type OpticKind = 'source' | 'lens' | 'mirror' | 'sample' | 'detector' | 'spacer';

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
  /** Grid cell on the baseplate. */
  cell: [number, number];
  /**
   * Orientation as in optikit-v2 designs: where the module's local z and x
   * axes point in the world (z up). Identity when omitted.
   */
  axes?: { z: Axis; x: Axis };
  optic: BenchOptic;
}

export interface BenchColors {
  beam: string;
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
  /** Beam path as cell centres, from the source onwards. */
  beam: [number, number][];
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
const PLATE_TOP = -26.9; // cube bottoms sit on the tiles

/** Beam radius leaving the laser, mm. */
const BEAM_RADIUS = 2.5;
/** Speed of the light front in the simulate step, mm per second. */
const LIGHT_SPEED = 85;
/** Pause at the end of a light run before it starts again, ms. */
const LIGHT_HOLD = 2600;
/** One cubify frame, ms. */
const FRAME_MS = 1400;
/** Lateral offset of the imaged point on the sample, mm. */
const OBJECT_HEIGHT = 1.6;

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
  at: (s: number) => { pos: Vector3; dir: Vector3 };
  /** Distance along the path of a point on it, or null when it is off the path. */
  distanceOf: (p: Vector3) => number | null;
  /** Directions before and after a point (they differ at a fold). */
  dirsAt: (s: number) => { before: Vector3; after: Vector3 };
}

function makePath(cells: [number, number][]): PathModel {
  const pts = cells.map(([x, y]) => new Vector3(x * CELL, y * CELL, 0));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const length = cum[cum.length - 1];
  const segDir = (i: number) => new Vector3().subVectors(pts[i + 1], pts[i]).normalize();

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
      return { pos: pts[i].clone().addScaledVector(dir, c - cum[i]), dir };
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

function loadModel(url: string): Promise<Group> {
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url).then((gltf) => gltf.scene);
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
  const { parts, beam, plate } = options;
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
  const span = Math.max(plate[0], plate[1]) * CELL;
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 10, far: 1600 });
  scene.add(sun);

  const root = new Group();
  root.rotation.x = -Math.PI / 2; // z-up content
  scene.add(root);

  const centre = new Vector3(((plate[0] - 1) * CELL) / 2, ((plate[1] - 1) * CELL) / 2, 0);
  sun.target.position.set(centre.x, 0, -centre.y);
  scene.add(sun.target);

  /* ---- sketch grid (cell boundaries, a major line every 5 cells) ---- */
  const gridGroup = new Group();
  const minorMat = new LineBasicMaterial({ color: colors.grid, transparent: true, opacity: 1 });
  const majorMat = new LineBasicMaterial({ color: colors.gridMajor, transparent: true, opacity: 1 });
  {
    const margin = 2;
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

  /* ---- path and optics ---- */
  const path = makePath(beam);
  const placed = parts.map((part) => {
    const at = new Vector3(part.cell[0] * CELL, part.cell[1] * CELL, 0);
    return { part, at, s: path.distanceOf(at) };
  });
  const sOf = (kind: OpticKind) => placed.find((p) => p.part.optic.kind === kind)?.s ?? null;
  const lenses: OpticEvent[] = placed.flatMap((p) =>
    p.part.optic.kind === 'lens' && p.s !== null && p.part.optic.f ? [{ s: p.s, f: p.part.optic.f }] : [],
  );
  const sEnd = sOf('detector') ?? path.length;
  const sSample = sOf('sample');
  const illumination = trace(BEAM_RADIUS, 0, 0, sEnd, lenses);

  // Imaging: a small fan from a point on the sample, through the lens after it.
  const lensAfterSample = sSample === null ? undefined : lenses.filter((l) => l.s > sSample).sort((a, b) => a.s - b.s)[0];
  const imagingRays =
    sSample !== null && lensAfterSample
      ? [-9, 0, 9].map((yl) => trace(OBJECT_HEIGHT, (yl - OBJECT_HEIGHT) / (lensAfterSample.s - sSample), sSample, sEnd, lenses))
      : [];

  /* ---- beam: axis line, envelope tube, imaging rays, front glow ---- */
  const beamGroup = new Group();
  root.add(beamGroup);
  const RING = 20;
  const rings = illumination.length;
  const envPositions = new Float32Array(rings * RING * 3);
  const axisPositions = new Float32Array(rings * 3);
  const lateralOf = (dir: Vector3) => new Vector3(-dir.y, dir.x, 0);
  for (let i = 0; i < rings; i++) {
    const { pos, dir } = path.at(i);
    const lat = lateralOf(dir);
    const r = Math.max(0.35, Math.abs(illumination[i]));
    for (let k = 0; k < RING; k++) {
      const a = (k / RING) * Math.PI * 2;
      const p = pos.clone().addScaledVector(lat, Math.cos(a) * r);
      p.z += Math.sin(a) * r;
      envPositions.set([p.x, p.y, p.z], (i * RING + k) * 3);
    }
    axisPositions.set([pos.x, pos.y, pos.z], i * 3);
  }
  const envIndex: number[] = [];
  for (let i = 0; i < rings - 1; i++) {
    for (let k = 0; k < RING; k++) {
      const a = i * RING + k;
      const b = i * RING + ((k + 1) % RING);
      const cc = (i + 1) * RING + k;
      const d = (i + 1) * RING + ((k + 1) % RING);
      envIndex.push(a, cc, b, b, cc, d);
    }
  }
  const envGeo = new BufferGeometry();
  envGeo.setAttribute('position', new BufferAttribute(envPositions, 3));
  envGeo.setIndex(envIndex);
  const envMat = new MeshBasicMaterial({ color: colors.beam, transparent: true, opacity: 0.32, depthWrite: false, side: DoubleSide });
  const envelope = new Mesh(envGeo, envMat);
  envelope.renderOrder = 3;

  const axisGeo = new BufferGeometry().setAttribute('position', new BufferAttribute(axisPositions, 3));
  const axisMat = new LineBasicMaterial({ color: colors.beam, transparent: true, opacity: 0.95 });
  const axisLine = new Line(axisGeo, axisMat);
  axisLine.renderOrder = 4;

  const imagingMat = new LineBasicMaterial({ color: colors.beam, transparent: true, opacity: 0.85 });
  const imagingLines = imagingRays.map((ys) => {
    const arr = new Float32Array(ys.length * 3);
    ys.forEach((y, i) => {
      const { pos, dir } = path.at((sSample ?? 0) + i);
      const p = pos.addScaledVector(lateralOf(dir), y);
      arr.set([p.x, p.y, p.z], i * 3);
    });
    const line = new Line(new BufferGeometry().setAttribute('position', new BufferAttribute(arr, 3)), imagingMat);
    line.renderOrder = 4;
    return line;
  });

  const glowMat = new MeshBasicMaterial({ color: colors.beam, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false });
  const glow = new Mesh(new SphereGeometry(4, 16, 12), glowMat);
  beamGroup.add(envelope, axisLine, ...imagingLines, glow);

  /** Show the light up to path distance `front`. */
  function setFront(front: number) {
    const f = Math.max(0, Math.min(front, sEnd));
    const ringsShown = Math.floor(f) + 1;
    envGeo.setDrawRange(0, Math.max(0, ringsShown - 1) * RING * 6);
    axisGeo.setDrawRange(0, ringsShown);
    for (const line of imagingLines) line.geometry.setDrawRange(0, sSample === null ? 0 : Math.max(0, Math.floor(f - sSample) + 1));
    glow.position.copy(path.at(f).pos);
    glow.visible = f > 0 && f < sEnd - 0.5;
  }

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
  const Z = new Vector3(0, 0, 1);

  for (const p of placed) {
    const g = new Group();
    g.position.copy(p.at);
    const { kind } = p.part.optic;
    const color = kind === 'source' ? colors.beam : colors.glyphs[kind];
    const dirs = p.s === null ? { before: X, after: X } : path.dirsAt(p.s);
    const dir = kind === 'detector' ? dirs.before : dirs.after;
    // Beam frame: x along the beam, y lateral, z up.
    const frame = new Group();
    frame.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(dir, lateralOf(dir), Z));
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
      case 'lens': {
        const lens = new Mesh(new SphereGeometry(14, 32, 16), glyphMat(color, 0.55));
        lens.scale.set(0.18, 1, 1);
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
  }
  const states: PartState[] = parts.map((part) => {
    const group = new Group();
    group.position.set(part.cell[0] * CELL, part.cell[1] * CELL, 0);
    if (part.axes) group.quaternion.setFromRotationMatrix(orientation(part.axes));
    group.userData.partId = part.id;
    root.add(group);
    return { part, group, subs: null, lift: 0, liftTarget: 0, apart: 0, apartTarget: 0 };
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
    envelope: new Fader([envMat, glowMat], [envelope], 0),
    axis: new Fader([axisMat], [axisLine], 1),
    imaging: new Fader([imagingMat], imagingLines, 0),
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
  // Cameras sit on the +x side, so the long leg of the path (+y) runs left to
  // right across the wide stage; targets are nudged so the bench sits right
  // of and below the title notch.
  const POSES: Record<BenchStep, { position: Vector3; target: Vector3; fov: number }> = {
    sketch: { position: world(c.x + 150, c.y - 40, 660), target: world(c.x - 55, c.y - 40, 0), fov: 30 },
    simulate: { position: world(c.x + 450, c.y - 50, 330), target: world(c.x - 20, c.y - 50, 0), fov: 30 },
    cubify: { position: world(c.x + 540, c.y + 250, 420), target: world(c.x - 10, c.y - 95, -10), fov: 30 },
    build: { position: world(c.x + 120, c.y - 600, 440), target: world(c.x - 30, c.y + 20, 30), fov: 32 },
  };

  let step: BenchStep = options.initialStep ?? 'sketch';
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
      s.liftTarget = step === 'build' ? 60 : 0;
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
    }
  }

  function emitPins() {
    if (!options.onPins) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    options.onPins(
      states.map((s) => {
        s.group.getWorldPosition(tmp);
        tmp.y += 36;
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
      const k = motion ? 1 - Math.exp(-dt * 3.2) : 1;
      camera.position.lerp(pose.position, k);
      controls.target.lerp(pose.target, k);
      camera.fov += (pose.fov - camera.fov) * k;
      camera.updateProjectionMatrix();
      if (camera.position.distanceTo(pose.position) < 0.5 && controls.target.distanceTo(pose.target) < 0.5) flying = false;
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
      s.group.position.z = s.lift;
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

    // The light: runs along the path in the simulate step, full elsewhere.
    if (step === 'simulate' && motion) {
      const runMs = (sEnd / LIGHT_SPEED) * 1000;
      const t = Math.max(0, now - stepStart) % (runMs + LIGHT_HOLD);
      setFront((Math.min(t, runMs) / 1000) * LIGHT_SPEED);
      moving = true;
    } else setFront(sEnd);

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
      for (const m of [envMat, axisMat, imagingMat, glowMat]) m.color.set(next.beam);
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
