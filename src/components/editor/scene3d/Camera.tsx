import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import { Box3, Sphere, Vector3 } from 'three';
import type { CanvasTool } from '../viewOptions';
import { toThree, type Box } from './layout3d';

/** Camera moves the dock and the keys ask for; `actual`: 2D at 100 %. */
export type CameraMove = 'top' | 'front' | 'right' | 'iso' | 'fit' | 'fitSelection' | 'in' | 'out' | 'actual';

/**
 * 2D at 100 %: a cube 96 px across, so a lens's shape reads at a glance (a
 * Ø25 lens is about 48 px). Not the true size on screen: the drawing is to
 * scale with itself, and 100 % is a size to work at. Pixels per mm.
 */
export const PX_PER_MM = 96 / 50;
/** How far 2D zooms out and in, as a share of 100 %: as the schematic did. */
const ZOOM_RANGE = [0.2, 5] as const;
/** 2D: the room kept round a fitted drawing, px: for the names, and clear of the toolbar, the dock, and the layer preview on the right. */
const FIT_MARGIN_PX = { left: 100, right: 360, top: 110, bottom: 110 };
/** …and on a small canvas, with no panels over it (a preview): a little room all round. */
const FIT_MARGIN_SMALL_PX = { left: 40, right: 40, top: 40, bottom: 40 };
/** 2D: how much one click of the zoom tool zooms. */
const ZOOM_STEP = 1.25;

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
  /** 2D: straight down on a camera without perspective; the orbit button pans, and nothing turns. */
  flat?: boolean;
  /** 2D: the zoom as it changes, 1 = 100 %. */
  onZoom?: (zoom: number) => void;
}

/**
 * The camera, on CameraControls: smooth moves, fit, zoom to the cursor.
 * Right drag orbits, middle drag pans (or the other way round), the wheel zooms; the left button
 * belongs to the tool (select: nothing, so clicks and box selection work).
 * It opens on an angled view of the whole design (3D), or from the top (2D).
 */
