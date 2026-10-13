/**
 * What is drawn over the 3D canvas as DOM: the names, the selection's
 * action bar, the box being dragged out to select, and the hint. DOM keeps
 * text sharp and themed. `Projector` (inside the canvas) tells where
 * document points land on screen as the camera moves.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ThreeDRotationIcon from '@mui/icons-material/ThreeDRotation';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { RayColors } from '../../../theme/tokens';
import { toThree, type PlacedLabel, type Vec3 } from './layout3d';

export type ScreenPoint = { x: number; y: number; behind: boolean };
export type Project = (p: Vec3) => ScreenPoint;
/** Screen positions by key (a label's key, or the action bar's). */
export type OnScreen = Record<string, ScreenPoint>;

/**
 * Inside the canvas: reports where `points` (by key) land on screen whenever
 * any of them moves, and shares the projection through `project` (for box
 * selection).
 */
export function Projector({ project, points, onPoints }: { project: RefObject<Project | null>; points: Record<string, Vec3>; onPoints: (at: OnScreen) => void }) {
  const { camera, size } = useThree();
  const toScreen: Project = (p) => {
    const v = new Vector3(...toThree(p)).project(camera);
    return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height, behind: v.z > 1 };
  };
  useEffect(() => {
    project.current = toScreen;
  });
  const last = useRef('');
  useFrame(() => {
    const at: OnScreen = Object.fromEntries(Object.entries(points).map(([key, p]) => [key, toScreen(p)]));
    const signature = Object.entries(at)
      .map(([key, a]) => `${key}:${Math.round(a.x)},${Math.round(a.y)},${a.behind}`)
      .join(' ');
    if (signature === last.current) return;
    last.current = signature;
    onPoints(at);
  });
  return null;
}

/** The colour each kind of label reads in. */
const toneColor = (l: PlacedLabel, rays: RayColors) =>
  ({
    part: 'var(--mui-palette-text-secondary)',
    selected: 'var(--mui-palette-primary-main)',
    layer: 'var(--mui-palette-primary-main)',
    ray: l.color ? rays[l.color] : 'inherit',
  })[l.tone];

/** The names, each pinned to its point on screen (a name is drawn once its position is known). */
export function Labels({ labels, at, rays }: { labels: PlacedLabel[]; at: OnScreen; rays: RayColors }) {
  return labels.map((l) => {
    const p = at[l.key];
    if (!p || p.behind) return null;
    return (
      <Box
        key={l.key}
        sx={{
          position: 'absolute',
          left: p.x,
          top: p.y,
          transform: l.below ? 'translate(-50%, 6px)' : 'translate(-50%, -100%)',
          px: 0.75,
          borderRadius: 1,
          typography: 'caption',
          fontWeight: l.tone === 'part' || l.tone === 'ray' ? 500 : 600,
          lineHeight: 1.4,
          color: toneColor(l, rays),
          bgcolor: 'color-mix(in srgb, var(--mui-palette-background-paper) 82%, transparent)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {l.text}
      </Box>
    );
  });
}

/** The selection's action bar, just under its anchor (the bottom of the selection); none while the anchor is behind the camera. */
export function ActionBar({ at, children }: { at: ScreenPoint; children: ReactNode }) {
  if (at.behind) return null;
  return <Box sx={{ position: 'absolute', left: at.x, top: at.y + 16, transform: 'translateX(-50%)', zIndex: 3 }}>{children}</Box>;
}

type Rect = { x0: number; y0: number; x1: number; y1: number };

/**
 * Box selection: a left drag that starts on empty space draws a rectangle;
 * on release, the parts whose centres fall inside it are selected (Shift adds).
 * Returns the rectangle to draw, the handler for the frame's pointer down,
 * and `consumeClick`, true once for the click that ends a box (not a deselect).
 */
export function useBoxSelect({
  frame,
  enabled,
  pressedOnPart,
  project,
  candidates,
  onSelect,
}: {
  frame: RefObject<HTMLElement | null>;
  enabled: boolean;
  pressedOnPart: { current: boolean };
  project: RefObject<Project | null>;
  candidates: { id: string; center: Vec3 }[];
  onSelect: (ids: string[], add: boolean) => void;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const justBoxed = useRef(false);
  // A drag in progress ends with the view: its window listeners go too.
  const stopDrag = useRef<() => void>(() => {});
  useEffect(() => () => stopDrag.current(), []);

  const onPointerDown = (e: ReactPointerEvent) => {
    // A new press: whatever the last one did is over.
    justBoxed.current = false;
    const onPart = pressedOnPart.current;
    pressedOnPart.current = false;
    if (!enabled || e.button !== 0 || onPart || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    const from = { x: e.clientX - r.left, y: e.clientY - r.top };
    let box: Rect | null = null;

    const move = (ev: PointerEvent) => {
      const x = ev.clientX - r.left;
      const y = ev.clientY - r.top;
      if (!box && Math.hypot(x - from.x, y - from.y) < 4) return;
      box = { x0: Math.min(from.x, x), y0: Math.min(from.y, y), x1: Math.max(from.x, x), y1: Math.max(from.y, y) };
      setRect(box);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    const up = (ev: PointerEvent) => {
      stop();
      setRect(null);
      const b = box;
      if (!b || !project.current) return;
      justBoxed.current = true;
      const inside = candidates.filter(({ center }) => {
        const p = project.current!(center);
        return p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1;
      });
      onSelect(
        inside.map((c) => c.id),
        ev.shiftKey,
      );
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    stopDrag.current = stop;
  };

  const consumeClick = () => {
    const boxed = justBoxed.current;
    justBoxed.current = false;
    return boxed;
  };

  return { rect, onPointerDown, consumeClick };
}

/** The rectangle being dragged out. */
export function Marquee({ rect }: { rect: Rect }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: rect.x0,
        top: rect.y0,
        width: rect.x1 - rect.x0,
        height: rect.y1 - rect.y0,
        border: '1px dashed',
        borderColor: 'primary.main',
        bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 8%, transparent)',
        pointerEvents: 'none',
      }}
    />
  );
}

/** The hint at the top of the canvas. */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'absolute',
        left: '50%',
        top: (t) => t.spacing(2.5),
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: (t) => `${t.radius.tile}px`,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        zIndex: 3,
      }}
    >
      <ThreeDRotationIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      <Typography variant="body2">{children}</Typography>
    </Paper>
  );
}
