/** The lab's service: the stand-in matching and BOM behind the `Service` port, over a library. */
import type { Library } from '../../ports/library';
import type { Service } from '../../ports/service';
import { buildBom } from './bom';
import { choicesFor } from './choices';
import { snapCandidates } from './snap';

export const standinService = (library: Library): Service => ({
  choicesFor: (s) => choicesFor(s, library.catalogue, library.modulesFor),
  snapCandidates: (spec) => snapCandidates(spec, library.catalogue),
  bom: (design) => buildBom(design, library.prices),
});
