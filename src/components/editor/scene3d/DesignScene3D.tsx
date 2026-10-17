/**
 * The editor's canvas, 2D and 3D: the design as cubes on the openUC2 grid. 2D
 * is the same scene from the top, on a camera without perspective, so both
 * views show each part the same way: a sketch as the glass its inputs stand
 * for, a part not in a cube as its optic, a part in a cube as its module's
 * meshes. How it is put together:
 *
 * - layout3d.ts   what to draw where (pure, tested): parts, rays, labels, floor;
 * - meshes.ts     the modules' meshes, loaded and prepared once, shared;
 * - shapes.tsx    what things look like; Part.tsx: one clickable part;
 * - drag3d.ts     the geometry of dragging (pure, tested); useMoveDrag.ts:
 *                 the gesture; MoveHandles.tsx: the arrows on the selection;
 * - Camera.tsx    orbit, pan, zoom, preset views, fit; 2D: from the top, no turning;
 * - Placing.tsx   placing a new part, and measuring, on the current layer;
 * - overlay.tsx   DOM over the canvas: labels, action bar, box select, hint.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as DomPointerEvent, type ReactNode } from 'react';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import Box from '@mui/material/Box';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, Grid } from '@react-three/drei';
import { DEFAULT_PREFERENCES, type Preferences } from '../../../settings/preferences';
import type { CanvasTool, HintPlace, ViewOptions } from '../viewOptions';
import { withMove, type Move, type Schematic, type SchematicSymbol } from '../model';
import { useLight } from '../../../ports/light';
import { Camera, PX_PER_MM, type CameraCommand } from './Camera';
import { useSceneColors } from './colors';
import { CUBE_MM, GRID_MM, layout3d, type GlassFor, type MeshRef, type MoveAxis, type PlacedPart, type Vec3 } from './layout3d';
import { holderComponentOf } from './holderMesh';
import { componentOf, preloadMeshes } from './meshes';
import { ActionBar, ComponentTag, Hint, Labels, Marquee, Projector, type Pins, type Project } from './overlay';
import { useBoxSelect } from './useBoxSelect';
import { MoveHandles } from './MoveHandles';
import { Backdrop, BackdropSync, type BackdropRefs } from './Backdrop';
import { Part } from './Part';
import { MeasurePlane, PlacingPlane, type Placing } from './Placing';
import { LayerFloor, Ray } from './shapes';
import { useMoveDrag } from './useMoveDrag';

export interface DesignScene3DProps {
  schematic: Schematic;
  /** 2D: from the top, without perspective. */
  flat?: boolean;
  /** A new part on its way: it follows the pointer on the current layer. */
  placing?: Placing | null;
  /** Where to put it, in grid steps (y up); `more` with Ctrl held, to place another. */
  onPlace?: (at: { x: number; y: number }, more: boolean) => void;
  /** The light path Simulate looks at: the others step back. */
  focusRay?: string | null;
  /** 2D: the zoom as it changes, 1 = 100 %. */
  onZoom?: (zoom: number) => void;
  layer: number;
  options: ViewOptions;
  /** Label and arrow sizes, mouse buttons and wheel (Settings); the defaults when omitted. */
  prefs?: Pick<Preferences, 'labelSize' | 'arrowSize' | 'orbitButton' | 'invertZoom'>;
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

