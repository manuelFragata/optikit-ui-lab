import { useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import type { MoveAxis, Vec3 } from './layout3d';

/** Axis colours as in most CAD tools: x red, y green, z blue. */
const COLOR: Record<MoveAxis, string> = { x: '#E5484D', y: '#30A46C', z: '#3E63DD' };
/** Turns an arrow drawn along y to lie along its axis (document frame). */
const ROTATION: Record<MoveAxis, Vec3> = { x: [0, 0, -Math.PI / 2], y: [0, 0, 0], z: [Math.PI / 2, 0, 0] };

/** The camera distance (mm) at which the arrows are drawn at their own size; they keep that screen size at any zoom. */
const SIZE_AT = 700;

/** Marks an arrow's grab area, so a part in front of it lets the arrow take the pointer (see Part). */
export const MOVE_HANDLE = 'moveHandle';

/**
 * Move arrows on the selection, one per axis it may move along, starting
 * just outside the cube. They keep the same size on screen at any zoom, are
 * drawn over everything (no depth test) so the parts never hide them, and a
 * wide invisible shaft makes each easy to grab.
 */
export function MoveHandles({ at, axes, onPress }: { at: Vec3; axes: MoveAxis[]; onPress: (axis: MoveAxis, e: ThreeEvent<PointerEvent>) => void }) {
  const [hovered, setHovered] = useState<MoveAxis | null>(null);
  const ref = useRef<Group>(null);
  useFrame(({ camera }) => {
    const group = ref.current;
    if (group) group.scale.setScalar(camera.position.distanceTo(group.getWorldPosition(new Vector3())) / SIZE_AT);
  });
  return (
    <group ref={ref} position={at}>
      {axes.map((axis) => {
        const opacity = hovered === axis ? 1 : 0.8;
        const look = <meshBasicMaterial color={COLOR[axis]} transparent opacity={opacity} depthTest={false} />;
        return (
          <group key={axis} rotation={ROTATION[axis]}>
            <mesh position={[0, 52, 0]} renderOrder={10}>
              <cylinderGeometry args={[1.8, 1.8, 44, 12]} />
              {look}
            </mesh>
            <mesh position={[0, 81, 0]} renderOrder={10}>
              <coneGeometry args={[6, 14, 20]} />
              {look}
            </mesh>
            <mesh
              position={[0, 58, 0]}
              userData={{ [MOVE_HANDLE]: true }}
              onPointerDown={(e) => onPress(axis, e)}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(axis);
              }}
              onPointerOut={() => setHovered(null)}
            >
              <cylinderGeometry args={[9, 9, 60, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
