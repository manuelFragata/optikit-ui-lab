# The 3D assembly view: what to keep, what to change

For the optikit-v2 frontend. This compares `main` (899d8cc), mostly `frontend/src/components/assembly/AssemblyScene.tsx`, with the UI-V4 brief, and points to a working version in optikit-ui-lab (`src/components/editor/scene3d/`). The lab version uses the same stack (three 0.183, @react-three/fiber 9, drei 10) and the same frames, so it ports.

## Keep

- **The frames and their tests.** Document z-up, `toThree = [x, z, −y]`, the 24 rotations as `{z, x}`, and the seat as a second rotation. The tests in `meshFrame.test.ts` are what stopped the "flipped part" bugs.
- **Failure handling per part.** Suspense for each mesh, `GLBErrorBoundary`, and a labelled ghost box when a mesh is missing. One bad file never blanks the scene.
- **The kernel in a worker,** with its rays drawn as one merged `lineSegments`.
- **`frameloop="demand"`.**

## Change

### 1. Make the view a function of the document

**Problem.**
- `AssemblyScene.tsx` (1,105 lines) does everything in one component: pose math, GLB loading, kinematics, dimming, handles, labels and picking.
- `SchematicScene.tsx` (836 lines) repeats lights, controls, grid, picking and mesh loading.
- The mesh-prep code is copied almost line for line at lines 133–150 and 331–345.

**Suggestion.** Split it into three layers:
- a pure function from the document and the view state (layer, fidelity, toggles, selection) to placed items (pose, layer, look, label, selected);
- a mesh layer that loads, prepares and caches;
- thin components that draw.

**Why.**
- The pose math becomes testable without a canvas.
- The fidelity dial, layer dimming and selection each live in one place, and both scenes share them.

**Lab:** `scene3d/`:
- `layout3d.ts`: design → parts, rays, labels, floor, anchor and camera bounds, tested in `layout3d.test.ts` without a canvas;
- `meshes.ts`: loading;
- `shapes.tsx` and `Part.tsx`: drawing;
- `Camera.tsx`;
- `overlay.tsx`: labels, action bar, box select;
- `DesignScene3D.tsx`: composes them in about 170 lines.

The layer rules (current, ghost, hidden) live in `editor/layers.ts` and are shared with the 2D schematic.

### 2. Dimmed layers leak memory and sort badly

**Problem.** For a dimmed part, every mesh gets a `material.clone()` set to `opacity 0.12, depthWrite false` (line 142 and line 338).
- The clones are never disposed; there is no `dispose` in `assembly/`. Every layer toggle leaks GPU memory.
- Transparent CAD meshes sort badly: they flicker and show inside out.
- At 12% opacity, a dense layer turns to noise.

**Suggestion.** Draw other layers one fidelity step down, as cube edges only. Use a few shared materials per look, never clones per mesh.

**Why.** It's cheaper, it reads like CAD's "other bodies transparent / hidden lines", and there is nothing to leak.

### 3. Pick against a box per part, not the CAD triangles

**Problem.** Hover and click raycast every triangle of every part on each pointer move. CAD exports have hundreds of thousands of them.

**Suggestion.** Give each part one invisible 50 mm box that takes the events. The drawn meshes take none.

**Why.**
- Hover cost no longer grows with mesh detail.
- The whole cube is clickable, not only the metal.
- Picking is the same at every fidelity, which PLAN-ONE-PART-MODEL §6 asks for ("everything selectable at every stop").

### 4. Prepare meshes once, and share them

**Problem.**
- Every part makes a `SkeletonUtils.clone`, which is only needed for skinned meshes; CAD parts have none.
- Draw calls grow with the number of mesh nodes in each export.
- The GLBs are served with no cache headers, and the index is fetched `no-cache`.

**Suggestion.**
- On load, for each file: centre it on the cube halves, make one matte material per source material, and merge the static nodes into one geometry per material. Keep the kinematic nodes separate.
- Parts render the shared geometry and materials.
- On the server:
  - compress with gltf-transform (meshopt or Draco);
  - give files content-hashed names and serve them `immutable`.

**Lab:** `meshes.ts`, without the kinematics and without the server side.

### 5. Selection and camera

**Problem.**
- Selection is a 52 mm wireframe box, the same shape for every part.
- `zoomToPart` uses a 350 ms `setTimeout` and a hard 200–500 mm clamp.
- There are no preset views.

**Suggestion.**
- An outline on the real silhouette. drei's `<Outlines>` is enough; no post-processing pass is needed.
- drei's `CameraControls`, for smooth moves and zoom to the cursor.
- Preset views (top, front, right, angled), F to fit the design, Shift+F to fit the selection.
- Keep the lockView mapping: right orbits, middle pans, left belongs to the tool.

**Note.** `fitToBox` in camera-controls snaps the view to the nearest axis; use `fitToSphere` to keep an angled view.

### 6. Rays you can see

**Problem.** WebGL ignores `linewidth`, so the kernel rays are always 1 px and disappear against meshes.

**Suggestion.** Screen-space thick lines (drei `Line`, i.e. `Line2`), with a faint wider line under them for a glow.

### 7. Labels as DOM, not drei `Html`

**Problem.** Every drei `Html` runs its own React root:
- under React 19, unmounting one mid-render logs "Attempted to synchronously unmount a root";
- the labels lose the MUI theme context.

**Suggestion.** Project the label anchors once per rendered frame, and draw all labels as one absolutely positioned DOM overlay. The same projection places the selection's floating action bar.

### 8. Build the fidelity dial as a look per part

The brief's symbols → cubes → solids dial is not built yet. With point 1 in place it's one function: the look of each part, from the fidelity, its layer, and whether it is mounted. "An unmounted part at solids is drawn dashed" then falls out as a rule, not a special case.

## Not done in the lab yet

- Dragging in 3D with per-axis arrows that respect locks.
- An exploded view for the Documentation tab.
- A section cut.
- Kernel rays (the lab draws straight paths through part centres).
- Instancing repeated modules. Today they share geometry and materials, but each instance is still its own draw call.
