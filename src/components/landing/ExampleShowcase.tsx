import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useColorScheme, type Theme } from '@mui/material/styles';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import type { Schematic } from '../editor/model';
import { SchematicCanvas } from '../editor/SchematicCanvas';
import { SliderField } from '../primitives/SliderField';
import { AssemblyView } from './AssemblyView';
import { PillButton } from './PillButton';
import type { ExampleDesign } from '../../demo/landingContent';
import { exampleAssemblies } from '../../demo/assemblies';
import { benchColors } from '../../theme/tokens';

export interface ExampleShowcaseProps {
  examples: ExampleDesign[];
  /** Each card's turn in ms (one lap of the laser round its edge) until the visitor first interacts; 0 turns it off. */
  autoAdvanceMs?: number;
  /** Open the example, with the visitor's changes, in the full editor. */
  onOpen?: (id: string, schematic: Schematic) => void;
  /** A feature that needs an account was clicked (save, share, export). */
  onLocked?: () => void;
  /** The page's title, above the deck. */
  heading?: ReactNode;
  /**
   * A line beside the title (wide screens). While the deck runs on its own,
   * an arrow draws itself from the front card to it, then pulls back into
   * the card as the cursor that switches it to its assembly.
   */
  callout?: { title: string; text: string };
}

type View = 'schematic' | 'assembly';

/** How far each card behind the front one sticks out to the left, spacing units. */
const PEEK = { xs: 2.5, md: 7 };
/** Each card further back is this much smaller. */
const SHRINK = 0.035;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * The demo on each card while nobody has touched it: after a moment a cursor
 * comes in, clicks "Assembly", and the schematic becomes its cubes.
 */
const DEMO = { enter: 2600, move: 2700, click: 3900, leave: 4800 };
/** The shortest turn per card, ms. */
const MIN_TURN_MS = 11000;
/** Start fetching the 3D parts this long after a card comes to the front. */
const PRELOAD_MS = 600;
/**
 * The same demo when the callout is there, ms into the turn: the arrow draws
 * out to the callout, the words come up, the arrow pulls back into the card
 * and turns into the cursor, which clicks "Assembly".
 */
const ARROW = { draw: [500, 1700], reveal: 1350, collapse: [3100, 4000], morph: 3750, move: [4150, 4850], click: 5050, leave: 5900 } as const;

function setParam(schematic: Schematic, symbolId: string, value: number): Schematic {
  return {
    ...schematic,
    symbols: schematic.symbols.map((s) => (s.id === symbolId && s.param ? { ...s, param: { ...s.param, value } } : s)),
  };
}

