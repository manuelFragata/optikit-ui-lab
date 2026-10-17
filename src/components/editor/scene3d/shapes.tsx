/**
 * What things look like in 3D. These only draw what they are given (in the
 * document frame: mm, z up); what to draw where is decided in layout3d.ts.
 */
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode, type Ref } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Line, Outlines } from '@react-three/drei';
import { Box3, DoubleSide, Quaternion, Shape, ShapeGeometry, Vector3, type Group } from 'three';
import type { SymbolKind } from '../model';
import { CUBE_MM, minimumScale, type Floor, type MeshRef, type PlacedRay, type Vec3 } from './layout3d';
import { glassGeometries, glassMaterial, useHolderComponents } from './holderMesh';
import type { FragmentSurface } from '../holders/optic';
import { COMPONENT_KEY, poseMatrix, useModuleMesh, type MeshComponent } from './meshes';
import type { SketchCone, SketchLine, SketchShape, SketchSolid } from '../sketchShapes';

const H = CUBE_MM / 2;

/** The 12 edges of a cube centred on the origin, as pairs of points. */
const CUBE_EDGES: Vec3[] = [-H, H].flatMap((a) =>
  [-H, H].flatMap((b): Vec3[] => [
    [-H, a, b], [H, a, b],
    [a, -H, b], [a, H, b],
    [a, b, -H], [a, b, H],
  ]),
);

/** A cube as edges: a cage, a ghost, or (dashed) an optic with no holder yet. */
export function CubeEdges({ color, width = 1, dashed = false, opacity = 1 }: { color: string; width?: number; dashed?: boolean; opacity?: number }) {
  return <Line points={CUBE_EDGES} segments color={color} lineWidth={width} dashed={dashed} dashSize={5} gapSize={4} transparent={opacity < 1} opacity={opacity} />;
}

/** The selection or hover outline, on the mesh it sits in. */
const Outline = ({ color }: { color: string | null }) => (color ? <Outlines screenspace thickness={1.5} color={color} /> : null);

/** Rotates a cylinder (drawn along y) to lie along x. */
const ALONG_X: Vec3 = [0, 0, -Math.PI / 2];

/**
 * The optic as a small 3D glyph inside its cube, its light along +x before
 * the seat turns it (optikit-v2 draws these as SchematicGlyph). Sizes in mm.
 */
export function Glyph({ kind, turns, color, outline, scale = 1 }: { kind: SymbolKind; turns: number; color: string; outline: string | null; scale?: number }) {
  const solid = <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />;
  const glass = <meshStandardMaterial color={color} roughness={0.15} transparent opacity={0.7} />;
  const shapes: Record<SymbolKind, ReactNode> = {
    laser: (
      <>
        <mesh position={[-4, 0, 0]}>
          <boxGeometry args={[30, 18, 18]} />
          {solid}
          <Outline color={outline} />
        </mesh>
        <mesh position={[15, 0, 0]} rotation={ALONG_X}>
          <cylinderGeometry args={[4, 4, 8, 20]} />
          {solid}
        </mesh>
      </>
    ),
    mirror: (
      <mesh rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[2.5, 34, 30]} />
        {solid}
        <Outline color={outline} />
      </mesh>
    ),
    dichroic: (
      <mesh rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[2.5, 34, 30]} />
        {glass}
        <Outline color={outline} />
      </mesh>
    ),
    lens: (
      <mesh scale={[0.28, 1, 1]}>
        <sphereGeometry args={[16, 32, 16]} />
        {glass}
        <Outline color={outline} />
      </mesh>
    ),
    objective: (
      <>
        <mesh position={[-3, 0, 0]} rotation={ALONG_X}>
          <cylinderGeometry args={[9, 9, 26, 28]} />
          {solid}
          <Outline color={outline} />
        </mesh>
        <mesh position={[14, 0, 0]} rotation={ALONG_X}>
          <cylinderGeometry args={[4.5, 7, 8, 24]} />
          {solid}
        </mesh>
      </>
    ),
    filter: (
      <mesh rotation={ALONG_X}>
        <cylinderGeometry args={[13, 13, 2.5, 32]} />
        {glass}
        <Outline color={outline} />
      </mesh>
    ),
    beamsplitter: (
      <>
        <mesh>
          <boxGeometry args={[24, 24, 24]} />
          <meshStandardMaterial color={color} roughness={0.15} transparent opacity={0.35} />
          <Outline color={outline} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.8, 33, 24]} />
          {glass}
        </mesh>
      </>
    ),
    aperture: (
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[11, 4, 12, 40]} />
        {solid}
        <Outline color={outline} />
      </mesh>
    ),
    camera: (
      <>
        <mesh position={[-3, 0, 0]}>
          <boxGeometry args={[24, 26, 26]} />
          {solid}
          <Outline color={outline} />
        </mesh>
        <mesh position={[12, 0, 0]} rotation={ALONG_X}>
          <cylinderGeometry args={[7, 7, 6, 24]} />
          {solid}
        </mesh>
      </>
    ),
  };
  return (
    <group rotation={[0, 0, (turns * Math.PI) / 2]} scale={scale}>
      {shapes[kind]}
    </group>
  );
}

