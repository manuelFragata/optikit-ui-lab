import { useEffect, useMemo, useRef } from 'react';
import { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import { Box3, Sphere, Vector3 } from 'three';
import type { CanvasTool } from '../viewOptions';
import { toThree, type Box } from './layout3d';

/** Camera moves the dock and the keys ask for. */
export type CameraMove = 'top' | 'front' | 'right' | 'iso' | 'fit' | 'fitSelection' | 'in' | 'out';

/** A camera move to make; `n` counts them, so asking for the same move twice moves twice. */
export interface CameraCommand {
  move: CameraMove;
  n: number;
}

/** Preset views as camera-controls angles (three.js frame): azimuth 0 looks from the document's −y, polar 0 straight down. */
const VIEWS = {
  top: { azimuth: 0, polar: 0.0001 },
  front: { azimuth: 0, polar: Math.PI / 2 },
  right: { azimuth: Math.PI / 2, polar: Math.PI / 2 },
  iso: { azimuth: -Math.PI / 4, polar: 0.96 },
} as const;

/** A document-frame box (mm) as a three.js box. */
const threeBox = (b: Box) => new Box3().setFromPoints([new Vector3(...toThree(b.min)), new Vector3(...toThree(b.max))]);

export interface CameraProps {
  tool: CanvasTool;
  command?: CameraCommand;
  /** What "fit" frames: everything drawn, and the selection (document mm). */
  bounds: { all: Box | null; selection: Box | null };
  /** The button that orbits; the other one (right or middle) pans. */
  orbitButton: 'right' | 'middle';
  /** Wheel up zooms out. */
  invertZoom: boolean;
}

/**
 * The camera, on CameraControls: smooth moves, fit, zoom to the cursor.
 * Right drag orbits, middle drag pans (or the other way round), the wheel zooms; the left button
 * belongs to the tool (select: nothing, so clicks and box selection work).
 * It opens on an angled view of the whole design.
 */
export function Camera({ tool, command, bounds, orbitButton, invertZoom }: CameraProps) {
  const ref = useRef<CameraControlsImpl>(null);
  // Rebuilt only when the extent changes (compared by value: layout3d returns new objects every time).
  const allKey = JSON.stringify(bounds.all);
  const selectionKey = JSON.stringify(bounds.selection);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the box is compared by value, through allKey
  const all = useMemo(() => bounds.all && threeBox(bounds.all), [allKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the box is compared by value, through selectionKey
  const selection = useMemo(() => bounds.selection && threeBox(bounds.selection), [selectionKey]);

  // Mouse buttons, per tool and as set in Settings.
  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;
    const { ACTION } = CameraControlsImpl;
    controls.mouseButtons.left = tool === 'pan' ? ACTION.TRUCK : tool === 'zoom' ? ACTION.DOLLY : ACTION.NONE;
    controls.mouseButtons.right = orbitButton === 'right' ? ACTION.ROTATE : ACTION.TRUCK;
    controls.mouseButtons.middle = orbitButton === 'middle' ? ACTION.ROTATE : ACTION.TRUCK;
    controls.mouseButtons.wheel = ACTION.DOLLY;
    controls.dollySpeed = invertZoom ? -1 : 1;
    controls.dollyToCursor = true;
  }, [tool, orbitButton, invertZoom]);

  const move = (m: CameraMove, smooth: boolean) => {
    const controls = ref.current;
    if (!controls) return;
    // Fit a sphere around the box: it keeps the view's angle (fitToBox snaps to the nearest axis), a little roomier for the dock and labels.
    const fit = (box: Box3 | null) => {
      if (!box) return;
      const sphere = box.getBoundingSphere(new Sphere());
      sphere.radius *= 1.12;
      controls.fitToSphere(sphere, smooth);
    };
    if (m === 'in' || m === 'out') return void controls.dolly((m === 'in' ? 0.25 : -0.33) * controls.distance, smooth);
    if (m === 'fit') return fit(all);
    if (m === 'fitSelection') return fit(selection ?? all);
    controls.rotateTo(VIEWS[m].azimuth, VIEWS[m].polar, smooth);
    fit(selection ?? all);
  };

  // The first view: angled, the whole design, no animation.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !all) return;
    opened.current = true;
    move('iso', false);
  });

  // Only a new command moves the camera: a new selection on its own does not.
  useEffect(() => {
    if (command) move(command.move, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new command (its count) moves the camera
  }, [command?.n]);

  return <CameraControls ref={ref} makeDefault minDistance={60} maxDistance={12000} maxPolarAngle={Math.PI / 2} smoothTime={0.3} />;
}
