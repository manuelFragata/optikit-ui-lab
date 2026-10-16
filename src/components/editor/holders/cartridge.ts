/**
 * The V4 lens cartridge (optikit-v2 `generators/lens_cartridge_v4.py`, on
 * openuc2-cadquery's `uc2v4.lens_cartridge`): two printed halves around the
 * lens, seated in two molded master inserts that stand in the cube's notches.
 *
 * Here: its parameters (the generator's names and defaults, so a frozen
 * holder's params can go to `POST /v1/generate` as they are), where its
 * bodies go, the cavity it cuts, and a dry run shaped as
 * `POST /v1/generate/plan` answers, with the checks the service makes and
 * the beam checks its wizard does not show yet. Pure numbers; the meshes are
 * holderMesh.ts. The real solids come from CadQuery on the service: this is a
 * preview, true to the dimensions of v2's own output.
 *
 * Frame: the optical axis is z, the origin the cube centre (the generator's
 * frame). `part_position_mm.x` is sideways across the beam, `.y` up.
 */
import type { OpticShape } from './optic';

export type BeamAxis = '+x' | '-x' | '+y' | '-y';

/** lens_cartridge_v4's parameters, by their names in its params.json. */
export interface CartridgeParams {
  /** The lens as its record: the service inlines the surface stack. */
  part_prescription: { component: string };
  beam_axis: BeamAxis;
  /** Which lens point `part_position_mm` gives. */
  reference: 'center' | 'front_vertex' | 'back_vertex';
  /** The lens from the cube centre: x, y across the beam (±20), z along it (±25). */
  part_position_mm: { x: number; y: number; z: number };
  /** Tilt about the lens's own axes (x, y ±90; z ±180). */
  part_rotation_deg: { x: number; y: number; z: number };
  /** Clear aperture Ø; the generator defaults it to 90 % of the lens. */
  clear_aperture_mm?: number;
  fit_clearance_mm: number;
  /** Snap the notched master to the cube's 5 mm grid; off: two smooth inserts, the joint exactly at z. */
  snap_to_notch: boolean;
  alignment_pins: number;
  include_master_inserts: boolean;
}

export const cartridgeDefaults = (component: string): CartridgeParams => ({
  part_prescription: { component },
  beam_axis: '+x',
  reference: 'center',
  part_position_mm: { x: 0, y: 0, z: 0 },
  part_rotation_deg: { x: 0, y: 0, z: 0 },
  fit_clearance_mm: 0.15,
  snap_to_notch: true,
  alignment_pins: 2,
  include_master_inserts: true,
});

/** The cube and the cartridge in numbers: uc2v4 `CartridgeParams`, `CubeInterface`, the cube template's `limits`, and v2's output. */
export const CARTRIDGE = {
  masterThicknessMm: 4.0,
  /** Across the flats of the master inserts (and every 1×1 insert). */
  masterAcrossMm: 49.4,
  /** The printed halves' radius, as v2's output measures. */
  radiusMm: 20.05,
  /** How far the halves reach past the glass on the axis. */
  lipMm: 1.0,
  minWallMm: 0.8,
  pinDiameterMm: 2.0,
  pinCircleMm: 16.5,
  pinLengthMm: 6,
  notchPitchMm: 5,
  /** The joint between the master pair stays within this of the cube centre. */
  jointLimitMm: 13,
  /** The printed pair takes up this much between the joint and the lens centre. */
  pairAbsorbsMm: 4,
  /** A round body may reach this far from the axis (the template's `round_radius_mm`). */
  roundRadiusMm: 19.2,
  /** Half the cube along the beam. */
  halfCubeMm: 25,
} as const;

/** The planes the master pair can meet at, snapped: 5 mm notches ± half a master (−13 … 13). */
export const JOINT_PLANES = [-13, -12, -8, -7, -3, -2, 2, 3, 7, 8, 12, 13];

/** The clear aperture the cartridge bores: as given, else 90 % of the lens. */
export const clearAperture = (p: CartridgeParams, shape: OpticShape) => p.clear_aperture_mm ?? 0.9 * 2 * shape.semiMm;

/** The lens centre on the axis, whichever point the position gives. */
export function lensCentre(p: CartridgeParams, shape: OpticShape): number {
  const z = p.part_position_mm.z;
  if (p.reference === 'front_vertex') return z - shape.vertices[0];
  if (p.reference === 'back_vertex') return z - shape.vertices[shape.vertices.length - 1];
  return z;
}

/** The plane the masters meet at: the nearest snapped one, or the lens centre itself when not snapped. */
export function jointFor(centre: number, snap: boolean): number {
  if (!snap) return Math.max(-CARTRIDGE.jointLimitMm, Math.min(CARTRIDGE.jointLimitMm, centre));
  return JOINT_PLANES.reduce((best, j) => (Math.abs(j - centre) < Math.abs(best - centre) ? j : best));
}

/** Which way from the joint the notched master lies: it holds the notch (a multiple of 5) half a master away. */
export const notchedSide = (joint: number): 1 | -1 => (Math.abs(((joint + 2) % 5) + 5) % 5 === 0 ? 1 : -1);

