/**
 * The landing page's 3D bench: real openUC2 cube modules (GLB) on a puzzle
 * baseplate, one laser beam through them, and four camera "steps" (sketch,
 * mount, assemble, build). Plain three.js, loaded only when the section is
 * on screen; it renders on demand and stops when nothing moves.
 *
 * Coordinates follow the meshes: millimetres, z up, one cell = 50 mm, a
 * cube centred on its cell at z = 0. The root group turns z-up into three's
 * y-up.
 */
import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  Color,
  CurvePath,
  DirectionalLight,
  EdgesGeometry,
  Group,
  HemisphereLight,
  Matrix4,
  LineBasicMaterial,
  LineCurve3,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  Raycaster,
  Scene,
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

export type BenchStep = 'sketch' | 'mount' | 'assemble' | 'build';
export type Axis = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';

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

export interface BenchPart {
  id: string;
  label: string;
  /** GLB URL of the module. */
  url: string;
  /** Grid cell on the baseplate. */
  cell: [number, number];
  /**
   * Orientation as in optikit-v2 designs: where the module's local z and x
   * axes point in the world (z up). Local z is the module's optical axis
   * (lens axis, camera view); identity when omitted.
   */
  axes?: { z: Axis; x: Axis };
  /** The part that drops into its cube in the "mount" step. */
  mountDemo?: boolean;
}

export interface BenchColors {
  beam: string;
  plate: string;
  tile: string;
  outline: string;
  selection: string;
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
  /** Screen positions of each part's pin, after every rendered frame. */
  onPins?: (pins: BenchPin[]) => void;
  onSelect?: (id: string | null) => void;
  /** A part's mesh finished loading (or failed). */
  onPartLoaded?: (id: string, ok: boolean) => void;
  initialStep?: BenchStep;
  /** Camera flights and slow auto-rotation; off for reduced motion. */
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
const CUBE = { w: 49.8, h: 53.8 };
const PLATE_TOP = -26.9; // cube bottoms sit on the tiles

interface CameraPose {
  position: Vector3;
  target: Vector3;
  fov: number;
}

interface PartState {
  part: BenchPart;
  group: Group; // placed on the cell, lifted by `lift`
  model: Group | null;
  outline: LineSegments;
  lift: number;
  liftTarget: number;
  fade: number; // 0 = ghost, 1 = solid
  fadeTarget: number;
  materials: MeshStandardMaterial[];
}

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

/**
 * The store's materials leave metalness at the glTF default (fully metallic)
 * and look like chrome. Swap them for matte print-like materials; keep glass
 * transparent and screws metallic.
 */
function restyle(model: Object3D): MeshStandardMaterial[] {
  const out: MeshStandardMaterial[] = [];
  model.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const src = mesh.material as MeshStandardMaterial;
    const name = `${mesh.name} ${mesh.parent?.name ?? ''}`;
    const glass = src.transparent || src.opacity < 1;
    const screw = /screw|nut|ISO|DIN|TP lens/i.test(name);
    const mat = new MeshStandardMaterial({
      color: src.color?.clone() ?? new Color('#cccccc'),
      roughness: glass ? 0.05 : screw ? 0.35 : 0.62,
      metalness: screw ? 0.7 : 0.02,
      transparent: true,
      opacity: glass ? 0.45 : 1,
      depthWrite: !glass,
    });
    mat.userData.baseOpacity = mat.opacity;
    mesh.material = mat;
    mesh.castShadow = !glass;
    mesh.receiveShadow = true;
    out.push(mat);
  });
  return out;
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