/** Schematic ⇄ assembly: a two-part pill with a sliding highlight. */
function ViewSwitch({ view, onChange, assemblyRef }: { view: View; onChange: (view: View) => void; assemblyRef: RefObject<HTMLButtonElement | null> }) {
  const options: { value: View; label: string }[] = [
    { value: 'schematic', label: 'Schematic' },
    { value: 'assembly', label: 'Assembly' },
  ];
  return (
    <Box
      role="radiogroup"
      aria-label="View"
      sx={(t) => ({
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        p: 0.5,
        borderRadius: `${t.radius.pill}px`,
        bgcolor: 'background.paper',
        border: `${t.layout.hairline}px solid ${(t.vars ?? t).palette.divider}`,
        boxShadow: `0 ${t.spacing(0.5)} ${t.spacing(2)} ${t.spacing(-1)} color-mix(in srgb, ${(t.vars ?? t).palette.text.primary} 18%, transparent)`,
      })}
    >
      {/* The highlight slides under the chosen half. */}
      <Box
        aria-hidden
        sx={(t) => ({
          position: 'absolute',
          top: t.spacing(0.5),
          bottom: t.spacing(0.5),
          left: t.spacing(0.5),
          width: `calc(50% - ${t.spacing(0.5)})`,
          borderRadius: `${t.radius.pill}px`,
          bgcolor: 'text.primary',
          transform: view === 'assembly' ? 'translateX(100%)' : 'none',
          transition: `transform 450ms ${EASE}`,
        })}
      />
      {options.map((o) => {
        const on = view === o.value;
        return (
          <ButtonBase
            key={o.value}
            ref={o.value === 'assembly' ? assemblyRef : undefined}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            sx={(t) => ({
              position: 'relative',
              px: 1.75,
              py: 0.625,
              borderRadius: `${t.radius.pill}px`,
              typography: 'subtitle2',
              color: on ? 'background.paper' : 'text.secondary',
              transition: `color 300ms ${EASE}`,
            })}
          >
            {o.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

/** The pointer; its tip is at (4, 3). */
const POINTER = 'M4 3 L4 19 L8.5 14.8 L11.6 21.2 L14.3 20 L11.3 13.7 L17.4 13.4 Z';
const clickRing = (t: Theme) => ({
  position: 'absolute',
  left: -14,
  top: -14,
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: `2px solid ${(t.vars ?? t).palette.primary.main}`,
  opacity: 0,
  '@keyframes demoClick': { from: { transform: 'scale(0.3)', opacity: 1 }, to: { transform: 'scale(1.6)', opacity: 0 } },
});

/** A pointer that moves like a hand on a mouse, and a ring when it clicks. */
function DemoCursor({ x, y, visible, clicking }: { x: number; y: number; visible: boolean; clicking: boolean }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: x,
        top: y,
        zIndex: 3,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: `left 1150ms ${EASE}, top 1150ms ${EASE}, opacity 300ms ease`,
      }}
    >
      {clicking && <Box sx={[clickRing, { animation: 'demoClick 600ms ease-out forwards' }]} />}
      <Box
        component="svg"
        viewBox="0 0 24 24"
        sx={{ display: 'block', width: 24, height: 24, transform: clicking ? 'scale(0.86)' : 'none', transformOrigin: '4px 3px', transition: 'transform 120ms ease', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}
      >
        <path d={POINTER} fill="#fff" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
      </Box>
    </Box>
  );
}

type Point = { x: number; y: number };

/**
 * A hand-drawn arrow from `s` to `e`, as if drawn in a single stroke: low
 * along the card's top edge (under the title), one loop, then up to `e`.
 */
function arrowPath(s: Point, e: Point): string {
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const a = { x: s.x + 0.6 * dx, y: s.y + 0.3 * dy };
  const b = { x: a.x + 40, y: a.y - 6 };
  const n = (v: number) => Math.round(v * 10) / 10;
  const p = (x: number, y: number) => `${n(x)} ${n(y)}`;
  return [
    `M ${p(s.x, s.y)}`,
    `C ${p(s.x + 0.16 * dx, s.y - 30)}, ${p(a.x - 0.26 * dx, a.y + 4)}, ${p(a.x, a.y)}`,
    // The loop: on past its end, up and back over, and down through itself.
    `C ${p(a.x + 72, a.y - 12)}, ${p(b.x - 92, b.y - 78)}, ${p(b.x, b.y)}`,
    `C ${p(b.x + 46, b.y + 40)}, ${p(e.x - 0.3 * (e.x - b.x), e.y + 34)}, ${p(e.x, e.y)}`,
  ].join(' ');
}

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const span = ([a, b]: readonly [number, number], t: number) => clamp01((t - a) / (b - a));

/**
 * One turn of the arrow demo (see ARROW). It draws straight into the DOM on
 * each frame; mounting starts it, unmounting stops it.
 */
function ArrowDemo({
  rootRef,
  fromRef,
  toRef,
  onReveal,
  onClick,
}: {
  rootRef: RefObject<HTMLElement | null>;
  /** The "Assembly" button. */
  fromRef: RefObject<HTMLElement | null>;
  /** The callout's title. */
  toRef: RefObject<HTMLElement | null>;
  onReveal: () => void;
  onClick: () => void;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<{ d: string; w: number; h: number; target: Point } | null>(null);
  const handlers = useRef({ onReveal, onClick });
  handlers.current = { onReveal, onClick };

  // After commit: the root's ref is attached only after this, its child, has run its layout effects.
  useEffect(() => {
    const root = rootRef.current?.getBoundingClientRect();
    const button = fromRef.current?.getBoundingClientRect();
    const title = toRef.current?.getBoundingClientRect();
    if (!root || !button || !title) return;
    // Out of the card just right of the switch; in to the callout's first line.
    const s = { x: button.right - root.left + 18, y: button.top - root.top + button.height / 2 };
    const e = { x: title.left - root.left - 22, y: title.top - root.top + Math.min(title.height / 2, 26) };
    const target = { x: button.left - root.left + button.width * 0.45, y: button.top - root.top + button.height * 0.6 };
    setGeo({ d: arrowPath(s, e), w: root.width, h: root.height, target });
  }, [rootRef, fromRef, toRef]);

  useEffect(() => {
    const path = pathRef.current;
    const head = headRef.current;
    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!geo || !path || !head || !cursor || !ring) return;
    const total = path.getTotalLength();
    const start = performance.now();
    let revealed = false;
    let clicked = false;
    let raf = 0;
    const frame = (now: number) => {
      const t = now - start;
      // How much of the line shows: drawn out, held, reeled back in.
      const len = total * (t < ARROW.collapse[0] ? easeInOut(span(ARROW.draw, t)) : 1 - easeInOut(span(ARROW.collapse, t)));
      path.style.strokeDasharray = `${len} ${total + 1}`;
      path.style.opacity = t < ARROW.draw[0] ? '0' : '1';
      // The head rides the tip, facing the way it moves.
      const tip = path.getPointAtLength(len);
      const back = path.getPointAtLength(Math.max(0, len - 3));
      const ahead = path.getPointAtLength(Math.min(total, len + 3));
      const out = t < ARROW.collapse[0];
      const angle = (Math.atan2(ahead.y - back.y, ahead.x - back.x) * 180) / Math.PI + (out ? 0 : 180);
      head.setAttribute('transform', `translate(${tip.x} ${tip.y}) rotate(${angle})`);
      const morph = clamp01((t - ARROW.morph) / 300);
      head.style.opacity = t < ARROW.draw[0] ? '0' : String(1 - morph);
      // Then the cursor: where the head went in, over to the button, click, gone.
      const m = easeInOut(span(ARROW.move, t));
      const x = tip.x + (geo.target.x - tip.x) * m;
      const y = tip.y + (geo.target.y - tip.y) * m;
      const pressed = t >= ARROW.click && t < ARROW.click + 140;
      cursor.style.transform = `translate(${x - 4}px, ${y - 3}px) scale(${(0.55 + 0.45 * morph) * (pressed ? 0.86 : 1)})`;
      cursor.style.opacity = String(t < ARROW.leave ? morph : 1 - clamp01((t - ARROW.leave) / 300));
      if (!revealed && t >= ARROW.reveal) {
        revealed = true;
        handlers.current.onReveal();
      }
      if (!clicked && t >= ARROW.click) {
        clicked = true;
        ring.style.animation = 'demoClick 600ms ease-out forwards';
        handlers.current.onClick();
      }
      if (t < ARROW.leave + 400) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [geo]);

  if (!geo) return null;
  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
      <Box component="svg" sx={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', color: 'text.primary' }} width={geo.w} height={geo.h}>
        <path ref={pathRef} d={geo.d} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0 }} />
        <g ref={headRef} style={{ opacity: 0 }}>
          <path d="M -13 -7.5 L 0 0 L -13 7.5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </Box>
      <Box ref={cursorRef} sx={{ position: 'absolute', left: 0, top: 0, opacity: 0, transformOrigin: '4px 3px', willChange: 'transform' }}>
        <Box ref={ringRef} sx={[clickRing, { left: -10, top: -11 }]} />
        <Box component="svg" viewBox="0 0 24 24" sx={{ display: 'block', width: 24, height: 24, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>
          <path d={POINTER} fill="#fff" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
        </Box>
      </Box>
    </Box>
  );
}

/** The callout's words, each rising into place in turn once `shown`. */
function RisingWords({ text, shown, delayMs = 0, still }: { text: string; shown: boolean; delayMs?: number; still: boolean }) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <Box key={i} component="span" sx={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', pb: '0.08em', mb: '-0.08em' }}>
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              transform: shown || still ? 'none' : 'translateY(105%)',
              transition: still ? 'none' : `transform 700ms ${EASE} ${delayMs + i * 55}ms`,
            }}
          >
            {word}
            {'\u00a0'}
          </Box>
        </Box>
      ))}
    </>
  );
}

/**
 * The turn timer: a laser spot running once round the card's edge, with a
 * fading tail, in the bench's laser green. One lap is one turn.
 */
function LaserTimer({ target, durationMs, color, radius }: { target: RefObject<HTMLElement | null>; durationMs: number; color: string; radius: number }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  // After commit (not in layout): the card's ref is only attached after its children's layout effects.
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [target]);
  if (!size) return null;
  const inset = 1;
  // Head, glow and tail share their leading edge, so the spot drags its trail.
  const segments = [
    { len: 260, width: 2, opacity: 0.2 },
    { len: 90, width: 3, opacity: 0.55 },
    { len: 16, width: 4.5, opacity: 1, glow: true },
  ];
  return (
    <Box
      component="svg"
      aria-hidden
      width={size.w}
      height={size.h}
      sx={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', overflow: 'visible' }}
    >
      {segments.map((s) => (
        // A plain rect: on Box, width and height would be read as styles.
        <rect
          key={s.len}
          x={inset}
          y={inset}
          width={size.w - 2 * inset}
          height={size.h - 2 * inset}
          rx={radius - inset}
          pathLength={1000}
          fill="none"
          stroke={color}
          strokeWidth={s.width}
          strokeLinecap="round"
          strokeOpacity={s.opacity}
          strokeDasharray={`${s.len} ${1000 - s.len}`}
          strokeDashoffset={s.len}
          style={{
            filter: s.glow ? `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 12px ${color})` : undefined,
            animation: `laserLap${s.len} ${durationMs}ms linear forwards`,
          }}
        />
      ))}
      {/* Each segment starts shifted by its own length, so all their leading edges meet. */}
      <style>{segments.map((s) => `@keyframes laserLap${s.len} { from { stroke-dashoffset: ${s.len}; } to { stroke-dashoffset: ${s.len - 1000}; } }`).join('\n')}</style>
    </Box>
  );
}

interface CardProps {
  example: ExampleDesign;
  schematic: Schematic;
  front: boolean;
  view: View;
  onView: (view: View) => void;
  /** Fetch the 3D parts. */
  load3d: boolean;
  playKey: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onParam: (symbolId: string, value: number) => void;
  onOpen?: () => void;
  onLocked?: () => void;
  stageRef?: RefObject<HTMLDivElement | null>;
  assemblyRef?: RefObject<HTMLButtonElement | null>;
  cursor?: { x: number; y: number; visible: boolean; clicking: boolean } | null;
}

/** One example: its live schematic (or its cubes) on the left, what it is and what to try on the right. */
function ExampleCard(props: CardProps) {
  const { example, schematic, front, view, onView, load3d, playKey, selectedId, onSelect, onParam, onOpen, onLocked, stageRef, assemblyRef, cursor } = props;
  const selected = front ? (schematic.symbols.find((s) => s.id === selectedId) ?? null) : null;
  const assembly = exampleAssemblies[example.id];
  const inAssembly = view === 'assembly' && Boolean(assembly);
  const localAssemblyRef = useRef<HTMLButtonElement>(null);
  return (
    <Box
      sx={(t) => ({
        display: 'grid',
        height: '100%',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: `minmax(0, 1fr) ${t.spacing(46)}` },
      })}
    >
      <Box
        ref={stageRef}
        sx={(t) => ({ position: 'relative', display: 'flex', minHeight: { xs: t.spacing(t.layout.exampleStageHeightCompact), md: t.spacing(t.layout.exampleStageHeight) } })}
      >
        <Box sx={{ display: 'flex', flex: 1, opacity: inAssembly ? 0 : 1, transition: `opacity 500ms ${EASE}` }}>
          <SchematicCanvas
            fit
            schematic={schematic}
            selectedId={front ? selectedId : null}
            onSelect={front ? onSelect : () => undefined}
            options={{ showRayLabels: true }}
            hint={front && !inAssembly ? 'Click a part to change it' : undefined}
          />
        </Box>
        {assembly && (load3d || inAssembly) && (
          <AssemblyView
            assembly={assembly}
            active={front && inAssembly}
            playKey={playKey}
            turntable
            label={`${example.title} as openUC2 cubes on a baseplate`}
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: inAssembly ? 1 : 0,
              transform: inAssembly ? 'none' : 'scale(0.98)',
              transition: `opacity 500ms ${EASE}, transform 700ms ${EASE}`,
              pointerEvents: 'none',
            }}
          />
        )}
        {assembly && front && (
          <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 2 }}>
            <ViewSwitch view={view} onChange={onView} assemblyRef={assemblyRef ?? localAssemblyRef} />
          </Box>
        )}
        {cursor && <DemoCursor {...cursor} />}
      </Box>

      <Stack
        spacing={2}
        sx={(t) => {
          const rule = `${t.layout.hairline}px solid ${(t.vars ?? t).palette.divider}`;
          return { p: 3, minWidth: 0, borderTop: { xs: rule, md: 'none' }, borderLeft: { xs: 'none', md: rule } };
        }}
      >
        <Box>
          <Typography variant="h1" component="h3">
            {example.title}
          </Typography>
          <Typography variant="meta" color="text.meta">
            {assembly ? assembly.parts.length : example.cubes} cubes · {schematic.symbols.length} parts
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          {example.summary}
        </Typography>

        {/* The part the visitor is playing with, or what to try. */}
        <Box sx={{ p: 2, borderRadius: (t) => `${t.radius.tile}px`, bgcolor: 'background.sunken', minHeight: (t) => t.spacing(15) }}>
          {selected ? (
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1">{selected.label}</Typography>
                <Typography variant="meta" color="text.meta">
                  {selected.id} · {selected.type}
                </Typography>
              </Stack>
              {selected.param ? (
                <SliderField
                  label={selected.param.label}
                  value={selected.param.value}
                  min={selected.param.min}
                  max={selected.param.max}
                  step={selected.param.step}
                  unit={selected.param.unit}
                  onChange={(value) => onParam(selected.id, value)}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  This part has no setting to change here. Open the editor to swap it or move it.
                </Typography>
              )}
            </Stack>
          ) : (
            <Stack spacing={0.5}>
              <Typography variant="overline" color="text.secondary">
                {inAssembly ? 'The same design, as cubes' : 'Try this'}
              </Typography>
              <Typography variant="body1">
                {inAssembly ? 'Every symbol is a real openUC2 cube. Optikit keeps the drawing and the assembly in step.' : example.tryThis}
              </Typography>
            </Stack>
          )}
        </Box>

        <Box sx={{ flex: 1 }} />

        <Stack spacing={1}>
          <PillButton size="large" onClick={onOpen}>
            Open in the editor
          </PillButton>
          <PillButton tone="outline" arrow={false} startIcon={<LockOutlinedIcon />} onClick={onLocked}>
            Save a copy
          </PillButton>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            No account needed to play. Saving, sharing and STEP export need a free account.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

