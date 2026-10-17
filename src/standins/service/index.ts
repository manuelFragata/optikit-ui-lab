/** The lab's service: the stand-in matching and BOM behind the `Service` port, over a library, each answer over the stand-in network. */
import type { Library } from '../../ports/library';
import type { Service } from '../../ports/service';
import { NO_NETWORK, overNetwork, type Network } from '../network';
import { buildBom } from './bom';
import { choicesFor } from './choices';
import { snapCandidates } from './snap';

export const standinService = (library: Library, net: Network = NO_NETWORK): Service => ({
  choicesFor: (s) => overNetwork(net, 'the choices', () => choicesFor(s, library.catalogue, library.modulesFor)),
  snapCandidates: (spec) => overNetwork(net, 'the catalogue parts', () => snapCandidates(spec, library.catalogue)),
  bom: (design) => overNetwork(net, 'the parts list', () => buildBom(design, library.prices)),
});
