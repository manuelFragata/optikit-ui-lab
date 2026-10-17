/**
 * What is drawn over the 3D canvas as DOM: the names, the selection's
 * action bar, the box being dragged out to select, and the hint. DOM keeps
 * text sharp and themed. `Projector` (inside the canvas) moves the pinned
 * elements to where their points land on screen as the camera moves.
 */
import { useEffect, type ReactNode, type Ref, type RefObject } from 'react';
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
 * `project` (for box selection). Names that would cover one another are
 * hidden, all but the first (see `declutter`).
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
    const shown: Shown[] = [];
    for (const [key, el] of pins) {
      const at = points[key] && toScreen(points[key]);
      const visible = Boolean(at && !at.behind);
      el.style.visibility = visible ? 'visible' : 'hidden';
      if (at) el.style.transform = `translate(${Math.round(at.x)}px, ${Math.round(at.y)}px)`;
      if (at && visible && el.dataset.priority) shown.push({ el, x: at.x, y: at.y });
    }
    declutter(shown);
  });
  return null;
}

interface Shown {
  el: HTMLElement;
  x: number;
  y: number;
}

/** A name's priority: one that must show (the layer, the selection, the part under the pointer, the rays) never gives way. */
const MUST_SHOW = 2;
/** Room kept between two names, px. */
const NAME_GAP = 2;

/**
 * Zoomed out, names pile up over one another and over the parts. Each that
 * would cover one already shown is hidden: those that must show first, then
 * the rest in their order. The hidden ones come back when there is room
 * again, or on hover.
 */
function declutter(shown: Shown[]) {
  const kept: { l: number; t: number; r: number; b: number }[] = [];
  const priority = (s: Shown) => Number(s.el.dataset.priority);
  for (const s of [...shown].sort((a, b) => priority(b) - priority(a))) {
    const name = s.el.firstElementChild as HTMLElement | null;
    if (!name) continue;
    const w = name.offsetWidth;
    const h = name.offsetHeight;
    const top = s.el.dataset.below ? s.y + 6 : s.y - h;
    const box = { l: s.x - w / 2, t: top, r: s.x + w / 2, b: top + h };
    const covers = kept.some((k) => box.l < k.r + NAME_GAP && box.r > k.l - NAME_GAP && box.t < k.b + NAME_GAP && box.b > k.t - NAME_GAP);
    if (covers && priority(s) < MUST_SHOW) {
      s.el.style.visibility = 'hidden';
      continue;
    }
    kept.push(box);
  }
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

/** The names, each pinned to its point on screen; `hovered`: the part under the pointer, whose name always shows. */
export function Labels({ labels, pins, rays, size, hovered = null }: { labels: PlacedLabel[]; pins: Pins; rays: RayColors; size: Size; hovered?: string | null }) {
  return labels.map((l) => (
    // The pin lets the pointer through: it would catch clicks meant for the part under it.
    <Box
      key={l.key}
      ref={pin(pins, l.key)}
      data-priority={l.tone === 'part' && l.key !== hovered ? 0 : MUST_SHOW}
      data-below={l.below ? '1' : undefined}
      sx={{ ...pinnedSx, zIndex: l.key === hovered ? 2 : 1, pointerEvents: 'none' }}
    >
      <Box
        sx={{
          transform: l.below ? 'translate(-50%, 6px)' : 'translate(-50%, -100%)',
          px: 0.75,
          borderRadius: 1,
          typography: 'caption',
          fontSize: LABEL_PX[size],
          fontWeight: 500,
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

/** The name of the component under the pointer (the lens, its holder, the cube), and its part's; moved by the scene. */
export function ComponentTag({ ref, part, children }: { ref: Ref<HTMLDivElement>; part?: string; children: ReactNode }) {
  return (
    <Box
      ref={ref}
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 4,
        px: 1,
        py: 0.5,
        borderRadius: 1,
        bgcolor: 'color-mix(in srgb, var(--mui-palette-background-paper) 92%, transparent)',
        border: 1,
        borderColor: 'divider',
        boxShadow: 1,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <Typography variant="caption" component="div" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
        {children}
      </Typography>
      {part && (
        <Typography variant="caption" component="div" sx={{ color: 'text.secondary', lineHeight: 1.3 }}>
          {part}
        </Typography>
      )}
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

/** The hint at the top of the canvas, with the view's icon. */
export function Hint({ children, place, icon }: { children: ReactNode; place?: HintPlace; icon?: ReactNode }) {
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
      {icon ?? <ThreeDRotationIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
      <Typography variant="body2">{children}</Typography>
    </Paper>
  );
}
