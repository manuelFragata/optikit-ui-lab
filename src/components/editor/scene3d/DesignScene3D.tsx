/**
 * The editor's 3D view: the same design as the schematic, as cubes on the
 * openUC2 grid. How it is put together:
 *
 * - layout3d.ts   what to draw where (pure, tested): parts, rays, labels, floor;
 * - meshes.ts     the modules' meshes, loaded and prepared once, shared;
 * - shapes.tsx    what things look like; Part.tsx: one clickable part;
 * - drag3d.ts     the geometry of dragging (pure, tested); useMoveDrag.ts:
 *                 the gesture; MoveHandles.tsx: the arrows on the selection;
 * - Camera.tsx    orbit, pan, zoom, preset views, fit;
 * - overlay.tsx   DOM over the canvas: labels, action bar, box select, hint.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as DomPointerEvent, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, Grid } from '@react-three/drei';
import { DEFAULT_PREFERENCES, type Preferences } from '../../../settings/preferences';
import type { CanvasTool, HintPlace, ViewOptions } from '../viewOptions';
import { withMove, type Move, type Schematic, type SchematicSymbol } from '../model';
import { useLightFor } from '../light';
import { Camera, type CameraCommand } from './Camera';
import { useSceneColors } from './colors';
import { CUBE_MM, GRID_MM, layout3d, type Fidelity, type GlassFor, type MeshRef, type MoveAxis, type PlacedPart, type Vec3 } from './layout3d';
import { holderComponentOf } from './holderMesh';
import { componentOf, preloadMeshes } from './meshes';
import { ActionBar, ComponentTag, Hint, Labels, Marquee, Projector, type Pins, type Project } from './overlay';
import { useBoxSelect } from './useBoxSelect';
import { MoveHandles } from './MoveHandles';
import { Part } from './Part';
import { LayerFloor, Ray } from './shapes';
import { useMoveDrag } from './useMoveDrag';

export interface DesignScene3DProps {
  schematic: Schematic;
  layer: number;
  options: ViewOptions;
  /** Label and arrow sizes, mouse buttons and wheel (Settings); the defaults when omitted. */
  prefs?: Pick<Preferences, 'labelSize' | 'arrowSize' | 'orbitButton' | 'invertZoom'>;
  fidelity: Fidelity;
  selectedIds: string[];
  /** Select (left button picks, drags parts, or drags a box), pan or zoom. Right drag orbits and middle drag pans (or the other way round, in Settings), the wheel zooms. */
  tool: CanvasTool;
  /** Snap moves to the grid; Shift does the opposite while held. */
  snap: boolean;
  /** Parts dragged: moved (each along its free axes), or, with Alt, copied there. */
  onMove: (move: Move) => void;
  meshFor?: (s: SchematicSymbol) => MeshRef | undefined;
  /** A lens or mirror's real glass, drawn where it is not in a cube yet. */
  glassFor?: GlassFor;
  /** A part clicked, or `null` for empty space; `toggle` with Shift or Ctrl held. */
  onSelect: (id: string | null, toggle?: boolean) => void;
  /** Parts caught in a box dragged on empty space; `add` with Shift held. */
  onSelectMany: (ids: string[], add: boolean) => void;
  /** A part double-clicked. */
  onInspect: (id: string) => void;
  /** A part pressed (which selects it), and the component of its module it landed on (`null`: none, or not a solid). */
  onPickComponent?: (partId: string, component: string | null) => void;
  command?: CameraCommand;
  /** Top-left controls (the 2D/3D switch). */
  toolbar?: ReactNode;
  /** Floats above the selection (see SelectionActions). */
  selectionActions?: ReactNode;
  hint?: string;
  /** Where the hint sits, when the editor places it. */
  hintPlace?: HintPlace;
}

/** The action bar's key among the projected points (label keys are part ids, `ray-…` and `layer`). */
const ANCHOR = 'selection-anchor';

