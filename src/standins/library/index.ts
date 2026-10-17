/** The lab's library: the stand-in records, modules, prices and meshes behind the `Library` port. */
import type { Library } from '../../ports/library';
import { catalogList, catalogRecord } from './catalog';
import { meshForPart } from './meshes';
import { demoModules, demoPalette } from './modules';
import { demoPrices } from './prices';

/** The library once its index has loaded. */
export const standinLibrary: Library = {
  status: { state: 'ready' },
  reload: () => {},
  catalogue: catalogList,
  record: catalogRecord,
  modulesFor: (kind) => demoModules[kind],
  palette: demoPalette,
  prices: demoPrices,
  meshFor: meshForPart,
};
