import { useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { PerspectiveCamera, Vector3, type Group } from 'three';
import type { Size } from '../../../settings/preferences';
import { CUBE_MM, type MoveAxis, type Vec3 } from './layout3d';

/** Axis colours as in most CAD tools: x red, y green, z blue. */
const COLOR: Record<MoveAxis, string> = { x: '#E5484D', y: '#30A46C', z: '#3E63DD' };
/** Turns an arrow drawn along y to lie along its axis (document frame). */
const ROTATION: Record<MoveAxis, Vec3> = { x: [0, 0, -Math.PI / 2], y: [0, 0, 0], z: [Math.PI / 2, 0, 0] };

/** The arrows' length on screen, as a factor on their 55 px (Settings). */
const SCALE: Record<Size, number> = { small: 0.75, medium: 1, large: 1.35 };

/** Marks an arrow's grab area, so a part in front of it lets the arrow take the pointer (see Part). */
export const MOVE_HANDLE = 'moveHandle';

/**
 * Move arrows on the selection, one per axis it may move along, starting
 * at the cube's face. The arrows are drawn in screen pixels (about 55 px
 * long at any zoom), over everything (no depth test) so the parts never
 * hide them, and a wide invisible shaft makes each easy to grab.
 */
export function MoveHandles({ at, axes, size, onPress }: { at: Vec3; axes: MoveAxis[]; size: Size; onPress: (axis: MoveAxis, e: ThreeEvent<PointerEvent>) => void }) {
  const [hovered, setHovered] = useState<MoveAxis | null>(null);
  const arrows = useRef<(Group | null)[]>([]);
  // One unit of the arrows' geometry is one pixel on screen (at medium), at their distance from the camera.
  useFrame(({ camera, size: frame }) => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const mmPerPx = ((2 * Math.tan((camera.fov * Math.PI) / 360)) / frame.height) * SCALE[size];
    for (const arrow of arrows.current) {
      if (arrow) arrow.scale.setScalar(camera.position.distanceTo(arrow.getWorldPosition(new Vector3())) * mmPerPx);
    }
  });
  return (
    <group position={at}>
      {axes.map((axis, i) => {
        const look = <meshBasicMaterial color={COLOR[axis]} transparent opacity={hovered === axis ? 1 : 0.8} depthTest={false} />;
        return (
          <group key={axis} rotation={ROTATION[axis]}>
            {/* From the cube's face outwards, in px: a gap, the shaft, the head. */}
            <group ref={(g) => void (arrows.current[i] = g)} position={[0, CUBE_MM / 2, 0]}>
              <mesh position={[0, 25, 0]} renderOrder={10}>
                <cylinderGeometry args={[1.5, 1.5, 38, 8]} />
                {look}
              </mesh>
              <mesh position={[0, 50, 0]} renderOrder={10}>
                <coneGeometry args={[5, 14, 16]} />
                {look}
              </mesh>
              <mesh
                position={[0, 31, 0]}
                userData={{ [MOVE_HANDLE]: true }}
                onPointerDown={(e) => onPress(axis, e)}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHovered(axis);
                }}
                onPointerOut={() => setHovered(null)}
              >
                <cylinderGeometry args={[8, 8, 54, 8]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}
