/**
 * A lens cartridge as meshes, for the close-up: the same components the
 * module meshes have (meshes.ts), so hovering, picking, X-ray, isolate and
 * section work on it as on any module. A preview from standins/service/cartridge.ts's
 * numbers: the halves are the cylinder minus the cavity, built as thin
 * slices (the cavity follows the lens, and may sit off the axis, so it is
 * not one turned profile); the lens is turned from its prescription. The real
 * solids come from CadQuery on the optikit service.
 *
 * Everything is built in the generator's frame (optical axis z) and then
 * turned into the document's, with the beam along `beam_axis`.
 */
import { useEffect, useMemo } from 'react';
import { BufferGeometry, Box3, CylinderGeometry, DoubleSide, ExtrudeGeometry, LatheGeometry, Matrix4, MeshStandardMaterial, Path, Shape, Vector2 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { FragmentSurface } from '../holders/optic';
import { CARTRIDGE, cartridgeDefaults, cavityRadius, layout, type BeamAxis, type CartridgeParams } from '../../../standins/service/cartridge';
import { opticShape, type CatalogRecord, type OpticShape } from '../holders/optic';
import type { ComponentInfo, ComponentRole, ComponentSource } from './components';
import type { HolderMeshRef } from './layout3d';
import type { MeshComponent } from './meshes';

const AXIS: Record<BeamAxis, [number, number, number]> = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0] };

/** Generator frame → document frame: z along the beam, y up, x = y × z. */
export function generatorToDocument(beam: BeamAxis): Matrix4 {
  const [bx, by] = AXIS[beam];
  // sideways = up × beam
  return new Matrix4().set(-by, 0, bx, 0, bx, 0, by, 0, 0, 1, 0, 0, 0, 0, 0, 1);
}

// One material per look, shared by every preview (never disposed: there are five).
const look = (color: string, glass = false) =>
  new MeshStandardMaterial({ color, roughness: glass ? 0.1 : 0.65, metalness: 0.05, transparent: glass, opacity: glass ? 0.45 : 1, depthWrite: !glass, side: DoubleSide });
const MATERIAL = {
  printed: look('#e3e1da'),
  molded: look('#3b3e44'),
  pin: look('#b9bdc3'),
  crown: look('#b9d6f2', true),
  flint: look('#93b2e6', true),
  mirror: new MeshStandardMaterial({ color: '#d6dbe2', roughness: 0.15, metalness: 0.8, side: DoubleSide }),
};

/** The halves are cut in slices this thick along the axis. */
const SLICE_MM = 0.25;
const SEGMENTS = 72;

/** A ring across the axis, from z0 to z1: the cartridge's radius outside, a circle of `hole` at (dx, dy) inside. */
function ring(z0: number, z1: number, hole: number, dx: number, dy: number): BufferGeometry {
  const shape = new Shape().absarc(0, 0, CARTRIDGE.radiusMm, 0, Math.PI * 2, false);
  shape.holes.push(new Path().absarc(dx, dy, hole, 0, Math.PI * 2, true));
  return new ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: SEGMENTS }).translate(0, 0, z0);
}

/** One printed half: slices of ring between z0 and z1, merged; slices with the same cavity are one. */
function half(z0: number, z1: number, cavity: (z: number) => number, dx: number, dy: number): BufferGeometry {
  const pieces: BufferGeometry[] = [];
  const steps = Math.max(1, Math.round((z1 - z0) / SLICE_MM));
  let from = z0;
  let r = cavity(z0 + (z1 - z0) / steps / 2);
  for (let k = 1; k <= steps; k++) {
    const at = z0 + ((z1 - z0) * k) / steps;
    const next = k < steps ? cavity(at + (z1 - z0) / steps / 2) : NaN;
    if (k === steps || Math.abs(next - r) > 0.02) {
      // The glass reaches the outside here: no wall in this slice.
      if (Math.hypot(dx, dy) + r < CARTRIDGE.radiusMm - 0.2) pieces.push(ring(from, at, r, dx, dy));
      from = at;
      r = next;
    }
  }
  return mergeGeometries(pieces.map((g) => g.toNonIndexed())) ?? new BufferGeometry();
}

/** A master insert: the 1×1 insert's octagon, with the round seat the printed halves stand in. */
function master(z0: number, z1: number): BufferGeometry {
  const h = CARTRIDGE.masterAcrossMm / 2;
  const c = 8; // the corners' chamfer
  const shape = new Shape([new Vector2(-h + c, -h), new Vector2(h - c, -h), new Vector2(h, -h + c), new Vector2(h, h - c), new Vector2(h - c, h), new Vector2(-h + c, h), new Vector2(-h, h - c), new Vector2(-h, -h + c)]);
  shape.holes.push(new Path().absarc(0, 0, CARTRIDGE.radiusMm + 0.15, 0, Math.PI * 2, true));
  return new ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: SEGMENTS }).translate(0, 0, z0);
}