export function createBenchScene(canvas: HTMLCanvasElement, options: BenchSceneOptions): BenchScene {
  const { parts, beam, plate } = options;
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
  sun.position.set(-160, 420, 260);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0004;
  const span = Math.max(plate[0], plate[1]) * CELL;
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 10, far: 1400 });
  scene.add(sun);

  // z-up content in millimetres.
  const root = new Group();
  root.rotation.x = -Math.PI / 2;
  scene.add(root);

  const centre = new Vector3(((plate[0] - 1) * CELL) / 2, ((plate[1] - 1) * CELL) / 2, 0);
  sun.target.position.set(centre.x, 0, -centre.y);
  scene.add(sun.target);

  /* ---- baseplate: a dark slab with one light puzzle tile per cell ---- */
  const plateGroup = new Group();
  const slabMat = new MeshStandardMaterial({ color: colors.plate, roughness: 0.8, metalness: 0 });
  const tileMat = new MeshStandardMaterial({ color: colors.tile, roughness: 0.7, metalness: 0 });
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

  /* ---- beam ---- */
  const beamPath = new CurvePath<Vector3>();
  const beamPoints = beam.map(([gx, gy]) => new Vector3(gx * CELL, gy * CELL, 0));
  for (let i = 0; i < beamPoints.length - 1; i++) beamPath.add(new LineCurve3(beamPoints[i], beamPoints[i + 1]));
  const beamMat = new MeshBasicMaterial({ color: colors.beam, transparent: true, opacity: 0.9, depthWrite: false });
  const beamMesh = new Mesh(new TubeGeometry(beamPath, Math.max(8, beamPoints.length * 16), 1.1, 10, false), beamMat);
  beamMesh.renderOrder = 2;
  root.add(beamMesh);

  /* ---- parts ---- */
  const outlineMat = new LineBasicMaterial({ color: colors.outline, transparent: true, opacity: 0.9 });
  const outlineGeo = new EdgesGeometry(new BoxGeometry(CUBE.w, CUBE.w, CUBE.h));
  const states: PartState[] = parts.map((part) => {
    const group = new Group();
    group.position.set(part.cell[0] * CELL, part.cell[1] * CELL, 0);
    if (part.axes) group.quaternion.setFromRotationMatrix(orientation(part.axes));
    group.userData.partId = part.id;
    const outline = new LineSegments(outlineGeo, outlineMat);
    group.add(outline);
    root.add(group);
    return { part, group, model: null, outline, lift: 0, liftTarget: 0, fade: 1, fadeTarget: 1, materials: [] };
  });

  let disposed = false;
  for (const s of states) {
    loadModel(s.part.url)
      .then((model) => {
        if (disposed) return;
        s.materials = restyle(model);
        s.model = model;
        s.group.add(model);
        applyFade(s);
        options.onPartLoaded?.(s.part.id, true);
        requestRender();
      })
      .catch(() => options.onPartLoaded?.(s.part.id, false));
  }

  /* ---- camera and controls ---- */
  const camera = new PerspectiveCamera(32, 1, 5, 6000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false; // never steal the page's scroll wheel
  controls.enablePan = false;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.autoRotateSpeed = 0.6;

  const world = (x: number, y: number, z: number) => new Vector3(x, z, -y); // z-up -> y-up
  const c = centre;
  const POSES: Record<BenchStep, CameraPose> = {
    sketch: { position: world(c.x, c.y - 1, 820), target: world(c.x, c.y, 0), fov: 30 },
    mount: { position: world(c.x - 330, c.y - 420, 330), target: world(c.x, c.y, 0), fov: 30 },
    assemble: { position: world(c.x + 380, c.y - 360, 300), target: world(c.x, c.y, 0), fov: 30 },
    build: { position: world(c.x - 200, c.y - 520, 440), target: world(c.x, c.y, 40), fov: 32 },
  };

  const motion = options.motion ?? true;
  let step: BenchStep = options.initialStep ?? 'assemble';
  let pose = POSES[step];
  let flying = true; // tween the camera to `pose` until close
  camera.position.copy(pose.position);
  controls.target.copy(pose.target);
  camera.fov = pose.fov;
  camera.updateProjectionMatrix();

  let selectedId: string | null = null;

  function applyFade(s: PartState) {
    const ghost = 1 - s.fade;
    for (const m of s.materials) m.opacity = (m.userData.baseOpacity as number) * (0.12 + 0.88 * s.fade);
    for (const m of s.materials) m.depthWrite = s.fade > 0.95 && m.userData.baseOpacity === 1;
    s.outline.visible = !s.model || ghost > 0.05 || s.part.id === selectedId;
    (s.outline.material as LineBasicMaterial).color.set(colors.outline);
  }

  function setTargets() {
    const exploded = step === 'build';
    states.forEach((s, i) => {
      s.fadeTarget = step === 'sketch' ? 0 : 1;
      s.liftTarget = exploded ? 70 + (i % 2) * 30 : 0;
    });
    beamMesh.scale.setScalar(1);
    beamMat.opacity = step === 'build' ? 0.35 : 0.9;
    controls.autoRotate = motion && step === 'assemble';
  }

  /* ---- render loop (on demand) ---- */
  let active = true;
  let frame = 0;
  let last = performance.now();
  const size = new Vector2();
  const tmp = new Vector3();

  function requestRender() {
    if (!frame && active && !disposed) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
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
    const pins = states.map((s) => {
      s.group.getWorldPosition(tmp);
      tmp.y += CUBE.h / 2 + 6;
      tmp.project(camera);
      const x = ((tmp.x + 1) / 2) * w;
      const y = ((1 - tmp.y) / 2) * h;
      return { id: s.part.id, x, y, visible: tmp.z < 1 && x >= 0 && x <= w && y >= 0 && y <= h };
    });
    options.onPins(pins);
  }

  function tick(now: number) {
    frame = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    resize();
    let moving = false;

    // Camera flight to the step's pose; the user takes over when they drag.
    if (flying) {
      const k = motion ? 1 - Math.exp(-dt * 4) : 1;
      camera.position.lerp(pose.position, k);
      controls.target.lerp(pose.target, k);
      camera.fov += (pose.fov - camera.fov) * k;
      camera.updateProjectionMatrix();
      if (camera.position.distanceTo(pose.position) < 0.5 && controls.target.distanceTo(pose.target) < 0.5) flying = false;
      else moving = true;
    }

    for (const s of states) {
      const k = motion ? 1 - Math.exp(-dt * 6) : 1;
      if (Math.abs(s.lift - s.liftTarget) > 0.05) {
        s.lift += (s.liftTarget - s.lift) * k;
        moving = true;
      } else s.lift = s.liftTarget;
      if (Math.abs(s.fade - s.fadeTarget) > 0.005) {
        s.fade += (s.fadeTarget - s.fade) * k;
        moving = true;
      } else s.fade = s.fadeTarget;
      s.group.position.z = s.lift; // world z: the group's position is in the root (z-up) frame
      applyFade(s);
    }

    if (controls.update(dt)) moving = true;
    if (controls.autoRotate) moving = true;

    renderer.render(scene, camera);
    emitPins();
    if (moving) requestRender();
  }

  const onControlsStart = () => {
    flying = false;
    controls.autoRotate = false;
    requestRender();
  };
  controls.addEventListener('start', onControlsStart);
  controls.addEventListener('change', requestRender);

  /* ---- mount demo: the flagged part drops into its cube ---- */
  function playMount() {
    const s = states.find((x) => x.part.mountDemo);
    if (!s) return;
    s.lift = 110;
    s.liftTarget = 0;
  }

  /* ---- picking ---- */
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
    const hit = raycaster.intersectObjects(states.map((s) => s.group), true)[0];
    let obj: Object3D | null = hit?.object ?? null;
    while (obj && obj.userData.partId === undefined) obj = obj.parent;
    const id = (obj?.userData.partId as string | undefined) ?? null;
    select(id);
    options.onSelect?.(id);
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);

  function select(id: string | null) {
    selectedId = id;
    outlineMat.color.set(colors.outline);
    for (const s of states) {
      const on = s.part.id === id;
      s.outline.material = on ? selectionMat : outlineMat;
      applyFade(s);
    }
    requestRender();
  }
  const selectionMat = new LineBasicMaterial({ color: colors.selection });

  const resizeObserver = new ResizeObserver(() => requestRender());
  resizeObserver.observe(canvas);

  setTargets();
  requestRender();

  return {
    setStep(next) {
      if (next === step) return;
      step = next;
      pose = POSES[next];
      flying = true;
      setTargets();
      if (next === 'mount') playMount();
      requestRender();
    },
    setColors(next) {
      colors = next;
      beamMat.color.set(next.beam);
      slabMat.color.set(next.plate);
      tileMat.color.set(next.tile);
      outlineMat.color.set(next.outline);
      selectionMat.color.set(next.selection);
      requestRender();
    },
    select,
    setActive(next) {
      active = next;
      if (next) requestRender();
      else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
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
