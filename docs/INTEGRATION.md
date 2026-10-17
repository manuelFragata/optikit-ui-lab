# From the lab to the app

The lab is the UX sandbox. The real app is optikit-app-v1. It uses optikit-core (the service), oc-wasm (the kernel) and optikit-library.

This file tells which lab code is UI, which code is a stand-in, and what replaces each stand-in in the app.

## The rule

| Folder | What it contains | In the app |
| --- | --- | --- |
| `src/components/` | Views, and the pure logic that belongs to the UI | Copy the design. Change the code to use the real design file. |
| `src/ports/` | The interfaces that the views use to get light, analysis, coatings, holders, parts and service answers | Keep the shape. Give real implementations. |
| `src/standins/kernel/` | Stand-ins for oc-wasm: light, traces, optimizer, coatings | Replace with oc-wasm, in the page. |
| `src/standins/service/` | Stand-ins for optikit-core: part matching, holder generators, dry runs, BOM | Replace with the service endpoints. |
| `src/standins/library/` | Stand-ins for optikit-library: records, modules, prices, meshes | Replace with the library index and the catalogue. |
| `src/demo/` | Page content only: projects, users, landing, history | Not ported. |

The views and the app (`src/components/`, `src/app/`) get the stand-ins only through `src/ports/`, with no exceptions. ESLint enforces this rule (`no-restricted-imports` in `eslint.config.js`). Stories and tests can import stand-ins as data.

`src/standins/StandinsProvider.tsx` is the only place where the stand-ins are connected. The app root (`src/main.tsx`) and Storybook (`.storybook/preview.tsx`) use it. To connect the real implementations, provide them at this one point.

## The ports

### Light (`src/ports/light.ts`) — kernel

| Field | Lab stand-in | App |
| --- | --- | --- |
| `LightFor(design)`: the light paths and the parts that each path meets, at once | `standins/kernel/light.ts`: straight lines on the grid | oc-wasm traces the Scene3 in the page (`loadScene3JSON`, `traceWorld3D`). Paths come from `/v1/sequence`. See "Optics in the page" below for what this needs. |

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

### Analysis (`src/ports/analysis.ts`) — kernel

What Simulate and Optimize show, as results. The views do not trace and do not read a beam table: they ask for numbers and curves, and the UI reads them (`editor/simulate/checks.ts` gives the tones, the notes, and the Estimate marks).

| Call | Lab stand-in | App |
| --- | --- | --- |
| `places({design, light, settings})`: each place where light is read (a detector, the sample, an open end), with its raw numbers (RMS spot, best focus, Airy radius, collimation, fullest aperture, rays stopped, transmission) and what was assumed | `standins/kernel/simulate/standinAnalysis.ts`, on the lab's beam table and real rays | oc-wasm's detector hits for the Scene3 (`analysisRays`, `firstDetectorResultJSON`), read per detector |
| `detail({…, place, of})`: one analysis in full: spot points, ray fan, RMS through focus, aperture fill, transmission curve | the same | oc-wasm: hits at a plane, a fan, a focus sweep; the coatings for the curve |
| `setup({design, light, place})`: the objectives and the variables that a place offers | the lab's optimizer (`optimize.ts`) | oc-wasm (its merit functions; `fitSingletFace` is the first) |
| `view({…, objective})`: the objective's value now, the beam envelope, the spot at the plane | the lab's paraxial trace and real rays | oc-wasm |
| `run({…, variables}, onStep)`: a job. `onStep` gets the best so far after each step; `done` gives the new values, the objective before and after (and after each step), the design with the values applied, and the proposed view; `stop()` ends it with the best so far | the lab's bounded coordinate search, in a Web Worker (`optimizeWorker.ts`) | oc-wasm's optimizer loop, in a Web Worker with its own oc-wasm instance |

The numbers are geometric, on axis, at one wavelength. The pane says so in its header.

### Coatings (`src/ports/coatings.ts`) — kernel

