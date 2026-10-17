# From the lab to the app

The lab is the UX sandbox. The real app is optikit-app-v1. It uses optikit-core (the service), oc-wasm (the kernel) and optikit-library.

This file tells which lab code is UI, which code is a stand-in, and what replaces each stand-in in the app.

## The rule

| Folder | What it contains | In the app |
| --- | --- | --- |
| `src/components/` | Views, and the pure logic that belongs to the UI | Copy the design. Change the code to use the real design file. |
| `src/ports/` | The interfaces that the views use to get light, parts and service answers | Keep the shape. Give real implementations. |
| `src/standins/kernel/` | Stand-ins for oc-wasm and Optiland: light, traces, optimizer, coatings | Replace with oc-wasm and the service. |
| `src/standins/service/` | Stand-ins for optikit-core: part matching, holder generators, dry runs, BOM | Replace with the service endpoints. |
| `src/standins/library/` | Stand-ins for optikit-library: records, modules, prices, meshes | Replace with the library index and the catalogue. |
| `src/demo/` | Page content only: projects, users, landing, history | Not ported. |

The views and the app (`src/components/`, `src/app/`) get the stand-ins only through `src/ports/`. ESLint enforces this rule (`no-restricted-imports` in `eslint.config.js`). Stories and tests can import stand-ins as data.

`src/standins/StandinsProvider.tsx` is the only place where the stand-ins are connected. The app root (`src/main.tsx`) and Storybook (`.storybook/preview.tsx`) use it. To connect the real implementations, provide them at this one point.

## The ports

### Light (`src/ports/light.ts`) — kernel

| Field | Lab stand-in | App |
| --- | --- | --- |
| `LightFor(design)`: the light paths and the parts that each path meets | `standins/kernel/light.ts`: straight lines on the grid | oc-wasm traces the Scene3 from `POST /v1/scene3` (`loadScene3JSON`, `traceWorld3D`). Paths come from `/v1/sequence`. |

### Library (`src/ports/library.ts`)

| Field | Lab stand-in | App |
| --- | --- | --- |
| `catalogue` | `standins/library/catalog.ts` | `GET /v1/library/index` (records) and `GET /v1/catalog/index` (vendor rows) |
| `record(part)` | `catalogRecord` | The library record. A catalogue row goes through `POST /v1/catalog/import`. |
| `modulesFor(kind)` | `standins/library/modules.ts` | `GET /v1/library/index`, by `category` |
| `palette` | `demoPalette` | `GET /v1/library/index` and `GET /v1/catalog/index` |
| `prices` | `standins/library/prices.ts` | The records' `vendor.price`, and the catalogue rows |
| `meshFor(part)` | `standins/library/meshes.ts` | The index's `assets` (`glb`, `mesh_pose_grid`). The files come from `/v1/library/assets/`. |

### Service (`src/ports/service.ts`)

| Field | Lab stand-in | App |
| --- | --- | --- |
| `choicesFor(part)`: what a sketched part can become, with its cube | `standins/service/choices.ts` | `POST /v1/fit/existing` (modules) and `GET /v1/catalog/index` (parts) |
| `snapCandidates(spec)` | `standins/service/snap.ts` | `GET /v1/catalog/index`; the holder fit from `GET /v1/generators` |
| `bom(design)` | `standins/service/bom.ts` | `POST /v1/export/parts` |

## Waiting and failing

The real calls take time and can fail. The ports are already shaped for that:

- **Service:** every call returns a `Promise`. Views ask through `useRequest` (`src/ports/request.ts`). It drops answers to older questions. It can keep the last answer while a new one comes (`keep`, used for the BOM). It sets `slow` only after 180 ms, so a fast answer does not flash.
- **Library:** the index is loaded once. `Library.status` is `loading`, `ready` or `error`, and `reload()` loads it again. While it loads, the fields are empty.
- **Views:** `Waiting`, `Refreshing` and `Failed` (`src/components/primitives/RequestState.tsx`) show these states the same way everywhere: the BOM panel, Choose parts, the close-up's catalogue list, the Add parts palette and the Commercial tab.