/** The lens's widest axial reach once tilted, mm: half its thickness plus what the tilt swings its rim. */
const tiltSwing = (p: CartridgeParams, shape: OpticShape) => shape.semiMm * Math.sin((Math.max(Math.abs(p.part_rotation_deg.x), Math.abs(p.part_rotation_deg.y)) * Math.PI) / 180);

export interface CartridgeLayout {
  centre: number;
  joint: number;
  /** The glass on the axis, tilt included. */
  lens: [number, number];
  /** The printed halves: back below the joint, front above. */
  back: [number, number];
  front: [number, number];
  /** The master inserts: [notched, smooth] (both smooth when not snapped). */
  masters: { name: 'master_notched' | 'master_smooth'; span: [number, number] }[];
  clearApertureMm: number;
  /** The lens's distance from the axis. */
  decentreMm: number;
}

export function layout(p: CartridgeParams, shape: OpticShape): CartridgeLayout {
  const c = lensCentre(p, shape);
  const joint = jointFor(c, p.snap_to_notch);
  const swing = tiltSwing(p, shape);
  const lens: [number, number] = [c + Math.min(shape.front(0), shape.front(shape.semiMm)) - swing, c + Math.max(shape.back(0), shape.back(shape.semiMm)) + swing];
  const M = CARTRIDGE.masterThicknessMm;
  const lo = Math.min(lens[0] - CARTRIDGE.lipMm, joint - M - 0.2);
  const hi = Math.max(lens[1] + CARTRIDGE.lipMm, joint + M + 0.2);
  const side = notchedSide(joint);
  const above: [number, number] = [joint, joint + M];
  const below: [number, number] = [joint - M, joint];
  const masters: CartridgeLayout['masters'] = p.snap_to_notch
    ? [
        { name: 'master_notched', span: side > 0 ? above : below },
        { name: 'master_smooth', span: side > 0 ? below : above },
      ]
    : [
        { name: 'master_smooth', span: below },
        { name: 'master_smooth', span: above },
      ];
  return { centre: c, joint, lens, back: [lo, joint], front: [joint, hi], masters, clearApertureMm: clearAperture(p, shape), decentreMm: Math.hypot(p.part_position_mm.x, p.part_position_mm.y) };
}

/**
 * The cavity's radius at a point on the axis (about the lens's own axis): the
 * glass there plus the fit clearance, never less than the clear-aperture
 * bore. The halves are the cylinder minus this.
 */
export function cavityRadius(z: number, centre: number, shape: OpticShape, fitMm: number, boreMm: number, steps = 48): number {
  const zz = z - centre;
  let glass = 0;
  for (let k = steps; k >= 0; k--) {
    const r = (shape.semiMm * k) / steps;
    if (shape.front(r) - fitMm <= zz && zz <= shape.back(r) + fitMm) {
      glass = r + fitMm;
      break;
    }
  }
  return Math.max(glass, boreMm / 2);
}

/* ---------------------------------------------------------------------- */
/* The dry run                                                              */
/* ---------------------------------------------------------------------- */