export function DesignScene3D({
  schematic,
  flat = false,
  placing = null,
  onPlace,
  focusRay = null,
  onZoom,
  layer,
  options,
  prefs = DEFAULT_PREFERENCES,
  selectedIds,
  tool,
  snap,
  onMove,
  meshFor,
  glassFor,
  onSelect,
  onSelectMany,
  onInspect,
  onPickComponent,
  command,
  toolbar,
  selectionActions,
  hint,
  hintPlace,
}: DesignScene3DProps) {
  const colors = useSceneColors();
  const frame = useRef<HTMLDivElement>(null);

  // Dragging parts: while it lasts, the scene shows the design as it would be after the move.
  const drag = useMoveDrag({ frame, snap, selectedIds, onSelect: (ids) => onSelectMany(ids, false), onMove });
  const shown = useMemo(() => (drag.dragging ? withMove(schematic, drag.dragging) : schematic), [schematic, drag.dragging]);
  // Dragged up or down, the parts take the view's layer with them (as they will once let go).
  const shownLayer = layer + (drag.dragging?.by.z ?? 0);

  // The light of the design as shown: while parts are dragged, it follows them.
  const { light } = useLight(shown);
  const layout = useMemo(
    () =>
      layout3d(
        shown,
        {
          layer: shownLayer,
          otherLayers: options.onionSkin !== false,
          cages: options.showCages,
          rays: options.showRays !== false,
          partLabels: options.showPartLabels !== false,
          rayLabels: options.showRayLabels,
          selectedIds,
          fromTop: flat,
        },
        meshFor,
        light,
        glassFor,
      ),
    [shown, shownLayer, options, selectedIds, meshFor, light, glassFor, flat],
  );
  const { parts, rays, labels, floor, anchor, handles, bounds } = layout;

  // Start fetching the meshes at once.
  useEffect(() => {
    preloadMeshes(parts.flatMap((p) => (p.mesh ? [p.mesh.url] : [])));
  }, [parts]);

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
    enabled: tool === 'select' && !placing,
    pressedOnPart,
    project,
    candidates: parts.filter((p) => p.look !== 'ghost'),
    onSelect: onSelectMany,
  });

  const cursor = placing || tool === 'measure' ? 'crosshair' : hovered && tool === 'select' ? 'pointer' : tool === 'pan' ? 'grab' : tool === 'zoom' ? 'zoom-in' : 'default';
  // The height of the current layer's cube centres: where new parts land and lengths are measured.
  const layerHeight = layer * GRID_MM.z + CUBE_MM / 2;
  // 2D's paper under the scene: the grid, the origin, the groups.
  const paper: BackdropRefs = { paper: useRef<SVGGElement>(null), minor: useRef<SVGPathElement>(null) };

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
      {flat && <Backdrop refs={paper} schematic={shown} layer={shownLayer} otherLayers={options.onionSkin !== false} />}
      <Canvas
        key={flat ? '2d' : '3d'}
        style={{ position: 'absolute', inset: 0 }}
        frameloop="demand"
        dpr={[1, 2]}
        orthographic={flat}
        camera={flat ? { position: [0, 8000, 0.01], zoom: PX_PER_MM, near: 1, far: 60000 } : { position: [-700, 800, 900], fov: 35, near: 1, far: 60000 }}
        onPointerMissed={(e) => {
          // Only a plain left click on empty space deselects: not the end of an orbit, a pan or a box.
          const moved = Math.hypot(e.clientX - downAt.current.x, e.clientY - downAt.current.y) > 4;
          if (box.consumeClick()) return;
          if (e.type === 'click' && e.button === 0 && !moved && tool === 'select') onSelect(null);
        }}
      >
        {/* 2D: see-through, over its paper. */}
        {!flat && <color attach="background" args={[colors.ground]} />}
        {flat && <BackdropSync refs={paper} />}
        <hemisphereLight args={['#ffffff', '#8b9199', 1.2]} />
        <directionalLight position={[-500, 900, 700]} intensity={1.5} />
        <directionalLight position={[600, 300, -500]} intensity={0.45} />

        {/* The floor: lines on the cube boundaries, every fifth stronger. optikit-v2: Grid, cell 50, section 250. */}
        {!flat && (
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
        )}

        <Camera tool={tool} command={command} bounds={bounds} orbitButton={prefs.orbitButton} invertZoom={prefs.invertZoom} flat={flat} onZoom={onZoom} />
        <Projector project={project} points={points} pins={pins} />

        {/* The design, in the document frame: z up, mm. */}
        <group rotation={[-Math.PI / 2, 0, 0]}>
          {floor && !flat && <LayerFloor floor={floor} color={colors.accent} />}
          {parts.map((p) => (
            <Part
              key={p.id}
              part={p}
              colors={colors}
              flat={flat}
              hovered={hovered === p.id}
              hoveredComponent={hovered === p.id ? (hover?.component ?? null) : null}
              onPress={pressPart}
              onSelect={onSelect}
              onPickComponent={(id, component) => onPickComponent?.(id, component)}
              onInspect={onInspect}
              onHover={onHover}
              inert={tool !== 'select' || Boolean(placing)}
            />
          ))}
          {rays.map((r) => (
            <Ray key={r.id} ray={r} color={colors.rays[r.color]} warning={colors.warning} faint={focusRay !== null && r.id !== focusRay} />
          ))}
          {placing && onPlace && <PlacingPlane placing={placing} height={layerHeight} snap={snap} colors={colors} onPlace={onPlace} />}
          {tool === 'measure' && !placing && <MeasurePlane height={layerHeight} snap={snap} color={colors.accent} />}
          {handles && tool === 'select' && !placing && <MoveHandles at={handles.at} axes={handles.axes} size={prefs.arrowSize} onPress={pressArrow} />}
        </group>

        {/* Which way is which, in document axes (3D; 2D draws its x and y over the canvas). */}
        {!flat && (
          <GizmoHelper alignment="bottom-left" margin={[72, 88]}>
            <GizmoViewport labels={['x', 'z', '−y']} labelColor="#ffffff" axisHeadScale={0.9} />
          </GizmoHelper>
        )}
      </Canvas>

      <Labels labels={labels} pins={pins} rays={colors.rays} size={prefs.labelSize} hovered={hovered} />
      {flat && (
        <Box
          component="svg"
          viewBox="0 0 40 40"
          aria-hidden
          sx={{ position: 'absolute', left: (t) => t.spacing(2), bottom: (t) => t.spacing(2), width: (t) => t.spacing(6), height: (t) => t.spacing(6), color: 'text.meta', typography: 'caption', pointerEvents: 'none' }}
        >
          <path d="M6 34 H34 M30 30 L34 34 L30 38 M6 34 V6 M2 10 L6 6 L10 10" fill="none" stroke="currentColor" strokeWidth={1.25} />
          <text x={36} y={37} fontSize={8} fill="currentColor">
            x
          </text>
          <text x={1} y={5} fontSize={8} fill="currentColor">
            y
          </text>
        </Box>
      )}
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
        <Hint place={hintPlace} icon={flat ? <NearMeOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} /> : undefined}>{`${drag.dragging.free ? 'Off the grid' : 'On the grid'} · Shift: ${drag.dragging.free ? 'snap' : 'off the grid'} · Alt: drop copies · Esc: put back`}</Hint>
      ) : box.rect ? (
        <Hint place={hintPlace} icon={flat ? <NearMeOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} /> : undefined}>Everything the box covers · Shift adds to the selection</Hint>
      ) : (
        hint && (selectedIds.length === 0 || placing || tool !== 'select') && <Hint place={hintPlace} icon={flat ? <NearMeOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} /> : undefined}>{hint}</Hint>
      )}
    </Box>
  );
}