In the lab, the stand-ins answer over a stand-in network (`src/standins/network.ts`). Set it in the address, before the `#`:

| Address | Effect |
| --- | --- |
| (none) | Answers after about 250 ms; the library after about 500 ms |
| `?latency=2500` | Slow answers, to see the waiting states |
| `?fail=1` | Every request fails, to see the error states and Try again |
| `?latency=0` | Answers at once (as Storybook does) |

**Not async yet:** the light (`LightFor`). oc-wasm traces in a worker, so the app needs the last trace while a new one runs. This is the next step.

## Not behind a port yet

These views still import a stand-in directly, because the real call has a different shape. ESLint lists them as exceptions (`STANDIN_DIRECT`).

| View | Stand-in | Why no port yet |
| --- | --- | --- |
| `editor/simulate/SimulatePane.tsx`, `editor/simulate/checks.ts`, `editor/optimize/OptimizePane.tsx`, `analysis/BeamLayout.tsx`, `analysis/Plots.tsx` | `standins/kernel/simulate/*` (beam table, paraxial, real rays, optimizer) | oc-wasm works on a Scene3 in a worker. It gives segments, detector hits and maps (`analysisRays`, `firstDetectorResultJSON`, `lastDetectorMapsF32`), not the lab's beam table. A port can be designed when the app runs the kernel for Simulate (optikit-app-v1 milestone 5). The optimizer is Optiland's on the service, or `fitSingletFace` in oc-wasm. |
| `editor/optics/*`, `editor/scene3d/Closeup.tsx` | `standins/kernel/coatings.ts` | The kernel computes coatings (`surfaceRtF64`, `surfaceCoatingJSON`), but the service does not write coatings into Scene3 yet. See the gaps below. |
| `editor/scene3d/HolderDesigner.tsx`, `holderMesh.ts`, `layout3d.ts`, `Closeup.tsx` | `standins/service/generators.ts`, `cartridge.ts` | The service gives a dry run (`POST /v1/generate/plan`) and meshes (`POST /v1/generate`). The lab draws the cartridge from its parameters. optikit-app-v1 already uses the real calls (`useHolderDesign.ts`). |

## Data formats

The stand-in data uses the library's real format where it can:

- **Filter bands, dichroic cut-ons and splitter ratios** are in a `response` block on the record's surface, as optikit-core's `SurfaceResponse` (`schema/response.py`) writes it: `kind`, `reflect-bands-um`, `transmit-bands-um`, `transmit-ratio`.
- **A module's optic** is the record that the module holds, written `component: '<record id>@<range>'`, as the library index's `component.ref`.

These are lab inventions. They are not in the real format:

- `Schematic` (grid symbols, `SymbolKind`, `Placement`) is the lab's model. The app works on `optikit-design.yml` (`DesignDecl`). `CATEGORY_OF` in `model.ts` maps a lab kind to the file's `category`.
- `Placement.state: 'ideal'` is the sketch state. In optikit-app-v1, a sketched part is a primitive with only `optics`.
- `seat` on a sketched or unmounted part is the lab's turn. In the file, this is the part's grid rotation.
- `ModuleOption.fixes` is the lab's short way to tell what a module's optic is. The app reads this from the record that the module holds.
- Inputs as sliders (`SymbolParam`) are the lab's. The app uses the module's `inputs` (`InputSpec`).

## Gaps in the service and the library

The lab shows these features, but the service does not support them yet. They are for optikit-v2 (Ethan, Bene):

1. **Coatings in the trace.** The design schema has no coating stacks. The service does not write coatings into Scene3 v3, so the kernel's thin-film coatings are not used.
2. **Polarizers and retarders.** They are not in `KNOWN_CATEGORIES`. `polarization-deg` is declared but not traced.
3. **Matching by band or ratio.** `POST /v1/fit/existing` matches by part number, prescription, or focal length and diameter. It does not compare a filter's band or a splitter's ratio.
4. **The fit for the canvas.** `POST /v1/fit` reads only an imported Optiland or Zemax file, not the parts on the canvas.
5. **"In a cube, holder later".** The design format has no state for a part in a cube with no holder.
