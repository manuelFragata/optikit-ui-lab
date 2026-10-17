/**
 * STAND-IN for the library: its modules (a part in its own cube), as the
 * Add list shows them and as a part can be realized. In the app they come
 * from the service (GET /v1/library/index): each module's category, the
 * optics record it holds (`component.ref`), its inputs and its mesh.
 *
 * `fixes` is the lab's shorthand for what the module's optic is (a lens
 * holder's focal length); the app reads it off the record it holds.
 */
import type { ModuleOption, SymbolKind } from '../../components/editor/model';
import type { PaletteGroup } from '../../ports/library';

/** Existing modules a part of each kind can be realized as (swapped for). */
export const demoModules: Record<SymbolKind, ModuleOption[]> = {
  laser: [
    { module: 'Laser 488 module', source: 'openUC2 Fluor Box', version: '1.1.0', fixes: { Wavelength: 488 } },
    { module: 'Laser cube 520 nm', source: 'openUC2 Q Box', fixes: { Wavelength: 520 } },
  ],
  mirror: [
    { module: 'Mirror cube 45°', source: 'openUC2 Core Box', version: '2.0.1' },
    { module: 'Kinematic mirror cube', source: 'openUC2 Q Box' },
  ],
  dichroic: [{ module: 'Dichroic holder', source: 'openUC2 Fluor Box', version: '1.2.0', component: 'thorlabs.dichroic.dmlp505@*', fixes: { 'Cut-on wavelength': 505 } }],
  lens: [
    { module: 'Lens holder, f = 50', source: 'openUC2 Core Box', version: '1.4.0', component: 'thorlabs.lens.la1131-a@*', fixes: { 'Focal length': 50 } },
    { module: 'Lens holder, f = 100', source: 'openUC2 Core Box', version: '1.4.0', component: 'thorlabs.lens.la1509-a@*', fixes: { 'Focal length': 100 } },
  ],
  objective: [{ module: 'RMS objective insert', source: 'openUC2 Core Box', version: '2.3.0' }],
  camera: [{ module: 'IMX477 camera', source: 'openUC2 Core Box', version: '1.0.4' }],
  filter: [{ module: 'Emission filter cube 520/40', source: 'openUC2 Fluor Box', version: '1.0.2', component: 'thorlabs.filter.fbh520-40@*', fixes: { 'Centre wavelength': 520, Bandwidth: 40 } }],
  beamsplitter: [{ module: 'Beam splitter cube 50:50', source: 'openUC2 Core Box', version: '1.1.0', component: 'thorlabs.beamsplitter.bs013@*', fixes: { Reflectance: 50 } }],
  aperture: [{ module: 'Iris cube', source: 'openUC2 Core Box', version: '1.0.0' }],
};

/** The modules and parts the library lists for placing, by box or vendor. */
export const demoPalette: PaletteGroup[] = [
  {
    id: 'core',
    label: 'openUC2 Core Box',
    count: 6,
    mount: 'mounted',
    entries: [
      { id: 'bs', label: 'Beam splitter cube', kind: 'beamsplitter' },
      { id: 'mirror', label: 'Mirror cube 45°', kind: 'mirror' },
      { id: 'lens50', label: 'Lens holder, f = 50', kind: 'lens' },
      { id: 'rms', label: 'RMS objective insert', kind: 'objective' },
      { id: 'xyz', label: 'xyz-stage', kind: 'objective' },
      { id: 'cam', label: 'IMX477 camera', kind: 'camera' },
    ],
  },
  {
    id: 'fluor',
    label: 'openUC2 Fluor Box',
    count: 3,
    mount: 'mounted',
    entries: [
      { id: 'dichroic', label: 'Dichroic holder', kind: 'dichroic' },
      { id: 'emfilter', label: 'Emission filter slot', kind: 'filter' },
      { id: 'laser488', label: 'Laser 488 module', kind: 'laser' },
    ],
  },
  {
    id: 'thorlabs',
    label: 'Thorlabs parts',
    count: 62,
    mount: 'unmounted',
    entries: [
      { id: 'ac254', label: 'AC254-050-A achromat', kind: 'lens' },
      { id: 'dmlp505', label: 'DMLP505 dichroic', kind: 'dichroic' },
      { id: 'md498', label: 'MD498 filter set', kind: 'filter' },
    ],
  },
];
