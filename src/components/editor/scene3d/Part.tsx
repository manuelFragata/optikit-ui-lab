import { useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Mesh, Raycaster, type Group } from 'three';
import { CUBE_MM, type PlacedPart } from './layout3d';
import type { SceneColors } from './colors';
import { COMPONENT_KEY } from './meshes';
import { MOVE_HANDLE } from './MoveHandles';
import { liesAt45 } from '../holders/designs';
import { CubeEdges, Glass, Glyph, Placeholder, Sketch, Solid } from './shapes';

export interface PartProps {
  /** 2D: optics keep a least size on screen when zoomed out. */
  flat?: boolean;
  part: PlacedPart;
  colors: SceneColors;
  hovered: boolean;
  /** The component of its module the pointer is on (solids only), by key. */
  hoveredComponent: string | null;
  /** A press on the part: the start of a click, or of a drag (see useMoveDrag). */
  onPress: (part: PlacedPart, e: ThreeEvent<PointerEvent>) => void;
  onSelect: (id: string, toggle: boolean) => void;
  /** A plain left press on the part (which selects it), and the component of its module it landed on. */
  onPickComponent: (id: string, component: string | null) => void;
  onInspect: (id: string) => void;
  /** The pointer came onto the part, or onto another of its components; `null` when it left. */
  onHover: (id: string | null, component?: string | null) => void;
  /** Takes no pointer: another tool than select is out (pan, zoom, measure), or a part is being placed. */
  inert?: boolean;
}

/** A mesh that takes no pointer; the default one is put back when it should again (a removed prop leaves none). */
const NO_RAYCAST = () => null;

/** The pointer is also on a move arrow (behind this part, or inside its cube): the arrow takes it. */
const onArrow = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.intersections.some((i) => i.object.userData[MOVE_HANDLE]);

/**
 * One part in 3D. An invisible cube takes the pointer: the drawn meshes never
 * do, so picking is cheap and the same for every look (ghosts take none,
 * so the pointer passes through other layers). Then the part is drawn as its
 * look says. A solid also tells which of its components (the enclosure, the
 * holder, the lens) is under the pointer: the cube's ray, cast against this
 * part's meshes only, and only while the pointer is on it.
 */
export function Part({ part: p, colors, flat = false, hovered, hoveredComponent, onPress, onSelect, onPickComponent, onInspect, onHover, inert = false }: PartProps) {
  const pick = useRef<Group>(null);
  const raycaster = useMemo(() => new Raycaster(), []);
  /** The component under the pointer, or `null` (not a solid, or the air inside the cube). */
  const componentAt = (e: ThreeEvent<PointerEvent | MouseEvent>): string | null => {
    if (p.look !== 'solid' || !pick.current) return null;
    raycaster.ray.copy(e.ray);
    const hit = raycaster.intersectObject(pick.current, true).find((h) => h.object.userData[COMPONENT_KEY]);
    return hit ? (hit.object.userData[COMPONENT_KEY] as string) : null;
  };

  // On a component: only it lights up. In the cube's air, or not a solid: the whole part.
  const outline = p.selected ? colors.accent : hovered && !hoveredComponent ? colors.meta : null;
  const glyph = <Glyph kind={p.kind} turns={p.turns} color={colors.glyphs[p.kind]} outline={outline} />;

  if (p.look === 'ghost') {
    return (
      <group position={p.center}>
        <CubeEdges color={colors.meta} opacity={0.35} />
      </group>
    );
  }

  return (
    <group position={p.center}>
      <mesh
        raycast={inert ? NO_RAYCAST : Mesh.prototype.raycast}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          if (onArrow(e)) return;
          const n = e.nativeEvent;
          if (n.button === 0 && !n.shiftKey && !n.ctrlKey && !n.metaKey) onPickComponent(p.id, componentAt(e));
          onPress(p, e);
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (onArrow(e)) return;
          e.stopPropagation();
          if (e.delta > 4) return; // the end of a drag, not a click
          onSelect(p.id, e.nativeEvent.shiftKey || e.nativeEvent.ctrlKey || e.nativeEvent.metaKey);
        }}
        onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onInspect(p.id);
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (onArrow(e)) return;
          e.stopPropagation();
          onHover(p.id, componentAt(e));
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          if (p.look !== 'solid' || onArrow(e)) return;
          e.stopPropagation();
          const component = componentAt(e);
          if (component !== hoveredComponent) onHover(p.id, component);
        }}
        onPointerOut={() => onHover(null)}
      >
        <boxGeometry args={[CUBE_MM, CUBE_MM, CUBE_MM]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      {p.cage && <CubeEdges color={p.selected ? colors.accent : p.mounted ? colors.meta : colors.warning} width={p.selected ? 2 : 1.2} dashed={!p.mounted} />}

      {/* An ideal part is line art, in the sketch colour: it is no glass yet. */}
      {p.look === 'sketch' && p.sketch && <Sketch shape={p.sketch} turns={p.turns} color={hovered && !p.selected ? colors.meta : colors.accent} selected={p.selected} flat={flat} />}
      {p.look === 'optic' && !p.mesh && (p.glass ? <Glass surfaces={p.glass} mirror={p.kind === 'mirror'} at45={liesAt45(p.kind)} turns={p.turns} outline={outline} flat={flat} /> : glyph)}
      {p.look === 'placeholder' && <Placeholder color={colors.placeholder} outline={outline} />}
      {(p.look === 'solid' || p.look === 'optic') && p.mesh && (
        <Solid
          mesh={p.mesh}
          turns={p.turns}
          outline={outline}
          placeholder={colors.placeholder}
          highlight={{ key: hovered ? hoveredComponent : null, outline: colors.meta, tint: colors.accent }}
          pickRef={pick}
        />
      )}
    </group>
  );
}
