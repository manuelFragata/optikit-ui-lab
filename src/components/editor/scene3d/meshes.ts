/**
 * Module meshes for the 3D view, prepared once per file and shared by every
 * part that uses it:
 *
 * - centred on the module's cube halves (`CUBHLF` in the Inventor names; most
 *   modules are modelled around the cube centre already), in millimetres;
 * - matte materials, one per source material: the store's GLBs leave
 *   metalness at the glTF default (1), which reads as chrome, so it is not
 *   trusted; glass stays see-through;
 * - split into its components (the cube enclosure, the holder, the lens, each
 *   screw: see components.ts), so each can be hovered and looked at on its
 *   own; within a component, the meshes merged into one geometry per
 *   material. A mesh with several materials takes its first.
 *
 * Nothing is cloned per part and nothing per frame: parts render the shared
 * geometry and materials, kept for the session. Ghosts and outlines are drawn
 * by shapes.tsx, not by changing these materials.
 */
import { useGLTF } from '@react-three/drei';
import { Box3, BufferGeometry, Color, Material, Matrix4, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { describeComponent, numbered, ownerOf, type ComponentInfo } from './components';
import type { Axis } from './layout3d';

export interface MeshPiece {
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
}

/** One part of a module: the enclosure, the holder, the lens, a screw. */
export interface MeshComponent {
  info: ComponentInfo;
  /** The label, numbered when the module has several ("Screw M3 × 20 (2 of 4)"). */
  title: string;
  pieces: MeshPiece[];
  /** Its extent in the module's frame (mm, centred on the cube). */
  box: Box3;
  triangles: number;
}

export interface PreparedMesh {
  components: MeshComponent[];
}

/** Set on every drawn mesh of a component: its key, for picking. */
export const COMPONENT_KEY = 'componentKey';

const prepared = new WeakMap<Object3D, PreparedMesh>();
/** The same, by file, for what only reads them (the names under the pointer). */
const preparedByUrl = new Map<string, PreparedMesh>();

/** Below this size (in file units) a model is taken to be in metres. optikit-v2: meshUnits.ts. */
const METRES_IF_SMALLER = 2;

/** The source's colour, matte; see-through if the source is. */
function matte(src: Material): MeshStandardMaterial {
  const s = src as MeshStandardMaterial;
  const glass = s.transparent || s.opacity < 1;
  return new MeshStandardMaterial({
    color: s.color?.clone() ?? new Color('#cccccc'),
    roughness: glass ? 0.1 : 0.6,
    metalness: 0.05,
    transparent: glass,
    opacity: glass ? 0.45 : 1,
    depthWrite: !glass,
  });
}

/** Only what the view needs, in one layout, so geometries can be merged. */
function plain(g: BufferGeometry, m: Matrix4): BufferGeometry {
  const out = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m);
  for (const name of Object.keys(out.attributes)) if (name !== 'position' && name !== 'normal') out.deleteAttribute(name);
  if (!out.attributes.normal) out.computeVertexNormals();
  out.morphAttributes = {};
  return out;
}

function prepare(scene: Object3D): PreparedMesh {
  scene.updateMatrixWorld(true);
  const all = new Box3().setFromObject(scene);
  const size = all.getSize(new Vector3());
  const scale = Math.max(size.x, size.y, size.z) < METRES_IF_SMALLER ? 1000 : 1;

  // Centre on the cube halves where the file names them, else on the whole model.
  const cube = new Box3();
  scene.traverse((o) => {
    if ((o as Mesh).isMesh && /CUBHLF/i.test(`${o.name} ${o.parent?.name ?? ''}`)) cube.expandByObject(o);
  });
  const centre = (cube.isEmpty() ? all : cube).getCenter(new Vector3());
  const toCube = new Matrix4().makeScale(scale, scale, scale).multiply(new Matrix4().makeTranslation(-centre.x, -centre.y, -centre.z));

  // Meshes by the component they belong to, then by material.
  const nameOf = (o: Object3D) => (o.userData.name as string | undefined) ?? o.name;
  const byComponent = new Map<string, { info: ComponentInfo; byMaterial: Map<Material, { material: MeshStandardMaterial; geometries: BufferGeometry[] }> }>();
  const materials = new Map<Material, MeshStandardMaterial>();
  scene.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const info = describeComponent(nameOf(ownerOf<Object3D>(mesh, nameOf)));
    let component = byComponent.get(info.key);
    if (!component) byComponent.set(info.key, (component = { info, byMaterial: new Map() }));
    const src = (Array.isArray(mesh.material) ? mesh.material : [mesh.material])[0];
    let material = materials.get(src);
    if (!material) materials.set(src, (material = matte(src)));
    let group = component.byMaterial.get(src);
    if (!group) component.byMaterial.set(src, (group = { material, geometries: [] }));
    group.geometries.push(plain(mesh.geometry, new Matrix4().multiplyMatrices(toCube, mesh.matrixWorld)));
  });

  const components = [...byComponent.values()].map(({ info, byMaterial }) => {
    const pieces = [...byMaterial.values()].flatMap(({ material, geometries }) => {
      const merged = mergeGeometries(geometries);
      // Merging only fails on mismatched layouts, which plain() rules out; keep the pieces if it does anyway.
      return merged ? [{ geometry: merged, material }] : geometries.map((geometry) => ({ geometry, material }));
    });
    const box = new Box3();
    let triangles = 0;
    for (const { geometry } of pieces) {
      geometry.computeBoundingBox();
      box.union(geometry.boundingBox!);
      triangles += geometry.attributes.position.count / 3;
    }
    return { info, pieces, box, triangles };
  });
  // The enclosure first, then the holders, the optics, the rest; as in the file within each.
  const order = ['enclosure', 'holder', 'optic', 'electronics', 'part', 'hardware'];
  components.sort((a, b) => order.indexOf(a.info.role) - order.indexOf(b.info.role));
  return { components: numbered(components) };
}

/** A module's mesh, ready to draw. Suspends while the file loads (wrap in Suspense). */
export function useModuleMesh(url: string): PreparedMesh {
  const { scene } = useGLTF(url);
  let mesh = prepared.get(scene);
  if (!mesh) prepared.set(scene, (mesh = prepare(scene)));
  preparedByUrl.set(url, mesh);
  return mesh;
}

/** A loaded module's component, by key; `undefined` while its file has not been drawn. */
export const componentOf = (url: string, key: string): MeshComponent | undefined => preparedByUrl.get(url)?.components.find((c) => c.info.key === key);

/** Start fetching meshes before they are drawn. */
export const preloadMeshes = (urls: string[]) => [...new Set(urls)].forEach((u) => useGLTF.preload(u));

const AXIS: Record<Axis, [number, number, number]> = {
  '+x': [1, 0, 0],
  '-x': [-1, 0, 0],
  '+y': [0, 1, 0],
  '-y': [0, -1, 0],
  '+z': [0, 0, 1],
  '-z': [0, 0, -1],
};

/**
 * The rotation that sends a module's local z and x to the given document
 * axes (y = z × x), then turns it `turns` quarter turns about z (its seat).
 */
export function poseMatrix(axes: { z: Axis; x: Axis }, turns: number): Matrix4 {
  const z = new Vector3(...AXIS[axes.z]);
  const x = new Vector3(...AXIS[axes.x]);
  const y = new Vector3().crossVectors(z, x);
  return new Matrix4().makeRotationZ((turns * Math.PI) / 2).multiply(new Matrix4().makeBasis(x, y, z));
}