export function DesignScene3D({ schematic, layer, options, prefs = DEFAULT_PREFERENCES, fidelity, selectedIds, tool, snap, onMove, meshFor, glassFor, onSelect, onSelectMany, onInspect, onPickComponent, command, toolbar, selectionActions, hint, hintPlace }: DesignScene3DProps) {
  const colors = useSceneColors();
  const frame = useRef<HTMLDivElement>(null);

  // Dragging parts: while it lasts, the scene shows the design as it would be after the move.
  const drag = useMoveDrag({ frame, snap, selectedIds, onSelect: (ids) => onSelectMany(ids, false), onMove });
  const shown = useMemo(() => (drag.dragging ? withMove(schematic, drag.dragging) : schematic), [schematic, drag.dragging]);
  // Dragged up or down, the parts take the view's layer with them (as they will once let go).
  const shownLayer = layer + (drag.dragging?.by.z ?? 0);

  const lightFor = useLightFor();
  const layout = useMemo(
    () =>
      layout3d(
        shown,
        {
          layer: shownLayer,
          otherLayers: options.onionSkin !== false,
          fidelity,
          cages: options.showCages,
          rays: options.showRays !== false,
          partLabels: options.showPartLabels !== false,
          rayLabels: options.showRayLabels,
          selectedIds,
        },
        meshFor,
        lightFor(shown),
        glassFor,
      ),
    [shown, shownLayer, options, fidelity, selectedIds, meshFor, lightFor, glassFor],
  );
  const { parts, rays, labels, floor, anchor, handles, bounds } = layout;

  // Start fetching the meshes as soon as solids are asked for.
  useEffect(() => {
    if (fidelity === 'solids') preloadMeshes(parts.flatMap((p) => (p.mesh ? [p.mesh.url] : [])));
  }, [fidelity, parts]);

  // The part under the pointer, and the component of its module (solids only).
  const [hover, setHover] = useState<{ id: string; component: string | null } | null>(null);
  const hovered = hover?.id ?? null;
  const onHover = (id: string | null, component: string | null = null) =>
    setHover((h) => (id === null ? null : h?.id === id && h.component === component ? h : { id, component }));
  // Its name follows the pointer, moved directly (not through state, which would re-render the scene on every move).
  const hoverPart = parts.find((p) => p.id === hovered);
  const hoverMesh = hoverPart?.mesh;
  const hoverName = hover?.component && hoverMesh ? (componentOf(hoverMesh.url, hover.component) ?? (hoverMesh.holder && holderComponentOf(hoverMesh.holder, hover.component)))?.title : undefined;
  const tag = useRef<HTMLDivElement | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const placeTag = () => {
    if (tag.current) tag.current.style.transform = `translate(${pointer.current.x + 14}px, ${pointer.current.y + 18}px)`;
  };
  const moveTag = (e: DomPointerEvent) => {
    const at = frame.current?.getBoundingClientRect();
    if (at) pointer.current = { x: e.clientX - at.left, y: e.clientY - at.top };
    placeTag();
  };

  // Overlays: the labels and the action bar follow their points (by key) on screen.
  const project = useRef<Project | null>(null);
  const [pins] = useState<Pins>(() => new Map());
  const points: Record<string, Vec3> = Object.fromEntries(labels.map((l) => [l.key, l.at]));
  if (anchor) points[ANCHOR] = anchor;

  // A press on a part (or an arrow) starts a drag with the select tool, and never a box.
  const pressedOnPart = useRef(false);
  const pressPart = (part: PlacedPart, e: ThreeEvent<PointerEvent>) => {
    pressedOnPart.current = true;
    if (tool === 'select') drag.startAcross(part, e);
  };
  const pressArrow = (axis: MoveAxis, e: ThreeEvent<PointerEvent>) => {
    pressedOnPart.current = true;
    // Steps along the axis are counted from the part the inspector shows (the last one selected).
    const primary = schematic.symbols.find((s) => s.id === selectedIds[selectedIds.length - 1]);
    if (handles && primary) drag.startAlong(axis, handles.at, primary[axis], e);
  };

  // Box selection, and the click that ends it (which must not deselect).
  const downAt = useRef({ x: 0, y: 0 });
  const box = useBoxSelect({
    frame,
    enabled: tool === 'select',
    pressedOnPart,
    project,
    candidates: parts.filter((p) => p.look !== 'ghost'),
    onSelect: onSelectMany,
  });

  const cursor = hovered && tool === 'select' ? 'pointer' : tool === 'pan' ? 'grab' : tool === 'zoom' ? 'zoom-in' : 'default';

  return (
    <Box
      ref={frame}
      onPointerDown={(e) => {
        downAt.current = { x: e.clientX, y: e.clientY };
        box.onPointerDown(e);
      }}
      onPointerMove={moveTag}
      onContextMenu={(e) => e.preventDefault()}
      sx={{ position: 'relative', flex: 1, minWidth: 0, overflow: 'hidden', isolation: 'isolate', bgcolor: 'canvas.ground', cursor, userSelect: 'none' }}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [-700, 800, 900], fov: 35, near: 1, far: 60000 }}
        onPointerMissed={(e) => {
          // Only a plain left click on empty space deselects: not the end of an orbit, a pan or a box.
          const moved = Math.hypot(e.clientX - downAt.current.x, e.clientY - downAt.current.y) > 4;
          if (box.consumeClick()) return;
          if (e.type === 'click' && e.button === 0 && !moved && tool === 'select') onSelect(null);
        }}
      >
        <color attach="background" args={[colors.ground]} />
        <hemisphereLight args={['#ffffff', '#8b9199', 1.2]} />
        <directionalLight position={[-500, 900, 700]} intensity={1.5} />
        <directionalLight position={[600, 300, -500]} intensity={0.45} />

        {/* The floor: lines on the cube boundaries, every fifth stronger. optikit-v2: Grid, cell 50, section 250. */}
        <Grid
          position={[CUBE_MM / 2, -0.5, CUBE_MM / 2]}
          infiniteGrid
          cellSize={GRID_MM.x}
          sectionSize={GRID_MM.x * 5}
          cellThickness={0.6}
          sectionThickness={1}
          cellColor={colors.grid}
          sectionColor={colors.gridMajor}
          fadeDistance={6000}
          fadeStrength={1.5}
        />

        <Camera tool={tool} command={command} bounds={bounds} orbitButton={prefs.orbitButton} invertZoom={prefs.invertZoom} />
        <Projector project={project} points={points} pins={pins} />

        {/* The design, in the document frame: z up, mm. */}
        <group rotation={[-Math.PI / 2, 0, 0]}>
          {floor && <LayerFloor floor={floor} color={colors.accent} />}
          {parts.map((p) => (
            <Part
              key={p.id}
              part={p}
              colors={colors}
              hovered={hovered === p.id}
              hoveredComponent={hovered === p.id ? (hover?.component ?? null) : null}
              onPress={pressPart}
              onSelect={onSelect}
              onPickComponent={(id, component) => onPickComponent?.(id, component)}
              onInspect={onInspect}
              onHover={onHover}
            />
          ))}
          {rays.map((r) => (
            <Ray key={r.id} ray={r} color={colors.rays[r.color]} warning={colors.warning} />
          ))}
          {handles && tool === 'select' && <MoveHandles at={handles.at} axes={handles.axes} size={prefs.arrowSize} onPress={pressArrow} />}
        </group>

        {/* Which way is which, in document axes. */}
        <GizmoHelper alignment="bottom-left" margin={[72, 88]}>
          <GizmoViewport labels={['x', 'z', '−y']} labelColor="#ffffff" axisHeadScale={0.9} />
        </GizmoHelper>
      </Canvas>

      <Labels labels={labels} pins={pins} rays={colors.rays} size={prefs.labelSize} />
      {hoverName && !drag.dragging && !box.rect && (
        <ComponentTag
          ref={(el) => {
            tag.current = el;
            placeTag();
          }}
          part={hoverPart?.label}
        >
          {hoverName}
        </ComponentTag>
      )}
      {box.rect && <Marquee rect={box.rect} />}
      {selectionActions && anchor && !box.rect && (
        <ActionBar pins={pins} pinKey={ANCHOR}>
          {selectionActions}
        </ActionBar>
      )}
      {toolbar && <Box sx={{ position: 'absolute', top: (t) => t.spacing(1.5), left: (t) => t.spacing(1.5), zIndex: 3 }}>{toolbar}</Box>}
      {drag.dragging ? (
        <Hint place={hintPlace}>{`${drag.dragging.free ? 'Off the grid' : 'On the grid'} · Shift: ${drag.dragging.free ? 'snap' : 'off the grid'} · Alt: drop copies · Esc: put back`}</Hint>
      ) : box.rect ? (
        <Hint place={hintPlace}>Everything the box covers · Shift adds to the selection</Hint>
      ) : (
        hint && selectedIds.length === 0 && <Hint place={hintPlace}>{hint}</Hint>
      )}
    </Box>
  );
}
