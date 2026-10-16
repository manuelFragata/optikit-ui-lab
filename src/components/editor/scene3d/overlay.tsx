/**
 * What is drawn over the 3D canvas as DOM: the names, the selection's
 * action bar, the box being dragged out to select, and the hint. DOM keeps
 * text sharp and themed. `Projector` (inside the canvas) moves the pinned
 * elements to where their points land on screen as the camera moves.
 */
import { useEffect, type ReactNode, type RefObject } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ThreeDRotationIcon from '@mui/icons-material/ThreeDRotation';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { RayColors } from '../../../theme/tokens';
import type { Size } from '../../../settings/preferences';
import type { HintPlace } from '../viewOptions';
import { toThree, type PlacedLabel, type Vec3 } from './layout3d';
import type { Rect } from './useBoxSelect';

export type ScreenPoint = { x: number; y: number; behind: boolean };
export type Project = (p: Vec3) => ScreenPoint;
/** The overlay elements that follow a point in the scene, by key (a label's key, or the action bar's). */
export type Pins = Map<string, HTMLElement>;

/** A ref that pins an element under `key` while it is mounted. */
const pin = (pins: Pins, key: string) => (el: HTMLElement | null) => {
  if (!el) return;
  pins.set(key, el);
  return () => void pins.delete(key);
};

/**
 * Inside the canvas: on every frame, moves each pinned element to where its
 * point (by key) lands on screen, or hides it while the point is behind the
 * camera. The elements are moved directly, in the same frame as the scene is
 * drawn, so they keep up with the camera; through React state they would
 * trail it by a frame, and jitter. Also shares the projection through
 * `project` (for box selection).
 */
export function Projector({ project, points, pins }: { project: RefObject<Project | null>; points: Record<string, Vec3>; pins: Pins }) {
  const { camera, size, invalidate } = useThree();
  const toScreen: Project = (p) => {
    const v = new Vector3(...toThree(p)).project(camera);
    return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height, behind: v.z > 1 };
  };
  useEffect(() => {
    project.current = toScreen;
    // New points or new elements: place them now, not on the camera's next move.
    invalidate();
  });
  useFrame(() => {
    for (const [key, el] of pins) {
      const at = points[key] && toScreen(points[key]);
      el.style.visibility = at && !at.behind ? 'visible' : 'hidden';
      if (at) el.style.transform = `translate(${Math.round(at.x)}px, ${Math.round(at.y)}px)`;
    }
  });
  return null;
}

/** Where a pinned element sits until its first frame places it: top left, hidden. */
const pinnedSx = { position: 'absolute', left: 0, top: 0, visibility: 'hidden' } as const;

/** The colour each kind of label reads in. */
const toneColor = (l: PlacedLabel, rays: RayColors) =>
  ({
    part: 'var(--mui-palette-text-secondary)',
    selected: 'var(--mui-palette-primary-main)',
    layer: 'var(--mui-palette-primary-main)',
    ray: l.color ? rays[l.color] : 'inherit',
  })[l.tone];

/** Name sizes in px: the same on screen at any zoom. */
const LABEL_PX: Record<Size, number> = { small: 10, medium: 12, large: 15 };

/** The names, each pinned to its point on screen. */
export function Labels({ labels, pins, rays, size }: { labels: PlacedLabel[]; pins: Pins; rays: RayColors; size: Size }) {
  return labels.map((l) => (
    <Box key={l.key} ref={pin(pins, l.key)} sx={{ ...pinnedSx, zIndex: 1 }}>
      <Box
        sx={{
          transform: l.below ? 'translate(-50%, 6px)' : 'translate(-50%, -100%)',
          px: 0.75,
          borderRadius: 1,
          typography: 'caption',
          fontSize: LABEL_PX[size],
          fontWeight: l.tone === 'part' || l.tone === 'ray' ? 500 : 600,
          lineHeight: 1.4,
          color: toneColor(l, rays),
          bgcolor: 'color-mix(in srgb, var(--mui-palette-background-paper) 82%, transparent)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {l.text}
      </Box>
    </Box>
  ));
}

/** The selection's action bar, just under its anchor (the bottom of the selection), pinned under `pinKey`. */
export function ActionBar({ pins, pinKey, children }: { pins: Pins; pinKey: string; children: ReactNode }) {
  return (
    <Box ref={pin(pins, pinKey)} sx={{ ...pinnedSx, zIndex: 3 }}>
      <Box sx={{ transform: 'translate(-50%, 16px)' }}>{children}</Box>
    </Box>
  );
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
export function Hint({ children, place }: { children: ReactNode; place?: HintPlace }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'absolute',
        left: place?.left ?? '50%',
        top: (t) => place?.top ?? t.spacing(2.5),
        maxWidth: place?.maxWidth,
        width: place ? 'max-content' : undefined,
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: (t) => `${t.radius.tile}px`,
        pointerEvents: 'none',
        whiteSpace: place ? 'normal' : 'nowrap',
        zIndex: 3,
      }}
    >
      <ThreeDRotationIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      <Typography variant="body2">{children}</Typography>
    </Paper>
  );
}