/**
 * An optic as its glass, where the part sits: a lens or a filter across the
 * beam (its axis along +x before the seat turns it), a mirror, a dichroic or
 * a splitter at 45° as its glyph lies.
 * `flat` (2D): zoomed out, never smaller on screen than MIN_ACROSS_PX across
 * or MIN_ALONG_PX thick: true in shape and place, enlarged about its middle
 * only where it would vanish.
 */
export function Glass({
  surfaces,
  mirror,
  at45 = mirror,
  turns,
  outline,
  flat = false,
}: {
  surfaces: FragmentSurface[];
  mirror: boolean;
  at45?: boolean;
  turns: number;
  outline: string | null;
  flat?: boolean;
}) {
  const geometries = useMemo(() => glassGeometries(surfaces), [surfaces]);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
  // Its extent along its axis (x) and across it, mm.
  const size = useMemo(() => {
    const box = new Box3();
    for (const g of geometries) box.union(g.boundingBox ?? (g.computeBoundingBox(), g.boundingBox!));
    return box.isEmpty() ? null : { across: box.max.y - box.min.y, along: box.max.x - box.min.x, middle: (box.max.x + box.min.x) / 2 };
  }, [geometries]);
  const grown = useRef<Group>(null);
  // Without perspective the zoom is pixels per mm: read each frame, so zooming needs no new render.
  useFrame(({ camera }) => {
    const g = grown.current;
    if (!g || !size) return;
    const { across, along } = flat ? minimumScale(size, camera.zoom) : { across: 1, along: 1 };
    g.scale.set(along, across, across);
    g.position.set(size.middle * (1 - along), 0, 0);
  });
  return (
    <group rotation={[0, 0, (turns * Math.PI) / 2 + (at45 ? -Math.PI / 4 : 0)]}>
      <group ref={grown}>
        {geometries.map((g, i) => (
          <mesh key={i} geometry={g} material={glassMaterial(i, mirror)}>
            <Outline color={outline} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Where a sketch's lines are drawn: just over the light, which runs at the cube's middle. */
const SKETCH_Z = 0.3;
const RING: Vec3[] = Array.from({ length: 49 }, (_, k): Vec3 => [0, Math.cos((k / 48) * 2 * Math.PI), Math.sin((k / 48) * 2 * Math.PI)]);

/** A closed line's fill, as a flat shape in the beam's plane. */
function Fill({ line }: { line: SketchLine }) {
  const geometry = useMemo(() => new ShapeGeometry(new Shape(line.points.map(([x, y]) => new Vector3(x, y, 0)) as never)), [line.points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[0, 0, SKETCH_Z - 0.1]}>
      <meshBasicMaterial color={line.fill} transparent opacity={0.45} depthWrite={false} side={DoubleSide} />
    </mesh>
  );
}

/** A body of an ideal part in 3D: see-through, in the sketch colour, its edges drawn. */
function SketchBody({ solid, color }: { solid: SketchSolid; color: string }) {
  const material = <meshStandardMaterial color={color} transparent opacity={0.16} roughness={0.7} depthWrite={false} />;
  if (solid.kind === 'box') {
    const [a, b] = solid.x;
    return (
      <mesh position={[(a + b) / 2, 0, 0]}>
        <boxGeometry args={[b - a, 2 * solid.half[0], 2 * solid.half[1]]} />
        {material}
        <Edges color={color} />
      </mesh>
    );
  }
  if (solid.kind === 'cylinder') {
    const [a, b] = solid.x;
    return (
      <mesh position={[(a + b) / 2, 0, 0]} rotation={ALONG_X}>
        <cylinderGeometry args={[solid.r, solid.r, b - a, 32]} />
        {material}
        <Edges color={color} threshold={30} />
      </mesh>
    );
  }
  // A half sphere facing +x, `depth` deep.
  return (
    <mesh position={[solid.x, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, solid.depth / solid.r, 1]}>
      <sphereGeometry args={[solid.r, 24, 12, 0, 2 * Math.PI, 0, Math.PI / 2]} />
      {material}
    </mesh>
  );
}

/** A source's light as it leaves: a glowing cone of its colour, along x. */
function LightCone({ cone }: { cone: SketchCone }) {
  return (
    <mesh position={[cone.x + cone.length / 2, 0, 0]} rotation={ALONG_X}>
      {/* Along y before the turn: the top (+y, then +x) is the far end. */}
      <cylinderGeometry args={[cone.r1, cone.r0, cone.length, 32, 1, true]} />
      <meshBasicMaterial color={cone.color} transparent opacity={0.3} depthWrite={false} side={DoubleSide} />
    </mesh>
  );
}

/**
 * An ideal part: its line art (sketchShapes.ts), in the plane of the light,
 * at its true size; in 3D also its aperture, a faint ring across the light,
 * and the body of a source, a camera or an objective. A source's light
 * leaves it as a cone of its colour, in 2D and 3D.
 * Selected, it is drawn bolder and shows its foci. `flat` (2D): never smaller
 * on screen than a few pixels, as glass.
 */
export function Sketch({ shape, turns, color, selected, flat = false }: { shape: SketchShape; turns: number; color: string; selected: boolean; flat?: boolean }) {
  const grown = useRef<Group>(null);
  useFrame(({ camera }) => {
    const g = grown.current;
    if (!g) return;
    const k = flat ? minimumScale(shape.size, camera.zoom).across : 1;
    g.scale.set(k, k, k);
  });
  const width = selected ? 2.5 : 1.6;
  const at = (points: SketchLine['points'], closed?: boolean): Vec3[] => [...points, ...(closed ? [points[0]] : [])].map(([x, y]) => [x, y, SKETCH_Z]);
  const r = shape.apertureMm;
  return (
    <group rotation={[0, 0, (turns * Math.PI) / 2 + (shape.at45 ? -Math.PI / 4 : 0)]}>
      <group ref={grown}>
        {shape.lines.map((l, i) => (
          <group key={i}>
            {l.fill && <Fill line={l} />}
            <Line points={at(l.points, l.closed)} color={color} lineWidth={l.faint ? 1 : width} transparent={l.faint} opacity={l.faint ? 0.6 : 1} dashed={l.dashed} dashSize={2} gapSize={1.5} />
          </group>
        ))}
        {shape.cone && <LightCone cone={shape.cone} />}
        {!flat && shape.solids?.map((s, i) => <SketchBody key={i} solid={s} color={color} />)}
        {!flat && r > 0 && (
          <>
            <Line points={RING.map(([x, y, z]): Vec3 => [x, y * r, z * r])} color={color} lineWidth={1} transparent opacity={0.55} />
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <circleGeometry args={[r, 48]} />
              <meshBasicMaterial color={color} transparent opacity={0.07} depthWrite={false} side={DoubleSide} />
            </mesh>
          </>
        )}
      </group>
      {/* The foci, along the light: small crosses. */}
      {selected && shape.foci.map((f) => <Line key={f} points={[[f - 2, -2, SKETCH_Z], [f + 2, 2, SKETCH_Z], [f, 0, SKETCH_Z], [f - 2, 2, SKETCH_Z], [f + 2, -2, SKETCH_Z]]} color={color} lineWidth={1.5} />)}
    </group>
  );
}

/** A part in a cube with no mesh to show (or while it loads, or when it failed): a plain box. */
export function Placeholder({ color, outline }: { color: string; outline: string | null }) {
  return (
    <mesh>
      <boxGeometry args={[CUBE_MM - 4, CUBE_MM - 4, CUBE_MM - 4]} />
      <meshStandardMaterial color={color} transparent opacity={0.55} roughness={0.8} />
      <Outline color={outline} />
    </mesh>
  );
}

/** One failed mesh shows its placeholder; the rest of the scene carries on. */
export class MeshBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError = () => ({ failed: true });
  render = () => (this.state.failed ? this.props.fallback : this.props.children);
}

/** What draws a module's components: their outlines, and the one under the pointer. */
export interface ComponentHighlight {
  /** The component the pointer is on, by key. */
  key: string | null;
  /** Its outline, when the module is not selected (the selection outlines all of it). */
  outline: string;
  tint: string;
}

/** Drawn over a component the pointer is on: a tint that shows through its own material, on top of the outline. */
const tint = (color: string) => <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />;

/** Never picked: the tint is not part of the module. */
const noPick = () => null;

/** One component of a module, as its pieces; outlined, and tinted when the pointer is on it. */
export function ComponentMesh({ component, outline, tinted, visible = true }: { component: MeshComponent; outline: string | null; tinted: string | null; visible?: boolean }) {
  const key = component.info.key;
  return (
    <group visible={visible}>
      {component.pieces.map((p, i) => (
        <mesh key={i} geometry={p.geometry} material={p.material} userData={{ [COMPONENT_KEY]: key }}>
          <Outline color={outline} />
        </mesh>
      ))}
      {tinted &&
        component.pieces.map((p, i) => (
          <mesh key={`tint-${i}`} geometry={p.geometry} raycast={noPick} renderOrder={1}>
            {tint(tinted)}
          </mesh>
        ))}
    </group>
  );
}

interface ModuleMeshProps {
  mesh: MeshRef;
  turns: number;
  outline: string | null;
  highlight?: ComponentHighlight;
  /** The group the components are drawn in, for picking one under the pointer (see Part). */
  pickRef?: Ref<Group>;
}

function ModuleMesh({ mesh, turns, outline, highlight, pickRef }: ModuleMeshProps) {
  const { components: store } = useModuleMesh(mesh.url);
  // A holder generated here: its parts, in the empty cube.
  const holder = useHolderComponents(mesh.holder);
  const components = useMemo(() => (holder.length ? [...store, ...holder] : store), [store, holder]);
  const quaternion = useMemo(() => new Quaternion().setFromRotationMatrix(poseMatrix(mesh.axes, turns)), [mesh.axes, turns]);
  return (
    <group quaternion={quaternion} ref={pickRef}>
      {components.map((c) => {
        const on = highlight?.key === c.info.key;
        // The selection outlines the whole module; the pointer, only what it is on.
        return <ComponentMesh key={c.info.key} component={c} outline={outline ?? (on ? highlight.outline : null)} tinted={on ? highlight.tint : null} />;
      })}
    </group>
  );
}

/** The module's real mesh, turned into its seat; a plain box while it loads or if it fails. */
export function Solid({ mesh, turns, outline, placeholder, highlight, pickRef }: ModuleMeshProps & { placeholder: string }) {
  const box = <Placeholder color={placeholder} outline={outline} />;
  // Keyed by file: a part switched to another module tries its new mesh afresh.
  return (
    <MeshBoundary key={mesh.url} fallback={box}>
      <Suspense fallback={box}>
        <ModuleMesh mesh={mesh} turns={turns} outline={outline} highlight={highlight} pickRef={pickRef} />
      </Suspense>
    </MeshBoundary>
  );
}

/**
 * A beam: a thick line with a soft glow and an arrow on its first leg; its
 * last run, when it goes into nothing, dashed and faint; and a dashed hint to
 * the part it misses.
 */
/** A light path; `faint`: another path is looked at (Simulate), so this one steps back. */
export function Ray({ ray, color, warning, faint = false }: { ray: PlacedRay; color: string; warning: string; faint?: boolean }) {
  const opacity = ray.ghost || faint ? 0.25 : 1;
  const lit = ray.open ? ray.points.slice(0, -1) : ray.points;
  const runOut = ray.open ? ray.points.slice(-2) : null;
  const [a, b] = ray.points;
  const middle: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const leg = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const arrow = leg.lengthSq() > 0 ? new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), leg.normalize()) : null;
  return (
    <group>
      {lit.length > 1 && (
        <>
          <Line points={lit} color={color} lineWidth={8} transparent opacity={0.16 * opacity} depthWrite={false} />
          <Line points={lit} color={color} lineWidth={2.5} transparent={opacity < 1} opacity={opacity} />
        </>
      )}
      {runOut && <Line points={runOut} color={color} lineWidth={2} dashed dashSize={8} gapSize={6} transparent opacity={0.45 * opacity} />}
      {ray.miss && <Line points={ray.miss} color={warning} lineWidth={1.5} dashed dashSize={6} gapSize={6} transparent opacity={0.9 * opacity} />}
      {arrow && (
        <mesh position={middle} quaternion={arrow}>
          <coneGeometry args={[4, 10, 16]} />
          <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      )}
    </group>
  );
}

/** The current layer's floor: a faint rectangle under its parts. */
export function LayerFloor({ floor, color }: { floor: Floor; color: string }) {
  const { x0, y0, x1, y1, z } = floor;
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, z]}>
        <planeGeometry args={[x1 - x0, y1 - y0]} />
        <meshBasicMaterial color={color} transparent opacity={0.07} depthWrite={false} side={DoubleSide} />
      </mesh>
      <Line
        points={[
          [x0, y0, z],
          [x1, y0, z],
          [x1, y1, z],
          [x0, y1, z],
          [x0, y0, z],
        ]}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.45}
      />
    </group>
  );
}
