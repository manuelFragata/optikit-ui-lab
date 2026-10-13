import type { ThreeEvent } from '@react-three/fiber';
import { CUBE_MM, type PlacedPart } from './layout3d';
import type { SceneColors } from './colors';
import { CubeEdges, GlassCube, Glyph, Placeholder, Solid } from './shapes';

export interface PartProps {
  part: PlacedPart;
  colors: SceneColors;
  hovered: boolean;
  /** Set when a press lands on a part, so the scene does not start a box selection. */
  pressed: { current: boolean };
  onSelect: (id: string, toggle: boolean) => void;
  onInspect: (id: string) => void;
  onHover: (id: string | null) => void;
}

/**
 * One part in 3D. An invisible cube takes the clicks: the drawn meshes never
 * do, so picking is cheap and the same at every fidelity (ghosts take none,
 * so clicks pass through other layers). Then the part is drawn as its look says.
 */
export function Part({ part: p, colors, hovered, pressed, onSelect, onInspect, onHover }: PartProps) {
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
        onPointerDown={() => (pressed.current = true)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.delta > 4) return; // the end of a drag, not a click
          onSelect(p.id, e.nativeEvent.shiftKey || e.nativeEvent.ctrlKey || e.nativeEvent.metaKey);
        }}
        onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onInspect(p.id);
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
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