/** The glass, element by element, turned from its profile about the axis (lathe: about y, so turned onto z). */
function lensElements(shape: OpticShape, p: CartridgeParams, centre: number): BufferGeometry[] {
  const { x, y } = p.part_position_mm;
  const rot = p.part_rotation_deg;
  const d = Math.PI / 180;
  const pose = new Matrix4()
    .makeTranslation(x, y, centre)
    .multiply(new Matrix4().makeRotationZ(rot.z * d))
    .multiply(new Matrix4().makeRotationY(rot.y * d))
    .multiply(new Matrix4().makeRotationX(rot.x * d))
    .multiply(new Matrix4().makeRotationX(Math.PI / 2));
  return shape.elements.map((e) => new LatheGeometry(e.profile.map(([r, z]) => new Vector2(Math.max(r, 1e-4), z)), SEGMENTS).applyMatrix4(pose));
}

const info = (key: string, label: string, role: ComponentRole, source: ComponentSource, code: string): ComponentInfo => ({ key, label, role, source, code });

function component(i: ComponentInfo, title: string, pieces: { geometry: BufferGeometry; material: MeshStandardMaterial }[], toDocument: Matrix4): MeshComponent {
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

/** The cartridge for this lens with these parameters, as components in the document frame (mm, centred on the cube). */
export function cartridgeComponents(p: CartridgeParams, shape: OpticShape, record: CatalogRecord): MeshComponent[] {
  const L = layout(p, shape);
  const M = generatorToDocument(p.beam_axis);
  const { x: dx, y: dy } = p.part_position_mm;
  const cavity = (z: number) => cavityRadius(z, L.centre, shape, p.fit_clearance_mm, L.clearApertureMm);
  const out: MeshComponent[] = [];

  const name = record.vendor?.mpn ?? record.id;
  const glass = lensElements(shape, p, L.centre).map((geometry, i) => ({ geometry, material: i === 0 ? MATERIAL.crown : MATERIAL.flint }));
  out.push(component(info('lens', `Lens ${name}`, 'optic', 'bought', record.id), `Lens ${name}`, glass, M));

  out.push(component(info('cartridge-back', 'Cartridge, back half', 'holder', 'printed', 'lens_cartridge_v4 · back'), 'Cartridge, back half', [{ geometry: half(L.back[0], L.back[1], cavity, dx, dy), material: MATERIAL.printed }], M));
  out.push(component(info('cartridge-front', 'Cartridge, front half', 'holder', 'printed', 'lens_cartridge_v4 · front'), 'Cartridge, front half', [{ geometry: half(L.front[0], L.front[1], cavity, dx, dy), material: MATERIAL.printed }], M));

  if (p.include_master_inserts) {
    L.masters.forEach((m, i) => {
      const notched = m.name === 'master_notched';
      const label = notched ? 'Master insert, notched' : 'Master insert, smooth';
      const title = !notched && L.masters.every((x) => x.name === 'master_smooth') ? `${label} (${i + 1} of 2)` : label;
      out.push(component(info(`${m.name}-${i}`, label, 'holder', 'bought', `${m.name} · molded`), title, [{ geometry: master(m.span[0], m.span[1]), material: MATERIAL.molded }], M));
    });
  }

  for (let i = 0; i < p.alignment_pins; i++) {
    const a = Math.PI / 4 + (i * 2 * Math.PI) / p.alignment_pins;
    const pin = new CylinderGeometry(CARTRIDGE.pinDiameterMm / 2, CARTRIDGE.pinDiameterMm / 2, CARTRIDGE.pinLengthMm, 16)
      .rotateX(Math.PI / 2)
      .translate(CARTRIDGE.pinCircleMm * Math.cos(a), CARTRIDGE.pinCircleMm * Math.sin(a), L.joint);
    out.push(component(info(`pin-${i}`, `Alignment pin Ø${CARTRIDGE.pinDiameterMm}`, 'hardware', 'standard', `Dowel pin Ø${CARTRIDGE.pinDiameterMm} × ${CARTRIDGE.pinLengthMm}`), p.alignment_pins > 1 ? `Alignment pin (${i + 1} of ${p.alignment_pins})` : 'Alignment pin', [{ geometry: pin, material: MATERIAL.pin }], M));
  }
  return out;
}

/** A catalogue lens on its own at the cube centre, its axis along the beam: a candidate shown before it is chosen. */
export function lensComponent(record: CatalogRecord, shape: OpticShape, beam: BeamAxis = '+x'): MeshComponent {
  const p = { ...cartridgeDefaults(record.id), beam_axis: beam };
  const name = record.vendor?.mpn ?? record.id;
  const glass = lensElements(shape, p, 0).map((geometry, i) => ({ geometry, material: i === 0 ? MATERIAL.crown : MATERIAL.flint }));
  return component(info('lens', `Lens ${name}`, 'optic', 'bought', record.id), `Lens ${name}`, glass, generatorToDocument(beam));
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

/** A frozen holder's components, built once per set of parameters and freed when they change; none without a holder. */
export function useHolderComponents(holder: HolderMeshRef | undefined): MeshComponent[] {
  const key = holder ? keyOf(holder) : '';
  const components = useMemo(() => {
    const shape = holder && opticShape(holder.record);
    return holder && shape ? cartridgeComponents(holder.params, shape, holder.record) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt when the holder changes by value
  }, [key]);
  useEffect(() => {
    if (key) built.set(key, components);
    return () => {
      if (built.get(key) === components) built.delete(key);
      disposeComponents(components);
    };
  }, [key, components]);
  return components;
}

/** A frozen holder's component, by key, once drawn. */
export const holderComponentOf = (holder: HolderMeshRef, key: string) => built.get(keyOf(holder))?.find((c) => c.info.key === key);