| Call | Lab stand-in | App |
| --- | --- | --- |
| `catalogue`: the coatings that a designed optic can take | `standins/kernel/coatings.ts` (`COATINGS`) | The service's coating list |
| `of({optic, wavelengths})`: each surface's role and coating, its reflectance curve and values at the design's wavelengths, what the optic passes, the checks | the lab's thin-film model (`opticLight`) | oc-wasm (`surfaceRtF64`, `surfaceCoatingJSON`), when the service writes coatings into Scene3. See the gaps below. |

### Holders (`src/ports/holders.ts`) — service

| Call | Lab stand-in | App |
| --- | --- | --- |
| `roads({optic, component})`: each generator with its refusal, and the lens cartridge's start parameters | `standins/service/generators.ts` (the `holds` blocks as in optikit-v2) | `GET /v1/generators` |
| `plan({params, record, beamMm})`: the dry run and its checks | `standins/service/cartridge.ts` | `POST /v1/generate/plan` |
| `mesh({params, record})`: the holder with its optic, as mesh components | `standins/service/cartridgeMesh.ts` draws the V4 cartridge from its parameters | `POST /v1/generate` (the GLB, loaded like a module mesh). optikit-app-v1 already uses the real calls (`useHolderDesign.ts`). |

### Build notes (`src/ports/build.ts`)

What the stand-ins do differently from the app, in words: the light, the catalogue and prices, the holder previews, sign-in, the network. Settings shows them once, under "This build", so the screens themselves use product wording. The app gives no notes, and the section does not show.

## Optics in the page

The light, the analysis, the coatings and the optimizer run on the person's computer, in the page. Only the service calls (library, parts, prices, BOM, holders) go over the network.

- **Light, analysis, coatings: synchronous.** The calls return their answer at once, and throw when they cannot answer. The views work them out in render (`answer()` in `src/ports/request.ts` turns a throw into an error in words). Thus every edit, and every drag, shows its light and its numbers in the same frame. For this, oc-wasm must trace on the main thread in a few milliseconds (a frame is 16 ms), and the Scene3 must be built or patched in the page, with no round trip to `POST /v1/scene3` for each change.
- **Optimizer: in a worker.** A run is hundreds or thousands of traces, so it takes seconds. It runs in a Web Worker: the page stays free. The pane draws the best so far after each step (the envelope and the spot, the objective's curve), and **Stop** keeps it. A change to the design or to the question stops the run. One worker uses one core; wasm threads on more cores need the page served cross-origin isolated (COOP/COEP headers).

## Waiting and failing

The service's calls take time and can fail. The ports are already shaped for that:

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

- **Holders:** every call returns a `Promise`. A frozen holder's mesh comes in time, and the last one stays while a new one is made.
- **Light, analysis, coatings:** no wait (see "Optics in the page"). `useLight` (`src/ports/light.ts`) shares one trace per design between the views that draw it. A design that cannot be traced shows no light, and the status bar says so.

## Data formats

The stand-in data uses the library's real format where it can:

- **Filter bands, dichroic cut-ons and splitter ratios** are in a `response` block on the record's surface, as optikit-core's `SurfaceResponse` (`schema/response.py`) writes it: `kind`, `reflect-bands-um`, `transmit-bands-um`, `transmit-ratio`.
- **A module's optic** is the record that the module holds, written `component: '<record id>@<range>'`, as the library index's `component.ref`.

These are lab inventions. They are not in the real format:

- `Schematic` (grid symbols, `SymbolKind`, `Placement`) is the lab's model. The app works on `optikit-design.yml` (`DesignDecl`). `CATEGORY_OF` in `model.ts` maps a lab kind to the file's `category`.
- **Light paths are not in the lab design.** The stand-in tracer finds them from the parts (each source, beam splitters both ways, the sample shining back when lit through the objective) and names them from start to end. The real format names `paths: {name: {from, to}}`, and `/v1/sequence` finds each route. Only the start and end are written, never the parts between.
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