export interface Check {
  /** Stable: the service's codes where it has one (`DRC_APERTURE`, `DRC_BEAM_CLIPPED`), else the lab's (`E_…`, `W_…`). */
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

/** One body in the plan, as `/v1/generate/plan` lists them. */
export interface PlanBody {
  name: string;
  outline: 'round' | 'octagon' | 'lens';
  axis: BeamAxis;
  extent_mm: [number, number];
  radius_mm: number;
  held: boolean;
}

/** As `POST /v1/generate/plan` answers (`plan`), plus every check with its code and severity. */
export interface CartridgePlan {
  fits: boolean;
  reasons: string[];
  warnings: string[];
  joint_mm: number;
  beam_axis: BeamAxis;
  bodies: PlanBody[];
  /** The bounding box of all the bodies, and whether it fits one 50 mm cell (`meta.fits_envelope`). */
  bbox_mm: { size: [number, number, number] };
  fits_envelope: boolean;
  checks: Check[];
}

const mm = (n: number) => `${n.toFixed(1)} mm`;

/** The dry run: will the cartridge build, and will the light get through. `beamMm`: the beam's Ø at the lens (the wizard's own check, not a generator input). */
export function planCartridge(p: CartridgeParams, shape: OpticShape, beamMm: number): CartridgePlan {
  const L = layout(p, shape);
  const checks: Check[] = [];
  const add = (code: string, severity: Check['severity'], message: string) => checks.push({ code, severity, message });
  const ca = L.clearApertureMm;
  const D = 2 * shape.semiMm;

  // What the generator refuses.
  if (ca >= D) add('E_CLEAR_APERTURE', 'error', `The clear aperture (${mm(ca)}) must be smaller than the lens (${mm(D)}): the halves need a rim to hold it.`);
  const reach = L.decentreMm + shape.semiMm + p.fit_clearance_mm + CARTRIDGE.minWallMm;
  if (reach > CARTRIDGE.roundRadiusMm) {
    add('E_RADIAL', 'error', `The lens and its wall reach ${mm(reach)} from the axis; the cube leaves ${mm(CARTRIDGE.roundRadiusMm)}.`);
  }
  if (Math.abs(L.centre - L.joint) > CARTRIDGE.pairAbsorbsMm + 1e-6) {
    add('E_JOINT', 'error', `The lens centre is ${mm(Math.abs(L.centre))} from the cube centre; the master pair meets within ±${CARTRIDGE.jointLimitMm} mm and the printed pair takes up ${CARTRIDGE.pairAbsorbsMm} mm more.`);
  }
  const ends = [L.back[0], L.front[1]];
  const face = CARTRIDGE.halfCubeMm - CARTRIDGE.minWallMm;
  if (Math.max(...ends.map(Math.abs)) > face) add('E_FACE', 'error', `The cartridge reaches ${mm(Math.max(...ends.map(Math.abs)))} along the beam; the cube's faces are at ±${CARTRIDGE.halfCubeMm} mm.`);

  // What the generator warns about.
  if (L.lens[1] < L.joint || L.lens[0] > L.joint) add('W_ONE_HALF', 'warning', 'The lens sits wholly in one half: the other only clamps it. Move it towards the joint, or turn snapping off.');
  const tilt = Math.max(Math.abs(p.part_rotation_deg.x), Math.abs(p.part_rotation_deg.y));
  if (tilt > 60) add('W_TILT', 'warning', `Tilted ${tilt.toFixed(0)}°: the cartridge is tested to 60°.`);
  else if (tilt > 0.5) add('W_TILT', 'info', `Tilted ${tilt.toFixed(1)}° off the beam: the cavity is cut tilted (the preview draws it square).`);
  const pinsReach = CARTRIDGE.pinCircleMm - CARTRIDGE.pinDiameterMm / 2;
  const cavityAtJoint = cavityRadius(L.joint, L.centre, shape, p.fit_clearance_mm, ca) + L.decentreMm;
  if (p.alignment_pins > 0 && pinsReach < cavityAtJoint + CARTRIDGE.minWallMm) add('W_PINS', 'warning', `The alignment pins (on a ${CARTRIDGE.pinCircleMm} mm circle) cut into the cavity at the joint.`);

  // The light: the service's pose checks, which its wizard does not show yet.
  const caR = ca / 2;
  const beamR = beamMm / 2;
  if (L.decentreMm >= caR) add('DRC_APERTURE', 'error', `The lens is ${mm(L.decentreMm)} off the beam, past its clear aperture (Ø${ca.toFixed(1)}): the beam misses it.`);
  else if (L.decentreMm + beamR > caR) add('DRC_BEAM_CLIPPED', 'warning', `A Ø${beamMm} beam clips the clear aperture by ${mm(L.decentreMm + beamR - caR)}${L.decentreMm > 0 ? `, with the lens ${mm(L.decentreMm)} off the beam` : ''}.`);
  else add('BEAM_CLEAR', 'info', `A Ø${beamMm} beam clears the aperture by ${mm(caR - L.decentreMm - beamR)}.`);

  const span = Math.max(...ends) - Math.min(...ends, ...L.masters.map((m) => m.span[0]));
  const across = p.include_master_inserts ? CARTRIDGE.masterAcrossMm : 2 * CARTRIDGE.radiusMm;
  const fitsEnvelope = span <= 50 && across <= 50;
  add('JOINT', 'info', p.snap_to_notch ? `The master pair meets at ${L.joint >= 0 ? '+' : ''}${L.joint} mm, the notched one on the ${notchedSide(L.joint) > 0 ? 'far' : 'near'} side.` : `Not snapped: two smooth masters meet at the lens centre.`);

  const errors = checks.filter((c) => c.severity === 'error');
  const bodies: PlanBody[] = [
    { name: 'back', outline: 'round', axis: p.beam_axis, extent_mm: L.back, radius_mm: CARTRIDGE.radiusMm, held: true },
    { name: 'front', outline: 'round', axis: p.beam_axis, extent_mm: L.front, radius_mm: CARTRIDGE.radiusMm, held: true },
    ...(p.include_master_inserts ? L.masters.map((m) => ({ name: m.name, outline: 'octagon' as const, axis: p.beam_axis, extent_mm: m.span, radius_mm: CARTRIDGE.masterAcrossMm / 2, held: false })) : []),
    { name: 'lens', outline: 'lens', axis: p.beam_axis, extent_mm: L.lens, radius_mm: shape.semiMm, held: true },
  ];
  return {
    fits: errors.length === 0,
    reasons: errors.map((c) => c.message),
    warnings: checks.filter((c) => c.severity === 'warning').map((c) => c.message),
    joint_mm: L.joint,
    beam_axis: p.beam_axis,
    bodies,
    bbox_mm: { size: [span, across, across] },
    fits_envelope: fitsEnvelope,
    checks,
  };
}