/**
 * The examples as a deck of cards. The front card is a live design: select a
 * part, change its main setting, switch between the schematic and its cubes,
 * carry on in the editor. The others stand behind it and stick out to the
 * left, each with its title on the spine; picking one slides it forward.
 *
 * Until the visitor clicks or types inside it, it runs on its own: a laser
 * spot runs once round the front card's edge (that is the timer), a cursor
 * switches the card to its assembly on the way, and the next card comes up.
 */
export function ExampleShowcase({ examples, autoAdvanceMs: requestedMs = 12000, onOpen, onLocked, heading, callout }: ExampleShowcaseProps) {
  // A turn has to leave time for the demo and a look at the assembly.
  const autoAdvanceMs = requestedMs > 0 ? Math.max(requestedMs, MIN_TURN_MS) : 0;
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Schematic>>({});
  const [engaged, setEngaged] = useState(false);
  const [view, setView] = useState<View>('schematic');
  const [playKey, setPlayKey] = useState(0);
  const [preload, setPreload] = useState<Record<string, boolean>>({});
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean; clicking: boolean } | null>(null);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  // The callout needs the room beside the title.
  const wide = useMediaQuery((t: Theme) => t.breakpoints.up('lg'));
  const withCallout = Boolean(callout) && wide;
  const [revealed, setRevealed] = useState(false);
  const { mode, systemMode } = useColorScheme();
  const laserColor = benchColors[(mode === 'system' ? systemMode : mode) === 'dark' ? 'dark' : 'light'].beam;
  const frontRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const assemblyRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const calloutRef = useRef<HTMLSpanElement>(null);

  const count = examples.length;
  const running = autoAdvanceMs > 0 && !engaged && count > 1;
  const front = examples[index];

  const go = (next: number) => {
    setIndex((next + count) % count);
    setSelectedId(null);
    setView('schematic');
    setCursor(null);
  };

  const changeView = (next: View) => {
    if (next === view) return;
    setView(next);
    if (next === 'assembly') setPlayKey((k) => k + 1);
  };

  // Fetch the front card's parts soon after it comes up, so its assembly is ready when asked for.
  useEffect(() => {
    const timer = window.setTimeout(() => setPreload((p) => ({ ...p, [front.id]: true })), PRELOAD_MS);
    return () => window.clearTimeout(timer);
  }, [front.id]);

  // The turn: the demo cursor, then the next card.
  useEffect(() => {
    if (!running) return;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    if (!reducedMotion && exampleAssemblies[front.id] && !withCallout) {
      at(DEMO.enter, () => {
        const stage = stageRef.current?.getBoundingClientRect();
        if (stage) setCursor({ x: stage.width * 0.62, y: stage.height * 0.72, visible: true, clicking: false });
      });
      at(DEMO.move, () => {
        const stage = stageRef.current?.getBoundingClientRect();
        const button = assemblyRef.current?.getBoundingClientRect();
        if (stage && button) setCursor((c) => c && { ...c, x: button.left - stage.left + button.width * 0.45, y: button.top - stage.top + button.height * 0.55 });
      });
      at(DEMO.click, () => {
        setCursor((c) => c && { ...c, clicking: true });
        setView('assembly');
        setPlayKey((k) => k + 1);
      });
      at(DEMO.leave, () => setCursor((c) => c && { ...c, visible: false, clicking: false }));
    }
    at(autoAdvanceMs, () => go(index + 1));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // `go` is recreated each render; index and running are what matter.
  }, [running, index, autoAdvanceMs, reducedMotion, withCallout]);

  // Once the visitor takes over, the demo cursor goes.
  useEffect(() => {
    if (engaged) setCursor(null);
  }, [engaged]);

  // Arrow keys move through the deck, except where they already mean something (a slider).
  const onKeyDown = (e: KeyboardEvent) => {
    setEngaged(true);
    const target = e.target as HTMLElement;
    if (target.closest('input, [role="slider"], [role="radio"], textarea')) return;
    if (e.key === 'ArrowRight') go(index + 1);
    else if (e.key === 'ArrowLeft') go(index - 1);
  };

  const peek = (t: Theme, depth: number) => ({
    xs: `translateX(${t.spacing(-depth * PEEK.xs)}) scale(${1 - depth * SHRINK})`,
    md: `translateX(${t.spacing(-depth * PEEK.md)}) scale(${1 - depth * SHRINK})`,
  });

  const arrowDemo = withCallout && running && !reducedMotion && Boolean(exampleAssemblies[front.id]);

  return (
    <Box ref={rootRef} sx={{ position: 'relative' }}>
      {(heading || callout) && (
        <Box
          sx={(t) => ({
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: `minmax(0, 1fr) ${t.spacing(50)}` },
            columnGap: 6,
            alignItems: 'end',
            mb: { xs: 4, md: 6 },
          })}
        >
          {heading}
          {withCallout && callout && (
            <Box sx={{ pb: 1 }}>
              <Typography variant="h1" component="p" sx={{ fontSize: '1.75rem', lineHeight: 1.15, textWrap: 'balance' }}>
                <span ref={calloutRef}>
                  <RisingWords text={callout.title} shown={revealed || !running} still={reducedMotion} />
                </span>
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: (t) => t.spacing(42), textWrap: 'pretty' }}>
                <RisingWords text={callout.text} shown={revealed || !running} delayMs={250} still={reducedMotion} />
              </Typography>
            </Box>
          )}
        </Box>
      )}
      <Box
        component="section"
        aria-roledescription="carousel"
        aria-label="Example designs"
        onPointerDown={() => setEngaged(true)}
        onKeyDown={onKeyDown}
        sx={{
          display: 'grid',
          // The cards behind stick out into this margin.
          pl: { xs: (count - 1) * PEEK.xs, md: (count - 1) * PEEK.md },
        }}
      >
        {examples.map((example, i) => {
          const depth = (i - index + count) % count;
          const isFront = depth === 0;
          const schematic = edits[example.id] ?? example.schematic;
          return (
            <Paper
              key={example.id}
              ref={isFront ? frontRef : undefined}
              variant="outlined"
              role="group"
              aria-roledescription="slide"
              aria-label={`${example.title}${isFront ? '' : ' (behind)'}`}
              sx={(t) => ({
                gridArea: '1 / 1',
                position: 'relative',
                zIndex: count - depth,
                // The laser runs just outside the clipped content, so the card itself doesn't clip.
                overflow: 'visible',
                borderRadius: `${t.radius.stage}px`,
                transformOrigin: 'left center',
                transform: peek(t, depth),
                transition: reducedMotion ? 'none' : `transform 700ms ${EASE}, box-shadow 700ms ${EASE}`,
                boxShadow: isFront ? `0 ${t.spacing(3)} ${t.spacing(8)} ${t.spacing(-5)} color-mix(in srgb, ${(t.vars ?? t).palette.primary.main} 28%, transparent)` : 'none',
              })}
            >
              {/* Everything but the front card is out of reach: keyboard and screen readers skip it. */}
              <Box
                inert={!isFront}
                aria-hidden={isFront ? undefined : true}
                sx={(t) => ({ height: '100%', overflow: 'hidden', borderRadius: `${t.radius.stage}px` })}
              >
                <ExampleCard
                  example={example}
                  schematic={schematic}
                  front={isFront}
                  view={isFront ? view : 'schematic'}
                  onView={(v) => {
                    setEngaged(true);
                    changeView(v);
                  }}
                  load3d={Boolean(preload[example.id])}
                  playKey={playKey}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onParam={(symbolId, value) => setEdits({ ...edits, [example.id]: setParam(schematic, symbolId, value) })}
                  onOpen={() => onOpen?.(example.id, schematic)}
                  onLocked={onLocked}
                  stageRef={isFront ? stageRef : undefined}
                  assemblyRef={isFront ? assemblyRef : undefined}
                  cursor={isFront ? cursor : null}
                />
              </Box>

              {isFront && running && !reducedMotion && (
                <LaserTimer key={index} target={frontRef} durationMs={autoAdvanceMs} color={laserColor} radius={28} />
              )}

              {/* Behind: dimmed, and the whole card is the button that brings it forward. */}
              {!isFront && (
                <ButtonBase
                  aria-label={`Show ${example.title}`}
                  onClick={() => {
                    setEngaged(true);
                    go(i);
                  }}
                  sx={(t) => ({
                    position: 'absolute',
                    inset: 0,
                    borderRadius: `${t.radius.stage}px`,
                    justifyContent: 'flex-start',
                    alignItems: 'stretch',
                    // Solid enough that the spine reads as a surface, not as a busy canvas.
                    bgcolor: `color-mix(in srgb, ${(t.vars ?? t).palette.background.paper} ${depth === 1 ? 88 : 94}%, ${(t.vars ?? t).palette.background.sunken})`,
                    transition: `background-color 200ms ${EASE}`,
                    '&:hover, &:focus-visible': { bgcolor: `color-mix(in srgb, ${(t.vars ?? t).palette.background.paper} 55%, transparent)` },
                    '&:hover .spine, &:focus-visible .spine': { color: 'text.primary' },
                    '&:hover .spine-arrow, &:focus-visible .spine-arrow': { bgcolor: 'primary.main', color: 'primary.contrastText', borderColor: 'primary.main' },
                  })}
                >
                  {/* The spine: the strip that sticks out, with the title running up it. */}
                  <Box
                    className="spine"
                    sx={(t) => ({
                      position: 'relative',
                      display: { xs: 'none', md: 'flex' },
                      width: t.spacing(PEEK.md / (1 - depth * SHRINK)),
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'text.secondary',
                      transition: `color 200ms ${EASE}`,
                    })}
                  >
                    <Box
                      className="spine-arrow"
                      aria-hidden
                      sx={(t) => ({
                        position: 'absolute',
                        top: t.spacing(2.5),
                        display: 'grid',
                        placeItems: 'center',
                        width: t.spacing(3.5),
                        height: t.spacing(3.5),
                        borderRadius: '50%',
                        border: `${t.layout.hairline}px solid`,
                        borderColor: 'divider',
                        transition: `all 200ms ${EASE}`,
                      })}
                    >
                      <NorthEastIcon sx={{ fontSize: '0.875rem' }} />
                    </Box>
                    <Typography
                      variant="subtitle1"
                      component="span"
                      sx={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', color: 'inherit' }}
                    >
                      {example.title}
                    </Typography>
                  </Box>
                </ButtonBase>
              )}
            </Paper>
          );
        })}
      </Box>
      {arrowDemo && (
        <ArrowDemo
          key={index}
          rootRef={rootRef}
          fromRef={assemblyRef}
          toRef={calloutRef}
          onReveal={() => setRevealed(true)}
          onClick={() => {
            setView('assembly');
            setPlayKey((k) => k + 1);
          }}
        />
      )}
    </Box>
  );
}
