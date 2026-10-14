import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import type { ProjectSummary } from '../../../api/types';
import type { Schematic } from '../../editor/model';
import { EASE_OUT, gsap, reducedMotion } from '../../landing/motion';
import { CornerArrow } from '../../primitives/CornerArrow';
import { Pill } from '../../primitives/Pill';
import { DesignPicture } from '../explore/DesignTile';
import { cardOutlineSx } from './cardOutline';

export interface ProjectDrawerProps {
  projects: ProjectSummary[];
  drawings?: Record<string, Schematic>;
  /** Shown on the label on the drawer's front, e.g. "manu's projects". */
  label: string;
  /** The pulled card was clicked: show its document. `from` is where the card is on screen. */
  onPreview: (id: string, number: string, from: DOMRect) => void;
  /** Another card came out (by click, drag or wheel); `from` is where it is on screen. */
  onPull?: (id: string, number: string, from: DOMRect) => void;
  /** A card whose document is showing; it waits, hidden, in the drawer. */
  hiddenId?: string | null;
}

/* Sizes in px. Each card shows a strip of STEP above the next one; a card pulled out rises by LIFT. */
const STEP = 38;
const CARD_H = 300;
const LIFT = 220;
export const TAB_W = 230;
export const TAB_H = 26;
/** How much narrower each card is than the one in front of it, per side: the drawer seen in perspective. */
const INSET = 3;
export const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** Wheel travel (px) that moves one card, and the least time between two moves (ms), so a trackpad flick doesn't race through the drawer. */
const WHEEL_STEP = 40;
const WHEEL_PAUSE = 140;
/** How far (px) a card must be dragged up to come out; less and it drops back. */
const DRAG_PULL = 36;
/** How far (px) the front panel reaches past the front card on each side: the thickness of the drawer's walls. */
const OVERHANG = 14;
/** How far (px) the front panel reaches below the cards' bottoms, and the height of its top face. */
const BELOW = 24;
const FACE = 18;
/** How much darker (percent) each card is than the one in front of it: the inside of the drawer is in shadow. */
const SHADE = 2;

const ink = (t: Theme) => (t.vars ?? t).palette.text.primary;
const paper = (t: Theme) => (t.vars ?? t).palette.background.paper;

type Row = { kind: 'divider'; label: string; code: string } | { kind: 'project'; project: ProjectSummary; number: string; column: 0 | 1 };

/**
 * Three groups behind black dividers, numbered 00, 01, 02. Inside a group the
 * cards count on from the divider's number: 001, 002 under 00; 011, 012 under 01.
 */
function toRows(projects: ProjectSummary[]): Row[] {
  const groups: [string, ProjectSummary[]][] = [
    ['Pinned', projects.filter((p) => p.pinned)],
    ['Mine', projects.filter((p) => !p.pinned && !p.sharedBy)],
    ['Collaborative', projects.filter((p) => !p.pinned && p.sharedBy)],
  ];
  return groups.flatMap(([label, list], g): Row[] => {
    if (list.length === 0) return [];
    const code = String(g).padStart(2, '0');
    return [
      { kind: 'divider', label, code },
      ...list.map((project, k): Row => ({ kind: 'project', project, number: `${code}${k + 1}`, column: k % 2 ? 1 : 0 })),
    ];
  });
}

