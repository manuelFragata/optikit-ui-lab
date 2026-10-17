/**
 * The close-up's Optical side, in the canvas: the optic's glass on its own,
 * its axis along the light, each surface a thin skin tinted by its coating
 * (a bluish-violet sheen for an AR coating, the metal for a mirror) that can
 * be hovered and picked. Numbered as in the panel.
 */
import { useEffect, useMemo, type Ref } from 'react';
import { Html, Line, Outlines } from '@react-three/drei';
import { DoubleSide, LatheGeometry, MeshStandardMaterial, Vector2, type Group } from 'three';
import { sag, type CatalogRecord, type OpticShape } from '../holders/optic';
import { glassGeometries, glassMaterial } from '../scene3d/holderMesh';
import type { CoatingId, SurfaceInfo } from '../../../standins/kernel/coatings';

const SEGMENTS = 72;

/** How a coating looks on the glass. */
const SKIN: Record<CoatingId | 'cemented', { color: string; opacity: number; metal: boolean }> = {
  uncoated: { color: '#ffffff', opacity: 0.08, metal: false },
  mgf2: { color: '#b48ce0', opacity: 0.22, metal: false },
  'ar-a': { color: '#9a7ee8', opacity: 0.3, metal: false },
  'ar-b': { color: '#6fc0a8', opacity: 0.3, metal: false },
  'ar-c': { color: '#d6a46a', opacity: 0.3, metal: false },
  'al-protected': { color: '#c9ced6', opacity: 1, metal: true },
  'ag-protected': { color: '#eef0f3', opacity: 1, metal: true },
  'au-protected': { color: '#d9ad4f', opacity: 1, metal: true },
  'dielectric-e02': { color: '#7fb0e6', opacity: 1, metal: true },
  'dielectric-e03': { color: '#c98a6a', opacity: 1, metal: true },
  cemented: { color: '#ffffff', opacity: 0.12, metal: false },
};

const skins = new Map<string, MeshStandardMaterial>();
function skinMaterial(key: CoatingId | 'cemented'): MeshStandardMaterial {
  let m = skins.get(key);
  if (!m) {
    const s = SKIN[key];
    m = new MeshStandardMaterial({
      color: s.color,
      transparent: s.opacity < 1,
      opacity: s.opacity,
      metalness: s.metal ? 0.35 : 0.1,
      roughness: 0.3,
      side: DoubleSide,
      depthWrite: s.opacity >= 1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    skins.set(key, m);
  }
  return m;
}

/** A surface's skin: its sag profile from the axis to the rim, turned about the axis (+x, as the glass). */
function skinGeometry(shape: OpticShape, index: number): LatheGeometry {
  const steps = 32;
  const points = Array.from({ length: steps + 1 }, (_, k) => {
    const r = (shape.semiMm * k) / steps;
    return new Vector2(Math.max(r, 1e-4), shape.vertices[index] + sag(shape.radii[index], r));
  });
  return new LatheGeometry(points, SEGMENTS).rotateZ(-Math.PI / 2);
}

export interface OpticalViewProps {
  record: CatalogRecord;
  shape: OpticShape;
  infos: SurfaceInfo[];
  surface: number;
  hover: number | null;
  onHover: (index: number | null) => void;
  onPick: (index: number) => void;
  accent: string;
  meta: string;
  groupRef: Ref<Group>;
}

export function OpticalView({ record, shape, infos, surface, hover, onHover, onPick, accent, meta, groupRef }: OpticalViewProps) {
  const surfaces = record.fragmentSurfaces;
  const mirror = Boolean(surfaces[0]?.is_reflective);
  const glass = useMemo(() => glassGeometries(surfaces), [surfaces]);
  const skinsGeo = useMemo(() => shape.vertices.map((_, i) => skinGeometry(shape, i)), [shape]);
  useEffect(() => () => [...glass, ...skinsGeo].forEach((g) => g.dispose()), [glass, skinsGeo]);
  const reach = Math.max(40, shape.semiMm * 2.4);

  const last = infos.length - 1;
  /** Where a surface's number goes: before the front, after the back, above the rim between. */
  const labelAt = (i: number): [number, number, number] =>
    i === 0
      ? [Math.min(shape.front(0), shape.front(shape.semiMm)) - 4, 0, 0]
      : i === last && !mirror
        ? [Math.max(shape.back(0), shape.back(shape.semiMm)) + 4, 0, 0]
        : [shape.vertices[i] + sag(shape.radii[i], shape.semiMm), 0, shape.semiMm + 4];

  return (
    <>
      {/* Framed on the glass alone: the axis and labels reach past it. */}
      <group ref={groupRef}>
        {/* The glass itself, faint, so the skins read. */}
        {glass.map((g, i) => (
          <mesh key={i} geometry={g} material={glassMaterial(i, false)} raycast={() => null} />
        ))}
        {infos.map((s) => {
          const key = s.inLight ? (s.coating ?? 'cemented') : 'uncoated';
          const lit = s.index === surface || s.index === hover;
          return (
            <mesh
              key={s.index}
              geometry={skinsGeo[s.index]}
              material={skinMaterial(mirror && !s.inLight ? 'uncoated' : key)}
              onPointerMove={(e) => {
                e.stopPropagation();
                if (hover !== s.index) onHover(s.index);
              }}
              onPointerOut={() => onHover(null)}
              onClick={(e) => {
                e.stopPropagation();
                onPick(s.index);
              }}
            >
              {lit && <Outlines color={s.index === surface ? accent : meta} thickness={s.index === surface ? 2.5 : 1.5} screenspace />}
            </mesh>
          );
        })}
      </group>
      {/* Each surface's number. */}
      {infos.map((s) => (
        <Html key={`n${s.index}`} position={labelAt(s.index)} center style={{ pointerEvents: 'none' }}>
          <div
            style={{
              font: '600 11px/18px var(--mui-font-mono, ui-monospace, monospace)',
              width: 18,
              height: 18,
              textAlign: 'center',
              borderRadius: 9,
              color: s.index === surface ? 'var(--mui-palette-primary-contrastText)' : 'var(--mui-palette-text-secondary)',
              background: s.index === surface ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-background-paper)',
              border: '1px solid var(--mui-palette-divider)',
              opacity: s.inLight ? 1 : 0.5,
            }}
          >
            {s.index + 1}
          </div>
        </Html>
      ))}
      {/* The axis, and the way the light comes in. */}
      <Line
        points={[
          [-reach, 0, 0],
          [reach, 0, 0],
        ]}
        color={meta}
        lineWidth={1}
        dashed
        dashSize={3}
        gapSize={2}
      />
      <Html position={[-reach, 0, 0]} center style={{ pointerEvents: 'none' }}>
        <div
          style={{
            font: '11px/1 var(--mui-font-family, sans-serif)',
            color: 'var(--mui-palette-text-secondary)',
            whiteSpace: 'nowrap',
            transform: 'translateY(-12px)',
          }}
        >
          light →
        </div>
      </Html>
    </>
  );
}
