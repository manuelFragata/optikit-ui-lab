/**
 * Which mesh each module has, for the editor's 3D view. In optikit-v2 this
 * comes from the library index (`glbUrl`, `meshPoseGrid`); here it is a small
 * table over the openUC2 store's GLBs. Modules not listed have no mesh and
 * show as a labelled box.
 *
 * `axes`: where the module's local z and x point at seat 0, for a part whose
 * light runs along +x (the editor's default), as in the landing assemblies.
 */
import type { MeshRef } from '../components/editor/scene3d/layout3d';
import type { SchematicSymbol } from '../components/editor/model';
import { STORE_MESHES as M } from './assemblies';
import { catalogRecord } from './catalogParts';
import { recordOf } from '../components/editor/holders/designs';
import type { CartridgeParams } from '../components/editor/holders/cartridge';

const alongX = { z: '+x', x: '+y' } as const;

export const moduleMeshes: Record<string, MeshRef> = {
  'Laser 488 module': { url: M.laser, axes: { z: '+z', x: '+y' } },
  'Laser cube 520 nm': { url: M.laser, axes: { z: '+z', x: '+y' } },
  'Mirror cube 45°': { url: M.mirror, axes: { z: '-z', x: '-x' } },
  'Kinematic mirror cube': { url: M.mirror, axes: { z: '-z', x: '-x' } },
  'Dichroic holder': { url: M.dichroic488, axes: { z: '+z', x: '+y' } },
  'Beam splitter cube': { url: M.dichroic532, axes: { z: '+z', x: '+y' } },
  'Lens holder, f = 50': { url: M.lens50, axes: alongX },
  'Lens holder, f = 100': { url: M.lens100, axes: alongX },
  'RMS objective insert': { url: M.rms, axes: alongX },
  'IMX477 camera': { url: M.camera, axes: { z: '-x', x: '+y' } },
};

/** The mesh of a part's module, if there is one; a holder frozen here is drawn in the store's empty cube, from its parameters. */
export function meshForPart(s: SchematicSymbol): MeshRef | undefined {
  const p = s.placement;
  if (p.state !== 'in-cube') return undefined;
  const record = p.holder?.generator === 'lens_cartridge_v4' ? recordOf(s, catalogRecord) : undefined;
  if (p.holder && record) return { url: M.empty, axes: { z: '+z', x: '+x' }, holder: { params: p.holder.params as unknown as CartridgeParams, record } };
  return moduleMeshes[p.module];
}