/** A card's tab: sloped sides, as on a paper index card. */
export function CardTab({ x, dark, children }: { x: string | number; dark?: boolean; children: ReactNode }) {
  const path = `M0 ${TAB_H} C10 ${TAB_H} 10 0 22 0 L${TAB_W - 22} 0 C${TAB_W - 10} 0 ${TAB_W - 10} ${TAB_H} ${TAB_W} ${TAB_H}`;
  return (
    <Box sx={{ position: 'absolute', top: -TAB_H + 1, left: x, width: TAB_W, height: TAB_H, color: dark ? 'background.paper' : 'text.primary' }}>
      <Box component="svg" aria-hidden viewBox={`0 0 ${TAB_W} ${TAB_H}`} sx={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <Box
          component="path"
          d={path}
          sx={(t) => ({ fill: dark ? (t.vars ?? t).palette.text.primary : (t.vars ?? t).palette.background.paper, stroke: (t.vars ?? t).palette.text.primary, strokeWidth: 1 })}
        />
      </Box>
      <Stack direction="row" spacing={1.5} sx={{ position: 'relative', height: '100%', alignItems: 'center', px: 3.5 }}>
        {children}
      </Stack>
    </Box>
  );
}

/** The project tab's label: its number and name. */
export function ProjectTabLabel({ number, name }: { number: string; name: string }) {
  return (
    <>
      <Typography variant="mono" color="text.meta">
        {number}
      </Typography>
      <Typography variant="meta" noWrap sx={{ flex: 1, textAlign: 'right' }}>
        {name}
      </Typography>
    </>
  );
}

/** The drawer's front panel: a trapezoid with a handle and a label stuck on it. */
function DrawerFront({ label }: { label: string }) {
  // It starts a strip below the front card's top and reaches a little past the cards' bottoms, so they are fully inside.
  const top = CARD_H - STEP;
  const height = top + BELOW;
  // Tapered by exactly the walls' thickness: the cards' corners never show past its slanted sides.
  const shape = `polygon(0 0, 100% 0, calc(100% - ${OVERHANG}px) 100%, ${OVERHANG}px 100%)`;
  return (
    <Box sx={{ position: 'relative', height, mt: `${-top}px`, mx: `${-OVERHANG}px` }}>
      {/* Where the cards go in behind the lip, they fall into its shadow. */}
      <Box aria-hidden sx={(t) => ({ position: 'absolute', left: OVERHANG, right: OVERHANG, bottom: '100%', height: 28, background: `linear-gradient(transparent, color-mix(in srgb, ${ink(t)} 16%, transparent))` })} />
      {/* The board: an ink silhouette with the paper face 1 px inside it, which leaves the outline. */}
      <Box aria-hidden sx={(t) => ({ position: 'absolute', inset: 0, clipPath: shape, bgcolor: ink(t) })}>
        <Box sx={(t) => ({ position: 'absolute', inset: '1px', clipPath: shape, bgcolor: paper(t) })}>
          {/* The top of the board: a thin face of its own, a shade off the front. */}
          <Box sx={(t) => ({ height: FACE, bgcolor: `color-mix(in srgb, ${paper(t)} 90%, ${ink(t)})`, borderBottom: 1, borderColor: 'text.primary' })} />
        </Box>
      </Box>
      <Stack spacing={3} sx={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', pt: `${FACE}px` }}>
        {/* The handle: three stacked rounded bars, outlined. */}
        <Stack aria-hidden spacing={-0.75}>
          {[0, 1, 2].map((i) => (
            <Box key={i} sx={{ width: 130, height: 16, borderRadius: '8px 8px 4px 4px', border: 1, borderColor: 'text.primary', bgcolor: 'background.paper' }} />
          ))}
        </Stack>
        <Typography
          variant="meta"
          sx={(t) => ({ px: 1.5, py: 0.5, borderRadius: 1, border: 1, borderColor: 'text.primary', bgcolor: (t.vars ?? t).palette.brand.lime, color: '#14161a', transform: 'rotate(-1.5deg)' })}
        >
          {label}
        </Typography>
      </Stack>
    </Box>
  );
}

/**
 * The drawer's box behind the cards: a wall on each side, narrowing towards
 * the back with the cards, and the back's rim. `rows` sets the depth.
 */
function DrawerBox({ rows }: { rows: number }) {
  const backInset = (rows - 1) * INSET;
  const backTop = LIFT - 6;
  const frontTop = LIFT + TAB_H + rows * STEP;
  const height = frontTop - backTop;
  const width = OVERHANG + backInset + 2;
  // Left wall, in its own box: outer edge from the front panel's corner to the back, inner edge along the cards' edges.
  const left = `0,${height} ${OVERHANG + backInset - 10},0 ${OVERHANG + backInset},0 ${OVERHANG},${height}`;
  const right = left
    .split(' ')
    .map((p) => {
      const [x, y] = p.split(',').map(Number);
      return `${width - x},${y}`;
    })
    .join(' ');
  const wallSx = (t: Theme) => ({ fill: `color-mix(in srgb, ${paper(t)} 84%, ${ink(t)})`, stroke: ink(t), strokeWidth: 1 });
  return (
    <>
      {[
        { side: 'left', points: left },
        { side: 'right', points: right },
      ].map((w) => (
        <Box
          key={w.side}
          component="svg"
          aria-hidden
          width={width}
          height={height}
          sx={{ position: 'absolute', top: backTop, [w.side]: -OVERHANG, overflow: 'visible' }}
        >
          <Box component="polygon" points={w.points} sx={wallSx} />
        </Box>
      ))}
      <Box aria-hidden sx={{ position: 'absolute', top: backTop, left: backInset - 10, right: backInset - 10, borderTop: 1, borderColor: 'text.primary' }} />
    </>
  );
}

/**
 * The user's projects as index cards in an open drawer. One card is pulled
 * out and shows its picture and state. Another card comes out when its tab
 * is clicked, when it is dragged up by its tab, or as the mouse wheel turns.
 * Clicking the pulled card shows its document.
 */
export function ProjectDrawer({ projects, drawings = {}, label, onPreview, onPull, hiddenId }: ProjectDrawerProps) {
  const rows = toRows(projects);
  const [pulled, setPulled] = useState<string | null>(() => projects.find((p) => p.pinned)?.id ?? projects[0]?.id ?? null);
  // A card being dragged up: how far, in px.
  const [drag, setDrag] = useState<{ id: string; dy: number } | null>(null);
  const dragStart = useRef<{ id: string; y: number; moved: boolean } | null>(null);
  const stackRef = useRef<HTMLDivElement>(null);

  const pulledRow = rows.findIndex((r) => r.kind === 'project' && r.project.id === pulled);
  const ids = rows.flatMap((r) => (r.kind === 'project' ? [r.project.id] : []));
  const numbers = Object.fromEntries(rows.flatMap((r) => (r.kind === 'project' ? [[r.project.id, r.number]] : [])));

  const pull = (id: string) => {
    setPulled(id);
    const card = stackRef.current?.querySelector(`[data-project-id="${id}"]`);
    if (card) onPull?.(id, numbers[id], card.getBoundingClientRect());
  };

  // The wheel listener is added once; it reads the latest cards and pull through refs.
  const idsRef = useRef(ids);
  const pulledRef = useRef(pulled);
  const pullRef = useRef(pull);
  idsRef.current = ids;
  pulledRef.current = pulled;
  pullRef.current = pull;

  // The cards drop into the drawer one after another.
  useLayoutEffect(() => {
    const el = stackRef.current;
    if (!el || reducedMotion()) return;
    const tween = gsap.from(el.querySelectorAll('.drawer-row'), { y: -48, opacity: 0, duration: 0.7, ease: EASE_OUT, stagger: 0.045, clearProps: 'transform,opacity' });
    return () => {
      tween.progress(1).kill();
    };
  }, []);

  // The mouse wheel flips through the cards: down pulls the next one, up the one before.
  useEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    let travel = 0;
    let lastMove = 0;
    const onWheel = (e: WheelEvent) => {
      const list = idsRef.current;
      const dir = Math.sign(e.deltaY);
      const next = list.indexOf(pulledRef.current ?? '') + dir;
      // Past the first or last card the page scrolls on, so the wheel never gets stuck in the drawer.
      if (dir === 0 || next < 0 || next >= list.length) return;
      e.preventDefault();
      travel += e.deltaY;
      const now = performance.now();
      if (Math.abs(travel) < WHEEL_STEP || now - lastMove < WHEEL_PAUSE) return;
      travel = 0;
      lastMove = now;
      pullRef.current(list[next]);
    };
    // Not passive: the drawer takes the scroll while it has cards to flip.
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* Dragging a card up by its tab: it follows the pointer, and comes out if it went far enough. */
  const onPointerDown = (id: string) => (e: PointerEvent<HTMLElement>) => {
    if (id === pulled || e.button !== 0) return;
    dragStart.current = { id, y: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const start = dragStart.current;
    if (!start) return;
    const dy = Math.max(0, Math.min(LIFT, start.y - e.clientY));
    if (dy > 4) start.moved = true;
    if (start.moved) setDrag({ id: start.id, dy });
  };
  const onPointerUp = () => {
    const start = dragStart.current;
    if (start?.moved && drag && drag.dy >= DRAG_PULL) pull(start.id);
    setDrag(null);
  };

  const onCardClick = (id: string, number: string) => (e: MouseEvent<HTMLElement>) => {
    // A drag ends with a click; the drag already did its job.
    const dragged = dragStart.current?.moved;
    dragStart.current = null;
    if (dragged) return;
    if (id === pulled) onPreview(id, number, e.currentTarget.getBoundingClientRect());
    else pull(id);
  };

  return (
    <Box ref={stackRef} sx={{ position: 'relative', pt: `${LIFT + TAB_H}px`, touchAction: 'pan-y' }}>
      <DrawerBox rows={rows.length} />
      {rows.map((row, i) => {
        const depth = rows.length - 1 - i;
        const inset = depth * INSET;
        // Further back is further into the drawer's shadow; a card that is out is in the light.
        const shadeSx = (t: Theme) => ({ bgcolor: `color-mix(in srgb, ${paper(t)} ${100 - depth * SHADE}%, ${ink(t)})` });
        const rowSx = { position: 'relative', height: CARD_H, mt: i === 0 ? 0 : `${-(CARD_H - STEP)}px`, mx: `${inset}px` } as const;
        // The pulled card and every card behind it move up together, so a gap opens in front of it and all tabs stay in reach.
        const shiftSx = { position: 'absolute', inset: 0, transform: i <= pulledRow ? `translateY(${-LIFT}px)` : 'none', transition: `transform 450ms ${EASE}` } as const;

        if (row.kind === 'divider') {
          return (
            <Box key={`divider-${row.code}`} className="drawer-row" sx={rowSx}>
              <Box sx={shiftSx}>
                <Box sx={[{ ...cardOutlineSx, position: 'absolute', inset: 0 }, shadeSx]} />
                <CardTab x="4%" dark>
                  <Typography variant="meta" sx={{ textTransform: 'uppercase', flex: 1 }} noWrap>
                    {row.label}
                  </Typography>
                  <Typography variant="mono">{row.code}</Typography>
                </CardTab>
              </Box>
            </Box>
          );
        }

        const { project, number, column } = row;
        const isPulled = pulled === project.id;
        const dragged = drag?.id === project.id ? drag.dy : 0;
        return (
          <Box key={project.id} className="drawer-row" sx={rowSx}>
            <Box sx={shiftSx}>
              <ButtonBase
                data-project-id={project.id}
                disableRipple
                onClick={onCardClick(project.id, number)}
                onPointerDown={onPointerDown(project.id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                aria-label={isPulled ? `Show ${project.name}` : `Pull out ${project.name}`}
                aria-expanded={isPulled}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'block',
                  textAlign: 'left',
                  cursor: isPulled ? 'pointer' : 'grab',
                  '&:active': { cursor: isPulled ? 'pointer' : 'grabbing' },
                  // While dragged it follows the pointer exactly; otherwise it eases.
                  transform: dragged ? `translateY(${-dragged}px)` : 'none',
                  transition: dragged ? 'none' : `transform 300ms ${EASE}, opacity 200ms`,
                  opacity: hiddenId === project.id ? 0 : 1,
                  ...(!isPulled && !dragged && { '&:hover, &:focus-visible': { transform: 'translateY(-10px)' } }),
                  '&:hover .corner-arrow': { transform: 'rotate(45deg)' },
                }}
              >
                <Box sx={[{ ...cardOutlineSx, position: 'absolute', inset: 0, transition: 'background-color 450ms' }, isPulled ? {} : shadeSx]} />
                {/* Tabs alternate between two columns, so neighbouring cards stay readable. */}
                <CardTab x={column ? '54%' : '30%'}>
                  <ProjectTabLabel number={number} name={project.name} />
                </CardTab>

                {/* The face: only readable when the card is out (or on its way out). */}
                <Stack
                  direction="row"
                  spacing={2.5}
                  sx={{
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    right: 20,
                    height: LIFT - 12,
                    opacity: isPulled ? 1 : Math.min(1, dragged / LIFT),
                    transition: `opacity 300ms ${EASE}`,
                  }}
                >
                  <Box sx={{ position: 'relative', width: '42%', flexShrink: 0, borderRadius: '8px', overflow: 'hidden' }}>
                    <DesignPicture design={project} drawing={drawings[project.id]} />
                  </Box>
                  <Stack spacing={1} sx={{ minWidth: 0, flex: 1, position: 'relative' }}>
                    <Typography variant="meta" color="text.meta">
                      {project.kind} · v{project.version} · {project.updated}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ pr: 6 }}>
                      {project.name}
                    </Typography>
                    <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: 'wrap' }}>
                      <Pill>{project.status}</Pill>
                      <Pill>{project.unmounted > 0 ? `${project.unmounted} not mounted yet` : 'buildable'}</Pill>
                      {project.sharedBy && <Pill>with @{project.sharedBy}</Pill>}
                    </Stack>
                    <CornerArrow inverted />
                  </Stack>
                </Stack>
              </ButtonBase>
            </Box>
          </Box>
        );
      })}
      <DrawerFront label={label} />
    </Box>
  );
}