export function Camera({ tool, command, bounds, orbitButton, invertZoom, flat = false, onZoom }: CameraProps) {
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
    // Without perspective, coming closer changes nothing on screen: the camera zooms instead; and 2D never turns.
    const zoom = flat ? ACTION.ZOOM : ACTION.DOLLY;
    const orbit = flat ? ACTION.TRUCK : ACTION.ROTATE;
    // 2D zooms as the schematic did (see below): the controls only pan there.
    controls.mouseButtons.left = tool === 'pan' ? ACTION.TRUCK : tool === 'zoom' && !flat ? zoom : ACTION.NONE;
    controls.mouseButtons.right = orbitButton === 'right' ? orbit : ACTION.TRUCK;
    controls.mouseButtons.middle = orbitButton === 'middle' ? orbit : ACTION.TRUCK;
    controls.mouseButtons.wheel = flat ? ACTION.NONE : zoom;
    controls.dollySpeed = invertZoom ? -1 : 1;
    controls.dollyToCursor = true;
  }, [tool, orbitButton, invertZoom, flat]);

  // 2D zooms as the schematic did: at once, about the point under the pointer, the wheel by its turn, the zoom tool a
  // step a click (Alt: out). The controls' own zoom eases and drifts.
  const { gl, size, invalidate } = useThree();
  const latest = useRef({ invertZoom, tool });
  latest.current = { invertZoom, tool };
  useEffect(() => {
    const el = gl.domElement;
    if (!flat) return;
    const zoomAt = (factor: number, e: { clientX: number; clientY: number }) => {
      const controls = ref.current;
      if (!controls) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - r.left - r.width / 2;
      const dy = e.clientY - r.top - r.height / 2;
      const z0 = controls.camera.zoom;
      const z1 = Math.min(PX_PER_MM * ZOOM_RANGE[1], Math.max(PX_PER_MM * ZOOM_RANGE[0], z0 * factor));
      // Seen from the top: screen right is +x, screen down is +z. The point under the pointer stays there.
      const k = 1 / z0 - 1 / z1;
      const t = controls.getTarget(new Vector3());
      controls.zoomTo(z1, false);
      controls.moveTo(t.x + dx * k, t.y, t.z + dy * k, false);
      // The canvas draws on demand: ask for the frame.
      invalidate();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(Math.exp((latest.current.invertZoom ? 1 : -1) * e.deltaY * 0.0015), e);
    };
    const onClick = (e: MouseEvent) => {
      if (latest.current.tool === 'zoom' && e.button === 0) zoomAt(e.altKey ? 1 / ZOOM_STEP : ZOOM_STEP, e);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('click', onClick);
    };
  }, [gl, flat, invalidate]);

  // 2D: say the zoom when it changes (as a whole percent, so a pan says nothing).
  const said = useRef(0);
  useEffect(() => {
    const controls = ref.current;
    if (!controls || !flat || !onZoom) return;
    const say = () => {
      const z = Math.round((controls.camera.zoom / PX_PER_MM) * 100) / 100;
      if (z !== said.current) onZoom((said.current = z));
    };
    controls.addEventListener('update', say);
    say();
    return () => controls.removeEventListener('update', say);
  }, [flat, onZoom]);

  const move = (m: CameraMove, smooth: boolean) => {
    const controls = ref.current;
    if (!controls) return;
    // Fit a sphere around the box: it keeps the view's angle (fitToBox snaps to the nearest axis), a little roomier for the dock and labels.
    const fit = (box: Box3 | null) => {
      if (!box) return;
      // 2D fits as the schematic did: the drawing with a margin, never closer than 100 %. Only once the canvas has a size.
      if (flat) {
        if (!size.width || !size.height) return;
        const c = box.getCenter(new Vector3());
        const s = box.getSize(new Vector3());
        const m = size.width < 900 ? FIT_MARGIN_SMALL_PX : FIT_MARGIN_PX;
        const zoom = Math.max(PX_PER_MM * ZOOM_RANGE[0], Math.min(PX_PER_MM, Math.max(1, size.width - m.left - m.right) / s.x, Math.max(1, size.height - m.top - m.bottom) / s.z));
        // Centred in the room the margins leave: the view's middle is that much the other way.
        controls.zoomTo(zoom, smooth);
        controls.moveTo(c.x + (m.right - m.left) / 2 / zoom, c.y, c.z + (m.bottom - m.top) / 2 / zoom, smooth);
        return;
      }
      const sphere = box.getBoundingSphere(new Sphere());
      sphere.radius *= 1.12;
      controls.fitToSphere(sphere, smooth);
    };
    if (m === 'in' || m === 'out') {
      if (flat) return void controls.zoomTo(Math.min(PX_PER_MM * ZOOM_RANGE[1], Math.max(PX_PER_MM * ZOOM_RANGE[0], controls.camera.zoom * (m === 'in' ? ZOOM_STEP : 1 / ZOOM_STEP))), smooth);
      return void controls.dolly((m === 'in' ? 0.25 : -0.33) * controls.distance, smooth);
    }
    if (m === 'actual') return void (flat && controls.zoomTo(PX_PER_MM, smooth));
    if (m === 'fit') return fit(all);
    if (m === 'fitSelection') return fit(selection ?? all);
    // 2D stays on top.
    const angles = VIEWS[flat ? 'top' : m];
    controls.rotateTo(angles.azimuth, angles.polar, smooth);
    fit(selection ?? all);
  };

  // The first view: the whole design, angled (3D) or from the top (2D), no animation.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    const controls = ref.current;
    if (flat && controls) {
      controls.rotateTo(VIEWS.top.azimuth, VIEWS.top.polar, false);
      controls.zoomTo(PX_PER_MM, false);
    }
    // 2D fits to the canvas: not before it has a size (it has none for a moment when the view switches).
    if (!all || (flat && !(size.width && size.height))) return;
    opened.current = true;
    move(flat ? 'top' : 'iso', false);
  });

  // Only a new command moves the camera: a new selection on its own does not, and nor does the last one when the view opens again.
  const done = useRef(command?.n);
  useEffect(() => {
    if (!command || command.n === done.current) return;
    done.current = command.n;
    move(command.move, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new command (its count) moves the camera
  }, [command?.n]);

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={60}
      maxDistance={12000}
      minZoom={PX_PER_MM * ZOOM_RANGE[0]}
      maxZoom={PX_PER_MM * ZOOM_RANGE[1]}
      maxPolarAngle={flat ? 0.0001 : Math.PI / 2}
      smoothTime={0.3}
      draggingSmoothTime={flat ? 0 : 0.125}
    />
  );
}
