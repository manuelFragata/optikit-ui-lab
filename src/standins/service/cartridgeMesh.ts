/**
 * STAND-IN for the service's holder meshes (POST /v1/generate, a GLB from
 * CadQuery): the V4 lens cartridge drawn from its parameters, as a preview
 * true to the dimensions of optikit-v2's output. The halves are the cylinder
 * minus the cavity, built as thin slices (the cavity follows the lens, and
 * may sit off the axis, so it is not one turned profile); the lens is turned
 * from its prescription.
 *
 * Everything is built in the generator's frame (optical axis z) and then
 * turned into the document's, with the beam along `beam_axis`.
 */
import { BufferGeometry, CylinderGeometry, ExtrudeGeometry, LatheGeometry, Matrix4, Path, Shape, Vector2 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CatalogRecord, OpticShape } from '../../components/editor/holders/optic';
import { component, info, MATERIAL, SEGMENTS } from '../../components/editor/scene3d/holderMesh';
import type { MeshComponent } from '../../components/editor/scene3d/meshes';
import { CARTRIDGE, cavityRadius, layout, type BeamAxis, type CartridgeParams } from './cartridge';

const AXIS: Record<BeamAxis, [number, number, number]> = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0] };

/** Generator frame → document frame: z along the beam, y up, x = y × z. */
export function generatorToDocument(beam: BeamAxis): Matrix4 {
  const [bx, by] = AXIS[beam];
  // sideways = up × beam
  return new Matrix4().set(-by, 0, bx, 0, bx, 0, by, 0, 0, 1, 0, 0, 0, 0, 0, 1);
}

/** The halves are cut in slices this thick along the axis. */
const SLICE_MM = 0.25;

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
  const shape = new Shape([
    new Vector2(-h + c, -h),
    new Vector2(h - c, -h),
    new Vector2(h, -h + c),
    new Vector2(h, h - c),
    new Vector2(h - c, h),
    new Vector2(-h + c, h),
    new Vector2(-h, h - c),
    new Vector2(-h, -h + c),
  ]);
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
  return shape.elements.map((e) =>
    new LatheGeometry(
      e.profile.map(([r, z]) => new Vector2(Math.max(r, 1e-4), z)),
      SEGMENTS,
    ).applyMatrix4(pose),
  );
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

  out.push(
    component(
      info('cartridge-back', 'Cartridge, back half', 'holder', 'printed', 'lens_cartridge_v4 · back'),
      'Cartridge, back half',
      [{ geometry: half(L.back[0], L.back[1], cavity, dx, dy), material: MATERIAL.printed }],
      M,
    ),
  );
  out.push(
    component(
      info('cartridge-front', 'Cartridge, front half', 'holder', 'printed', 'lens_cartridge_v4 · front'),
      'Cartridge, front half',
      [{ geometry: half(L.front[0], L.front[1], cavity, dx, dy), material: MATERIAL.printed }],
      M,
    ),
  );

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
    out.push(
      component(
        info(`pin-${i}`, `Alignment pin Ø${CARTRIDGE.pinDiameterMm}`, 'hardware', 'standard', `Dowel pin Ø${CARTRIDGE.pinDiameterMm} × ${CARTRIDGE.pinLengthMm}`),
        p.alignment_pins > 1 ? `Alignment pin (${i + 1} of ${p.alignment_pins})` : 'Alignment pin',
        [{ geometry: pin, material: MATERIAL.pin }],
        M,
      ),
    );
  }
  return out;
}
