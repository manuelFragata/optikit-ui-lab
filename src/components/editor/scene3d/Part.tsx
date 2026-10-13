import type { ThreeEvent } from '@react-three/fiber';
import { CUBE_MM, type PlacedPart } from './layout3d';
import type { SceneColors } from './colors';
import { MOVE_HANDLE } from './MoveHandles';
import { CubeEdges, GlassCube, Glyph, Placeholder, Solid } from './shapes';

export interface PartProps {
  part: PlacedPart;
  colors: SceneColors;
  hovered: boolean;
  /** A press on the part: the start of a click, or of a drag (see useMoveDrag). */
  onPress: (part: PlacedPart, e: ThreeEvent<PointerEvent>) => void;
  onSelect: (id: string, toggle: boolean) => void;
  onInspect: (id: string) => void;
  onHover: (id: string | null) => void;
}

/** The pointer is also on a move arrow (behind this part, or inside its cube): the arrow takes it. */
const onArrow = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.intersections.some((i) => i.object.userData[MOVE_HANDLE]);

/**
 * One part in 3D. An invisible cube takes the pointer: the drawn meshes never
 * do, so picking is cheap and the same at every fidelity (ghosts take none,
 * so the pointer passes through other layers). Then the part is drawn as its
 * look says.
 */
export function Part({ part: p, colors, hovered, onPress, onSelect, onInspect, onHover }: PartProps) {
  const outline = p.selected ? colors.accent : hovered ? colors.meta : null;
  const glyph = <Glyph kind={p.kind} turns={p.turns} color={colors.glyphs[p.kind]} outline={outline} scale={p.look === 'cube' ? 0.8 : 1} />;

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
        onPointerDown={(e: ThreeEvent<PointerEvent>) => !onArrow(e) && onPress(p, e)}
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
          onHover(p.id);
        }}
        onPointerOut={() => onHover(null)}
      >
        <boxGeometry args={[CUBE_MM, CUBE_MM, CUBE_MM]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      {p.cage && <CubeEdges color={p.selected ? colors.accent : p.mounted ? colors.meta : colors.warning} width={p.selected ? 2 : 1.2} dashed={!p.mounted} />}

      {p.look === 'symbol' && glyph}
      {p.look === 'cube' && (
        <>
          <GlassCube color={colors.placeholder} />
          {glyph}
        </>
      )}
      {p.look === 'placeholder' && <Placeholder color={colors.placeholder} outline={outline} />}
      {p.look === 'solid' && p.mesh && <Solid mesh={p.mesh} turns={p.turns} outline={outline} placeholder={colors.placeholder} />}
    </group>
  );
}
