/**
 * The editor's 3D view: the same design as the schematic, as cubes on the
 * openUC2 grid. How it is put together:
 *
 * - layout3d.ts   what to draw where (pure, tested): parts, rays, labels, floor;
 * - meshes.ts     the modules' meshes, loaded and prepared once, shared;
 * - shapes.tsx    what things look like; Part.tsx: one clickable part;
 * - Camera.tsx    orbit, pan, zoom, preset views, fit;
 * - overlay.tsx   DOM over the canvas: labels, action bar, box select, hint.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import { Canvas } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, Grid } from '@react-three/drei';
import type { CanvasTool, ViewOptions } from '../CanvasToolbar';
import type { Schematic, SchematicSymbol } from '../model';
import { Camera, type CameraCommand } from './Camera';
import { useSceneColors } from './colors';
import { CUBE_MM, GRID_MM, layout3d, type Fidelity, type MeshRef, type Vec3 } from './layout3d';
import { preloadMeshes } from './meshes';
import { ActionBar, Hint, Labels, Marquee, Projector, useBoxSelect, type OnScreen, type Project } from './overlay';
import { Part } from './Part';
import { LayerFloor, Ray } from './shapes';

export interface DesignScene3DProps {
  schematic: Schematic;
  layer: number;
  options: ViewOptions;
  fidelity: Fidelity;
  selectedIds: string[];
  /** Select (left button picks and drags a box), pan or zoom. Right drag always orbits, middle drag pans, the wheel zooms. */
  tool: CanvasTool;
  meshFor?: (s: SchematicSymbol) => MeshRef | undefined;
  /** A part clicked, or `null` for empty space; `toggle` with Shift or Ctrl held. */
  onSelect: (id: string | null, toggle?: boolean) => void;
  /** Parts caught in a box dragged on empty space; `add` with Shift held. */
  onSelectMany: (ids: string[], add: boolean) => void;
  /** A part double-clicked. */
  onInspect: (id: string) => void;
  command?: CameraCommand;
  /** Top-left controls (the 2D/3D switch). */
  toolbar?: ReactNode;
  /** Floats above the selection (see SelectionActions). */
  selectionActions?: ReactNode;
  hint?: string;
}

/** The action bar's key among the projected points (label keys are part ids, `ray-…` and `layer`). */
const ANCHOR = 'selection-anchor';

export function DesignScene3D({ schematic, layer, options, fidelity, selectedIds, tool, meshFor, onSelect, onSelectMany, onInspect, command, toolbar, selectionActions, hint }: DesignScene3DProps) {
  const colors = useSceneColors();
  const layout = useMemo(
    () =>
      layout3d(
        schematic,
        {
          layer,
          otherLayers: options.onionSkin !== false,
          fidelity,
          cages: options.showCages,
          rays: options.showRays !== false,
          rayLabels: options.showRayLabels,
          selectedIds,
        },
        meshFor,
      ),
    [schematic, layer, options, fidelity, selectedIds, meshFor],
  );
  const { parts, rays, labels, floor, anchor, bounds } = layout;

  // Start fetching the meshes as soon as solids are asked for.
  useEffect(() => {
    if (fidelity === 'solids') preloadMeshes(parts.flatMap((p) => (p.mesh ? [p.mesh.url] : [])));
  }, [fidelity, parts]);

  const [hovered, setHovered] = useState<string | null>(null);

  // Overlays: where the labels and the action bar's anchor land on screen, by key.
  const project = useRef<Project | null>(null);
  const points: Record<string, Vec3> = Object.fromEntries(labels.map((l) => [l.key, l.at]));
  if (anchor) points[ANCHOR] = anchor;
  const [onScreen, setOnScreen] = useState<OnScreen>({});
  const anchorAt = anchor ? onScreen[ANCHOR] : undefined;

  // Box selection, and the click that ends it (which must not deselect).
  const frame = useRef<HTMLDivElement>(null);
  const pressedOnPart = useRef(false);
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

        <Camera tool={tool} command={command} bounds={bounds} />
        <Projector project={project} points={points} onPoints={setOnScreen} />

        {/* The design, in the document frame: z up, mm. */}
        <group rotation={[-Math.PI / 2, 0, 0]}>
          {floor && <LayerFloor floor={floor} color={colors.accent} />}
          {parts.map((p) => (
            <Part
              key={p.id}
              part={p}
              colors={colors}
              hovered={hovered === p.id}
              pressed={pressedOnPart}
              onSelect={onSelect}
              onInspect={onInspect}
              onHover={setHovered}
            />
          ))}
          {rays.map((r) => (
            <Ray key={r.id} ray={r} color={colors.rays[r.color]} />
          ))}
        </group>

        {/* Which way is which, in document axes. */}
        <GizmoHelper alignment="bottom-left" margin={[72, 88]}>
          <GizmoViewport labels={['x', 'z', '−y']} labelColor="#ffffff" axisHeadScale={0.9} />
        </GizmoHelper>
      </Canvas>

      <Labels labels={labels} at={onScreen} rays={colors.rays} />
      {box.rect && <Marquee rect={box.rect} />}
      {selectionActions && anchorAt && !box.rect && <ActionBar at={anchorAt}>{selectionActions}</ActionBar>}
      {toolbar && <Box sx={{ position: 'absolute', top: (t) => t.spacing(1.5), left: (t) => t.spacing(1.5), zIndex: 3 }}>{toolbar}</Box>}
      {hint && (selectedIds.length === 0 || box.rect) && <Hint>{box.rect ? 'Everything the box covers · Shift adds to the selection' : hint}</Hint>}
    </Box>
  );
}
