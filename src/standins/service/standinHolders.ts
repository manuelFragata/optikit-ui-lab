/**
 * STAND-IN for the holder port (src/ports/holders.ts): the generators' `holds`
 * blocks (./generators.ts), the V4 lens cartridge's dry run (./cartridge.ts)
 * and its drawing (./cartridgeMesh.ts), answered over the stand-in network
 * as optikit-core would answer `GET /v1/generators`, `POST /v1/generate/plan`
 * and `POST /v1/generate`.
 */
import { opticShape, type CatalogRecord } from '../../components/editor/holders/optic';
import type { Holders } from '../../ports/holders';
import { overNetwork, type Network } from '../network';
import { cartridgeDefaults, planCartridge } from './cartridge';
import { cartridgeComponents } from './cartridgeMesh';
import { roadsFor } from './generators';

const shapeOf = (record: CatalogRecord) => {
  const shape = opticShape(record);
  if (!shape) throw new Error('This optic has no shape a holder can be cut for.');
  return shape;
};

export const standinHolders = (net: Network): Holders => ({
  roads: ({ optic, component }) => overNetwork(net, 'the holder generators', () => ({ roads: roadsFor(optic), defaults: cartridgeDefaults(component) })),
  plan: ({ params, record, beamMm }) => overNetwork(net, 'the dry run', () => planCartridge(params, shapeOf(record), beamMm)),
  mesh: ({ params, record }) => overNetwork(net, 'the holder', () => cartridgeComponents(params, shapeOf(record), record)),
});
