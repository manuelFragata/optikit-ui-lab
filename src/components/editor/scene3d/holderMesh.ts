/**
 * Holders and glass as meshes: the same components the module meshes have
 * (meshes.ts), so hovering, picking, X-ray, isolate and section work on them
 * as on any module. A frozen holder's components come from the holder port
 * (src/ports/holders.ts: the service's generated mesh; in the lab, the
 * stand-in's drawing of the V4 cartridge), in time; a lens or mirror's glass
 * is turned here from its prescription.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { BufferGeometry, Box3, DoubleSide, LatheGeometry, Matrix4, MeshStandardMaterial, Vector2 } from 'three';
import type { FragmentSurface } from '../holders/optic';
import { useHolders } from '../../../ports/holders';
import { useRequest } from '../../../ports/request';
import { opticShape, type CatalogRecord } from '../holders/optic';
import type { ComponentInfo, ComponentRole, ComponentSource } from './components';
import type { HolderMeshRef } from './layout3d';
import type { MeshComponent } from './meshes';

/** Segments around a turned or round body. */
export const SEGMENTS = 72;

// One material per look, shared by every preview (never disposed: there are five).
const look = (color: string, glass = false) =>
  new MeshStandardMaterial({ color, roughness: glass ? 0.1 : 0.65, metalness: 0.05, transparent: glass, opacity: glass ? 0.45 : 1, depthWrite: !glass, side: DoubleSide });
export const MATERIAL = {
  printed: look('#e3e1da'),
  molded: look('#3b3e44'),
  pin: look('#b9bdc3'),
  crown: look('#b9d6f2', true),
  flint: look('#93b2e6', true),
  mirror: new MeshStandardMaterial({ color: '#d6dbe2', roughness: 0.15, metalness: 0.8, side: DoubleSide }),
};

export const info = (key: string, label: string, role: ComponentRole, source: ComponentSource, code: string): ComponentInfo => ({ key, label, role, source, code });

/** Components from pieces built in another frame: turned into the document's by `toDocument`, with their box and size. */
export function component(i: ComponentInfo, title: string, pieces: { geometry: BufferGeometry; material: MeshStandardMaterial }[], toDocument: Matrix4): MeshComponent {
  const box = new Box3();
  let triangles = 0;
  for (const { geometry } of pieces) {
    geometry.applyMatrix4(toDocument);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    box.union(geometry.boundingBox!);
    triangles += (geometry.index?.count ?? geometry.attributes.position.count) / 3;
  }
  return { info: i, title, pieces, box, triangles };
}

/** A catalogue lens on its own at the cube centre, its axis along the document's +x: a candidate shown before it is chosen. */
export function lensComponent(record: CatalogRecord): MeshComponent {
  const name = record.vendor?.mpn ?? record.id;
  const glass = glassGeometries(record.fragmentSurfaces).map((geometry, i) => ({ geometry, material: i === 0 ? MATERIAL.crown : MATERIAL.flint }));
  return component(info('lens', `Lens ${name}`, 'optic', 'bought', record.id), `Lens ${name}`, glass, new Matrix4());
}

/** A lens or mirror's glass on its own, turned about its axis, the axis along the document's +x: one geometry per element. */
export function glassGeometries(surfaces: FragmentSurface[]): BufferGeometry[] {
  const shape = opticShape({ fragmentSurfaces: surfaces });
  if (!shape) return [];
  // Lathe about y, onto x: a quarter turn about z the other way.
  return shape.elements.map((e) => new LatheGeometry(e.profile.map(([r, z]) => new Vector2(Math.max(r, 1e-4), z)), SEGMENTS).rotateZ(-Math.PI / 2));
}

/** Glass, by element (crown then flint), and a mirror's silvered substrate. */
export const glassMaterial = (element: number, mirror: boolean) => (mirror ? MATERIAL.mirror : element === 0 ? MATERIAL.crown : MATERIAL.flint);

/** Free a preview's geometries when it is built again (its materials are shared). */
export const disposeComponents = (components: MeshComponent[]) => components.forEach((c) => c.pieces.forEach((p) => p.geometry.dispose()));

/** The last build of each frozen holder, by its parameters: for the names under the pointer. */
const built = new Map<string, MeshComponent[]>();
// The prescription too: a designed lens keeps its id while its glass is reshaped.
const keyOf = (h: HolderMeshRef) => `${h.record.id} ${JSON.stringify(h.params)} ${JSON.stringify(h.record.fragmentSurfaces)}`;

/**
 * A holder's components, asked of the holder port once per set of
 * parameters; the last ones stay while newer ones come (a slider drags
 * smoothly), and each set is freed when it is replaced. None without a holder.
 */
export function useHolderComponents(holder: HolderMeshRef | undefined): MeshComponent[] {
  const holders = useHolders();
  const key = holder ? keyOf(holder) : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps -- asked again when the holder changes by value
  const ask = useMemo(() => (holder ? { params: holder.params, record: holder.record } : null), [key]);
  const asking = useCallback((a: HolderMeshRef) => holders.mesh(a).then((components) => ({ key: keyOf(a), components })), [holders]);
  const { data } = useRequest(ask, asking, { keep: true });
  useEffect(() => {
    if (!data) return;
    built.set(data.key, data.components);
    return () => {
      if (built.get(data.key) === data.components) built.delete(data.key);
      disposeComponents(data.components);
    };
  }, [data]);
  return holder && data ? data.components : [];
}

/** A frozen holder's component, by key, once drawn. */
export const holderComponentOf = (holder: HolderMeshRef, key: string) => built.get(keyOf(holder))?.find((c) => c.info.key === key);
