/**
 * What things look like in 3D. These only draw what they are given (in the
 * document frame: mm, z up); what to draw where is decided in layout3d.ts.
 */
import { Component, Suspense, useEffect, useMemo, type ReactNode, type Ref } from 'react';
import { Line, Outlines } from '@react-three/drei';
import { DoubleSide, Quaternion, Vector3, type Group } from 'three';
import type { SymbolKind } from '../model';
import { CUBE_MM, type Floor, type MeshRef, type PlacedRay, type Vec3 } from './layout3d';
import { glassGeometries, glassMaterial, useHolderComponents } from './holderMesh';
import type { FragmentSurface } from '../holders/optic';
import { COMPONENT_KEY, poseMatrix, useModuleMesh, type MeshComponent } from './meshes';

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
 * A lens or mirror as its real glass, where the part sits: a lens across the
 * beam (its axis along +x before the seat turns it), a mirror at 45° as its
 * glyph lies.
 */
export function Glass({ surfaces, mirror, turns, outline }: { surfaces: FragmentSurface[]; mirror: boolean; turns: number; outline: string | null }) {
  const geometries = useMemo(() => glassGeometries(surfaces), [surfaces]);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
  return (
    <group rotation={[0, 0, (turns * Math.PI) / 2 + (mirror ? -Math.PI / 4 : 0)]}>
      {geometries.map((g, i) => (
        <mesh key={i} geometry={g} material={glassMaterial(i, mirror)}>
          <Outline color={outline} />
        </mesh>
      ))}
    </group>
  );
}

/** A translucent cube: the part at "cubes" fidelity, with its glyph inside. */
export function GlassCube({ color }: { color: string }) {
  return (
    <mesh>
      <boxGeometry args={[CUBE_MM - 1, CUBE_MM - 1, CUBE_MM - 1]} />
      <meshStandardMaterial color={color} transparent opacity={0.16} depthWrite={false} />
    </mesh>
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
export function Ray({ ray, color, warning }: { ray: PlacedRay; color: string; warning: string }) {
  const opacity = ray.ghost ? 0.25 : 1;
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
