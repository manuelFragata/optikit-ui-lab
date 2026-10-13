import { useEffect, useRef, useState, type RefObject } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Raycaster, Vector2, type Camera } from 'three';
import type { Move } from '../model';
import { alongAxis, fromThree, hitPlane, stepAcross, stepAlong, type Ray3 } from './drag3d';
import { GRID_MM, type MoveAxis, type PlacedPart, type Vec3 } from './layout3d';

/** A move in progress, and whether it is off the grid (for the hint). */
export type Dragging = Move & { free: boolean };

export interface MoveDragOptions {
  /** The element the canvas fills, to turn pointer positions into rays. */
  frame: RefObject<HTMLElement | null>;
  /** Snap to the grid; Shift does the opposite while held. */
  snap: boolean;
  selectedIds: string[];
  /** A part pressed outside the selection is selected (with Shift, added) when its drag starts. */
  onSelect: (ids: string[]) => void;
  /** The drag ended: move the parts (or, with Alt, drop copies). One undo step. */
  onMove: (move: Move) => void;
}

/** The pointer's ray, in the document frame. */
function rayAt(clientX: number, clientY: number, camera: Camera, frame: DOMRect): Ray3 {
  const ndc = new Vector2(((clientX - frame.left) / frame.width) * 2 - 1, -((clientY - frame.top) / frame.height) * 2 + 1);
  const caster = new Raycaster();
  caster.setFromCamera(ndc, camera);
  return { origin: fromThree(caster.ray.origin.toArray() as Vec3), dir: fromThree(caster.ray.direction.toArray() as Vec3) };
}

/**
 * Dragging parts in 3D. Press on a part and drag: it slides across its
 * layer. Press on a move arrow: the selection moves along that axis. Either
 * way it lands on the grid (Shift: off it), Alt drops copies, Esc puts
 * everything back, and the move is one undo step when let go.
 */
export function useMoveDrag({ frame, snap, selectedIds, onSelect, onMove }: MoveDragOptions) {
  const [dragging, setDragging] = useState<Dragging | null>(null);
  // A drag in progress ends with the view: its window listeners go too.
  const stopDrag = useRef<() => void>(() => {});
  useEffect(() => () => stopDrag.current(), []);

  /** The gesture: past a few pixels it is a drag; `moveAt` says where things go for each pointer position. */
  const drag = (e: ThreeEvent<PointerEvent>, onStart: () => void, moveAt: (ray: Ray3, ev: PointerEvent) => Dragging | null) => {
    e.stopPropagation();
    if (!frame.current) return;
    const rect = frame.current.getBoundingClientRect();
    const camera = e.camera;
    const from = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
    let started = false;
    let last: Dragging | null = null;

    const move = (ev: PointerEvent) => {
      if (!started && Math.hypot(ev.clientX - from.x, ev.clientY - from.y) < 4) return;
      if (!started) onStart();
      started = true;
      last = moveAt(rayAt(ev.clientX, ev.clientY, camera, rect), ev) ?? last;
      setDragging(last);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', key, true);
      setDragging(null);
    };
    const up = () => {
      stop();
      const m = last;
      if (m && (m.copy || Object.values(m.by).some((v) => v !== 0))) onMove(m);
    };
    const key = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      ev.stopImmediatePropagation(); // before the editor's own Esc, which would deselect
      last = null;
      stop();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', key, true);
    stopDrag.current = stop;
  };

  /** Press on a part: it (with the selection, if it is in it) slides across its layer. */
  const startAcross = (part: PlacedPart, e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button !== 0 || !frame.current) return;
    const rect = frame.current.getBoundingClientRect();
    const ids = selectedIds.includes(part.id) ? selectedIds : e.nativeEvent.shiftKey ? [...selectedIds, part.id] : [part.id];
    const height = part.center[2];
    const start = hitPlane(rayAt(e.nativeEvent.clientX, e.nativeEvent.clientY, e.camera, rect), height);
    if (!start) return;
    const anchor = { x: part.center[0] / GRID_MM.x, y: part.center[1] / GRID_MM.y };
    drag(
      e,
      () => !selectedIds.includes(part.id) && onSelect(ids),
      (ray, ev) => {
        const at = hitPlane(ray, height);
        if (!at) return null;
        const free = snap === ev.shiftKey;
        return { ids, by: stepAcross(anchor, start, at, free), copy: ev.altKey, free };
      },
    );
  };

  /** Press on a move arrow: the selection moves along that axis, from `through` (the arrows' centre); `anchor` is a selected part's position on that axis, in grid units. */
  const startAlong = (axis: MoveAxis, through: Vec3, anchor: number, e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button !== 0 || !frame.current) return;
    const rect = frame.current.getBoundingClientRect();
    const start = alongAxis(rayAt(e.nativeEvent.clientX, e.nativeEvent.clientY, e.camera, rect), through, axis);
    if (start === null) return;
    drag(
      e,
      () => {},
      (ray, ev) => {
        const at = alongAxis(ray, through, axis);
        if (at === null) return null;
        const free = snap === ev.shiftKey;
        return { ids: selectedIds, by: { [axis]: stepAlong(axis, anchor, at - start, free) }, copy: ev.altKey, free };
      },
    );
  };

  return { dragging, startAcross, startAlong };
}
