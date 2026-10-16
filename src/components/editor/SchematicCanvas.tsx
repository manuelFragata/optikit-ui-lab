import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { useLightFor, type Light, type Point } from './light';
import { facing, samplePoint, specLine, symbolBounds, withMove, type Move, type Schematic, type SchematicSymbol, type SymbolKind } from './model';
import { layerShow, layerShowOfAny, type LayerShow } from './layers';
import { SymbolGlyph } from './SymbolGlyph';
import { OpticOutline } from './OpticProfile';
import type { FragmentSurface } from './holders/optic';
import { DEFAULT_PREFERENCES, type Preferences } from '../../settings/preferences';
import { VIEW_LABELS, type CanvasTool, type EditorView, type HintPlace, type ViewOptions } from './viewOptions';

/** What the editor looks at: the zoom (1 = 100%) and the point in the middle, in grid units (y down). */
export interface Camera {
  zoom: number;
  center: { x: number; y: number };
}

const ZOOM = { min: 0.2, max: 5 };

/** How strongly each layer shows in the schematic. */
const SHOW_OPACITY: Record<LayerShow, number> = { current: 1, ghost: 0.16, hidden: 0 };

export interface SchematicCanvasProps {
  schematic: Schematic;
  /** The selected part (the one the inspector shows), or `null`. */
  selectedId: string | null;
  /** Every selected part, when several are; defaults to just `selectedId`. */
  selectedIds?: string[];
  /** A part clicked, or `null` for empty canvas. `toggle` with Shift or Ctrl held: add it to the selection or take it out. */
  onSelect: (id: string | null, toggle?: boolean) => void;
  /** Parts caught in a box dragged on empty canvas; `add` with Shift held. */
  onSelectMany?: (ids: string[], add: boolean) => void;
  /** A part double-clicked: open its properties. */
  onInspect?: (id: string) => void;
  /** A lens or mirror's real glass (designed here, or its catalogue record's): drawn as it is, at its true size, instead of its symbol. */
  opticFor?: (s: SchematicSymbol) => FragmentSurface[] | undefined;
  view?: EditorView;
  options: Pick<ViewOptions, 'showRayLabels'> & Partial<Pick<ViewOptions, 'showCages' | 'onionSkin' | 'showRays' | 'showPartLabels'>>;
  /** Label size and wheel direction (Settings); the defaults when omitted. */
  prefs?: Pick<Preferences, 'labelSize' | 'invertZoom'>;
  /** Draw this layer (z) only; the others show faintly with onion skin on, or not at all. Omit to draw every layer. */
  layer?: number;
  /** Floating controls in the top-left corner (see CanvasToolbar). */
  toolbar?: ReactNode;
  /**
   * Fit the drawing into the frame (never zooming in past 100%) instead of the
   * fixed editor zoom. For previews and small embeds.
   */
  fit?: boolean;
  /** Hint while nothing is selected; `false` hides it. */
  hint?: string | false;
  /** Where the hint sits: the bottom, or the top when something else (the view dock) holds the bottom. */
  hintAt?: 'top' | 'bottom';
  /** Where exactly, when the editor places it (over `hintAt`). */
  hintPlace?: HintPlace;

  /**
   * The editor's camera, moved with the pan tool, the zoom tool and the
   * wheel. `'fit'` fits the drawing and reports the result through
   * `onCamera`. Omit for the fixed zoom (or `fit`).
   */
  camera?: Camera | 'fit';
  onCamera?: (camera: Camera) => void;
  /** Select (default), pan, zoom or measure. */
  tool?: CanvasTool;
  /**
   * A part being placed: it follows the pointer, and a click drops it. With
   * `drag`, it was dragged in from a list and drops where the button is let go.
   */
  placing?: { kind: SymbolKind; drag?: boolean } | null;
  /** Where to drop the part, in schematic units (y up); `more` when Ctrl is held to keep placing. */
  onPlace?: (at: { x: number; y: number }, more: boolean) => void;
  /**
   * Parts dragged by `by` (grid units, y up), each staying put along its
   * locked axes; `copy` when Alt was held to drop copies instead.
   */
  onMove?: (move: Move) => void;
  /** Snap placing, moving and measuring to whole cubes. Shift does the opposite while held. */
  snap?: boolean;
  /** Floats next to the selected parts (see SelectionActions). */
  selectionActions?: ReactNode;
}

// Everything inside the SVG is in grid units: 1 unit = 1 cube. The zoom is
// fixed (PX_PER_UNIT at 100%); the viewBox follows the canvas size and stays
// centred on the drawing, so opening a side panel never rescales the schematic.
const GRID = { minX: -40, maxX: 80, minY: -50, maxY: 30 };
const PX_PER_UNIT = 32;
const CENTER = { x: 10, y: -7.5 }; // drawing centre, screen coordinates (y down)
const LABEL = 0.4; // label font size, grid units
/** The label size option, as a factor on part and ray names (the drawing's own text keeps its size). */
const LABEL_SCALE = { small: 0.8, medium: 1, large: 1.3 } as const;
const PAD = 0.9; // group box padding around its symbols
const FIT_MARGIN = 2.5; // grid units kept free around a fitted drawing

type Bounds = ReturnType<typeof symbolBounds>;
/** The cube outline around a part: a square a little larger than its symbol. */
function cageOf(b: Bounds) {
  const side = Math.max(b.w, b.h) + 0.5;
  return { x: b.x + b.w / 2 - side / 2, y: b.y + b.h / 2 - side / 2, side };
}
/** Where a part's name starts: just under its cube outline (drawn or not, so names stay put when cages are toggled). */
const nameTop = (b: Bounds) => cageOf(b).y + cageOf(b).side + 0.1;

/** Screen-space bounds (y down) of every symbol and where the light goes. */
function drawingBounds(schematic: Schematic, light: Light) {
  const boxes = schematic.symbols.map(symbolBounds);
  const points = light.paths.flatMap((p) => p.points.map((q) => toScreen(q)));
  const xs = [...boxes.flatMap((b) => [b.x, b.x + b.w]), ...points.map((p) => p.x)];
  const ys = [...boxes.flatMap((b) => [b.y, nameTop(b) + LABEL]), ...points.map((p) => p.y)];
  if (xs.length === 0) return null;
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return { x: x0 - FIT_MARGIN, y: y0 - FIT_MARGIN, w: x1 - x0 + 2 * FIT_MARGIN, h: y1 - y0 + 2 * FIT_MARGIN };
}

function gridPath(step: number) {
  let d = '';
  for (let x = GRID.minX; x <= GRID.maxX; x += step) d += `M${x} ${GRID.minY}V${GRID.maxY}`;
  for (let y = GRID.minY; y <= GRID.maxY; y += step) d += `M${GRID.minX} ${y}H${GRID.maxX}`;
  return d;
}
const MINOR = gridPath(1);
const MAJOR = gridPath(5);

const line = { fill: 'none', vectorEffect: 'non-scaling-stroke' } as const;

/** A design point (y up) on screen (y down), raised by `lift`. */
const toScreen = (p: Point, lift = 0) => ({ x: p.x, y: -(p.y + lift) });

/** The light's last run, into nothing: it fades out. */
function RunOut({ from, to, id }: { from: Point; to: Point; id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={from.x} y1={from.y} x2={to.x} y2={to.y}>
          <stop offset="0" stopColor="currentColor" stopOpacity={1} />
          <stop offset="1" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={`url(#${id})`} strokeWidth={2} {...line} />
    </>
  );
}

/** Where the light was meant to go and does not: a dashed line from the last part it reached to the one it misses, ringed. */
function MissHint({ from, to }: { from: Point; to: Point }) {
  return (
    <Box component="g" sx={{ color: 'warning.main' }}>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="currentColor" strokeWidth={1.25} strokeDasharray="4 4" {...line} />
      <circle cx={to.x} cy={to.y} r={0.35} stroke="currentColor" strokeWidth={1.5} {...line} />
    </Box>
  );
}

function Selection({ s }: { s: SchematicSymbol }) {
  const b = symbolBounds(s);
  const m = 0.2;
  const corners = [
    [b.x - m, b.y - m],
    [b.x + b.w + m, b.y - m],
    [b.x - m, b.y + b.h + m],
    [b.x + b.w + m, b.y + b.h + m],
  ];
  const h = 0.22;
  return (
    <Box component="g" sx={{ color: 'canvas.selection', pointerEvents: 'none' }}>
      <rect x={b.x - m} y={b.y - m} width={b.w + 2 * m} height={b.h + 2 * m} stroke="currentColor" strokeDasharray="4 3" strokeWidth={1} {...line} />
      {corners.map(([cx, cy]) => (
        <rect key={`${cx}-${cy}`} x={cx - h / 2} y={cy - h / 2} width={h} height={h} fill="var(--mui-palette-canvas-ground)" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
    </Box>
  );
}

/** Schematic editor surface: grid, groups, symbols, rays, selection and overlays. */
export function SchematicCanvas({
  schematic,
  selectedId,
  selectedIds: selectedIdsProp,
  onSelect,
  onSelectMany,
  onInspect,
  opticFor,
  view = '2d',
  options,
  prefs = DEFAULT_PREFERENCES,
  toolbar,
  fit = false,
  hint = 'Select a part to see its properties',
  hintAt = 'bottom',
  hintPlace,
  layer,
  camera,
  onCamera,
  tool = 'select',
  placing,
  onPlace,
  onMove,
  snap = true,
  selectionActions,
}: SchematicCanvasProps) {
  const selectedIds = selectedIdsProp ?? (selectedId ? [selectedId] : []);
  // Parts being dragged across the canvas are drawn where they are, rays and
  // all, and only go into the design (one undo step) when they are let go.
  // `anchor` is the part under the pointer; the others move with it.
  const [moving, setMoving] = useState<{ ids: string[]; anchor: string; by: { x: number; y: number }; copy: boolean; free: boolean } | null>(null);
  const movingRef = useRef(moving);
  movingRef.current = moving;
  const justMoved = useRef(false);
  const { groups } = schematic;
  const symbols = moving ? withMove(schematic, moving).symbols : schematic.symbols;
  // The light, from the app's light source, for the parts where they are: moving a part never drags it along.
  const lightFor = useLightFor();
  const light = lightFor({ ...schematic, symbols });
  const objective = symbols.find((s) => s.kind === 'objective');
  // The layer rules shared with the 3D view (layers.ts): the current layer in full, the others faint or hidden.
  const others = options.onionSkin !== false;
  const nameScale = LABEL_SCALE[prefs.labelSize];
  const onLayer = (z: number) => layerShow(z, layer, others) === 'current';
  // While copies are dragged, the copies are what is selected.
  const selectedParts = symbols.filter((s) => (moving?.copy ? moving.ids.map((id) => `${id}-copy`) : selectedIds).includes(s.id));

  const frameRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setMeasured({ w: entry.contentRect.width, h: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const size = measured ?? { w: 960, h: 600 };
  const bounds = fit || camera === 'fit' ? drawingBounds(schematic, light) : null;
  const scale =
    typeof camera === 'object' ? PX_PER_UNIT * camera.zoom : bounds ? Math.min(PX_PER_UNIT, size.w / bounds.w, size.h / bounds.h) : PX_PER_UNIT;
  const center = typeof camera === 'object' ? camera.center : bounds ? { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 } : CENTER;
  const vw = size.w / scale;
  const vh = size.h / scale;
  const vx = center.x - vw / 2;
  const vy = center.y - vh / 2;

  // Asked to fit: once the frame is measured, hand the fitted camera back.
  useEffect(() => {
    if (camera === 'fit' && measured) onCamera?.({ zoom: scale / PX_PER_UNIT, center });
  });

  /** Zoom by `factor`, keeping the grid point `at` under the same pixel. */
  const zoomAt = (factor: number, at: { x: number; y: number }) => {
    if (typeof camera !== 'object' || !onCamera) return;
    const zoom = Math.min(ZOOM.max, Math.max(ZOOM.min, camera.zoom * factor));
    const k = camera.zoom / zoom;
    onCamera({ zoom, center: { x: at.x + (center.x - at.x) * k, y: at.y + (center.y - at.y) * k } });
  };

  /** The grid point (y down) under a pointer. */
  const toGrid = (e: { clientX: number; clientY: number }) => {
    const r = frameRef.current!.getBoundingClientRect();
    return { x: vx + (e.clientX - r.left) / scale, y: vy + (e.clientY - r.top) / scale };
  };
  /** On whole cubes, or (Shift flips it) free, to a tenth of a cube. */
  const freeAt = (shift: boolean) => snap === shift;
  const round = (v: number, free: boolean) => (free ? Math.round(v * 10) / 10 : Math.round(v));
  const snapped = (p: { x: number; y: number }, shift = false) => {
    const free = freeAt(shift);
    return { x: round(p.x, free), y: round(p.y, free) };
  };

  // The wheel zooms around the cursor. A native listener, so the page does not scroll.
  const zoomBy = (e: WheelEvent) => zoomAt(Math.exp((prefs.invertZoom ? 1 : -1) * e.deltaY * 0.0015), toGrid(e));
  const wheel = useRef(zoomBy);
  wheel.current = zoomBy;
  const zoomable = typeof camera === 'object' && Boolean(onCamera);
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !zoomable) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheel.current(e);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomable]);

  // The pointer: where it is (for the part being placed and the measure), and a pan drag.
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; center: { x: number; y: number }; moved: boolean } | null>(null);
  const [panning, setPanning] = useState(false);
  const [measure, setMeasure] = useState<{ a: { x: number; y: number }; b?: { x: number; y: number } } | null>(null);
  useEffect(() => setMeasure(null), [tool]);
  // A box dragged on empty canvas selects what it touches (grid units, y down).
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  /** Drag on empty canvas with the select tool: everything on this layer the box touches. */
  const startMarquee = (e: PointerEvent) => {
    const from = { x: e.clientX, y: e.clientY, grid: toGrid(e) };
    let started = false;
    let box = { x0: from.grid.x, y0: from.grid.y, x1: from.grid.x, y1: from.grid.y };
    const move = (ev: globalThis.PointerEvent) => {
      if (!started && Math.hypot(ev.clientX - from.x, ev.clientY - from.y) < 4) return;
      started = true;
      const g = toGrid(ev);
      box = { x0: Math.min(from.grid.x, g.x), y0: Math.min(from.grid.y, g.y), x1: Math.max(from.grid.x, g.x), y1: Math.max(from.grid.y, g.y) };
      setMarquee(box);
    };
    const up = (ev: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setMarquee(null);
      if (!started) return;
      justMoved.current = true;
      const caught = schematic.symbols.filter((s) => {
        if (!onLayer(s.z)) return false;
        const b = symbolBounds(s);
        return b.x < box.x1 && b.x + b.w > box.x0 && b.y < box.y1 && b.y + b.h > box.y0;
      });
      onSelectMany?.(caught.map((s) => s.id), ev.shiftKey);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button === 0 && tool === 'select' && !placing && onSelectMany) return startMarquee(e);
    // The pan tool, or the middle button with any tool.
    if (!zoomable || !(tool === 'pan' || e.button === 1)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, center, moved: false };
    setPanning(true);
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (d && panning && typeof camera === 'object') {
      d.moved = true;
      onCamera?.({ zoom: camera.zoom, center: { x: d.center.x - (e.clientX - d.x) / scale, y: d.center.y - (e.clientY - d.y) / scale } });
    }
    if (placing || tool === 'measure') setPointer(snapped(toGrid(e), e.shiftKey));
  };
  const onPointerUp = (e: PointerEvent) => {
    setPanning(false);
    // A part dragged in from a list drops where it is let go.
    if (placing?.drag) {
      const at = snapped(toGrid(e), e.shiftKey);
      onPlace?.({ x: at.x, y: -at.y }, e.ctrlKey || e.metaKey);
    }
  };

  /**
   * Press on a part and drag it, with the rest of the selection: on the grid,
   * off it with Shift, copies with Alt; Esc puts them back.
   */
  const startMove = (e: PointerEvent, s: SchematicSymbol) => {
    if (!onMove || e.button !== 0) return;
    e.stopPropagation();
    const from = { x: e.clientX, y: e.clientY, grid: toGrid(e) };
    // A selected part takes the selection along; Shift on another adds it; otherwise it goes alone.
    const ids = selectedIds.includes(s.id) ? selectedIds : e.shiftKey ? [...selectedIds, s.id] : [s.id];
    let started = false;
    const move = (ev: globalThis.PointerEvent) => {
      if (!started && Math.hypot(ev.clientX - from.x, ev.clientY - from.y) < 4) return;
      if (!started && !selectedIds.includes(s.id)) {
        if (ids.length > 1) onSelectMany?.(ids, false);
        else onSelect(s.id);
      }
      started = true;
      const g = toGrid(ev);
      const free = freeAt(ev.shiftKey);
      // The part under the pointer lands on the grid (or off it); the others keep their distance to it.
      const by = { x: round(s.x + g.x - from.grid.x, free) - s.x, y: round(s.y - (g.y - from.grid.y), free) - s.y };
      setMoving({ ids, anchor: s.id, by, copy: ev.altKey, free });
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', key, true);
      setMoving(null);
      justMoved.current = started;
    };
    const up = () => {
      const m = movingRef.current;
      stop();
      if (m && (m.by.x || m.by.y || m.copy)) onMove({ ids: m.ids, by: m.by, copy: m.copy });
    };
    const key = (ev: globalThis.KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      // Before the editor's own Esc, which would deselect.
      ev.stopImmediatePropagation();
      stop();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', key, true);
  };

  const onCanvasClick = (e: MouseEvent) => {
    // The click that ends a pan or a part drag is not a click.
    const dragged = drag.current?.moved || justMoved.current;
    drag.current = null;
    justMoved.current = false;
    if (dragged) return;
    const at = snapped(toGrid(e), e.shiftKey);
    if (placing) onPlace?.({ x: at.x, y: -at.y }, e.ctrlKey || e.metaKey);
    else if (tool === 'zoom') zoomAt(e.altKey ? 1 / 1.5 : 1.5, toGrid(e));
    else if (tool === 'measure') setMeasure(!measure || measure.b ? { a: at } : { a: measure.a, b: at });
    else if (tool === 'select') onSelect(null);
  };
  const interactive = tool === 'select' && !placing && !moving;
  const cursor = placing || tool === 'measure' ? 'crosshair' : tool === 'pan' ? (panning ? 'grabbing' : 'grab') : tool === 'zoom' ? 'zoom-in' : 'default';

  const groupBoxes = groups.flatMap((g) => {
    const members = symbols.filter((s) => s.group === g.id).map(symbolBounds);
    if (members.length === 0) return [];
    const x0 = Math.min(...members.map((b) => b.x)) - PAD;
    const y0 = Math.min(...members.map((b) => b.y)) - PAD;
    const x1 = Math.max(...members.map((b) => b.x + b.w)) + PAD;
    const y1 = Math.max(...members.map(nameTop)) + PAD + LABEL; // room for the names
    return [{ ...g, x: x0, y: y0, w: x1 - x0, h: y1 - y0 }];
  });

  const onSymbolKey = (event: KeyboardEvent, id: string) => {
    if (event.key === 'Enter' && onInspect) {
      event.preventDefault();
      event.stopPropagation();
      onInspect(id);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(id, event.shiftKey);
    }
  };

  return (
    <Box
      ref={frameRef}
      sx={{ position: 'relative', flex: 1, minWidth: 0, overflow: 'hidden', bgcolor: 'canvas.ground' }}
      onKeyDown={(e) => e.key === 'Escape' && onSelect(null)}
    >
      <Box
        component="svg"
        viewBox={`${vx} ${vy} ${vw} ${vh}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Optics schematic"
        onClick={onCanvasClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setPointer(null)}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', typography: 'body2', cursor, touchAction: 'none', userSelect: 'none' }}
      >
        {/* grid */}
        <Box component="path" d={MINOR} strokeWidth={1} sx={{ stroke: 'var(--mui-palette-canvas-grid)' }} {...line} />
        <Box component="path" d={MAJOR} strokeWidth={1} sx={{ stroke: 'var(--mui-palette-canvas-gridMajor)' }} {...line} />

        {view === '2d' && (
          <>
            {/* origin */}
            <Box component="g" sx={{ color: 'text.meta' }}>
              <path d="M-0.35 0H0.35M0 -0.35V0.35" stroke="currentColor" strokeWidth={1} {...line} />
              <circle r={0.1} stroke="currentColor" strokeWidth={1} {...line} />
              <text x={0.3} y={0.65} fontSize={LABEL * 0.85} fill="currentColor">
                (0,0)
              </text>
            </Box>

            {/* groups */}
            {groupBoxes.map((g) => (
              <Box component="g" key={g.id} sx={{ color: 'canvas.group' }} opacity={SHOW_OPACITY[layerShowOfAny(symbols.filter((s) => s.group === g.id).map((s) => s.z), layer, others)]}>
                <rect x={g.x} y={g.y} width={g.w} height={g.h} stroke="currentColor" strokeWidth={1} strokeDasharray="5 4" {...line} />
                <Box component="text" x={g.x + 0.2} y={g.y - 0.3} fontSize={LABEL * 0.85} sx={{ fill: 'var(--mui-palette-text-secondary)', letterSpacing: '0.08em', fontWeight: 500 }}>
                  {g.label.toUpperCase()}
                </Box>
              </Box>
            ))}

            {/* the light: where it goes, fading out where it runs into nothing, and a dashed hint to the part it misses */}
            {options.showRays !== false && light.paths.map(({ ray, z, points, open }) => {
              const miss = light.misses.find((m) => m.ray.id === ray.id);
              const pts = points.map((p) => toScreen(p, ray.offset));
              const show = layerShow(z, layer, others);
              const lit = open ? pts.slice(0, -1) : pts;
              const a = pts[Math.min(ray.arrowSegment, pts.length - 2)];
              const b = pts[Math.min(ray.arrowSegment + 1, pts.length - 1)];
              const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
              const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
              const lp = pts[Math.min(ray.labelAt, pts.length - 1)];
              const prev = pts[Math.max(0, Math.min(ray.labelAt, pts.length - 1) - 1)];
              const endsRight = lp.x >= prev.x;
              return (
                <Box component="g" key={ray.id} className="schematic-ray" opacity={SHOW_OPACITY[show]} sx={{ color: `rays.${ray.color}`, pointerEvents: 'none' }}>
                  <polyline points={lit.map((p) => `${p.x},${p.y}`).join(' ')} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" {...line} />
                  {open && <RunOut from={pts[pts.length - 2]} to={pts[pts.length - 1]} id={`run-out-${ray.id}`} />}
                  {miss && <MissHint from={toScreen(miss.from)} to={toScreen(miss.at)} />}
                  <path d="M-0.2 -0.14 L0.2 0 L-0.2 0.14 Z" fill="currentColor" transform={`translate(${mid.x} ${mid.y}) rotate(${angle})`} />
                  {options.showRayLabels && (
                    <text
                      x={endsRight ? lp.x - 0.1 : lp.x + 0.5}
                      y={lp.y - 0.35}
                      fontSize={LABEL * 0.9 * nameScale}
                      textAnchor={endsRight ? 'end' : 'start'}
                      fill="currentColor"
                    >
                      {ray.label}
                    </text>
                  )}
                </Box>
              );
            })}

            {/* the sample, in front of the objective, across the way it looks */}
            {objective && (() => {
              const end = toScreen(samplePoint(objective));
              const across = facing(objective).x !== 0 ? `M${end.x} ${end.y - 0.5}V${end.y + 0.9}` : `M${end.x - 0.7} ${end.y}H${end.x + 0.7}`;
              return (
                <Box component="g" opacity={SHOW_OPACITY[layerShow(objective.z, layer, others)]} sx={{ color: 'text.meta', pointerEvents: 'none' }}>
                  <path d={across} stroke="currentColor" strokeWidth={1.5} strokeDasharray="3 2" {...line} />
                  <text x={end.x + 0.3} y={end.y + 1.4} fontSize={LABEL * 0.85} fill="currentColor">
                    sample
                  </text>
                </Box>
              );
            })()}

            {/* symbols */}
            {symbols.map((s) => {
              const b = symbolBounds(s);
              const isSelected = selectedIds.includes(s.id);
              const here = onLayer(s.z);
              return (
                <Box
                  component="g"
                  key={s.id}
                  role="button"
                  tabIndex={here ? 0 : -1}
                  aria-hidden={here ? undefined : true}
                  opacity={SHOW_OPACITY[layerShow(s.z, layer, others)]}
                  pointerEvents={here && (interactive || moving?.ids.includes(s.id)) ? undefined : 'none'}
                  aria-label={`${s.label} (${s.id})`}
                  aria-pressed={isSelected}
                  onPointerDown={(e) => startMove(e, s)}
                  onClick={(e) => {
                    e.stopPropagation();
                    // The click that ends a drag is not a click.
                    if (justMoved.current) return void (justMoved.current = false);
                    onSelect(s.id, e.shiftKey || e.ctrlKey || e.metaKey);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onInspect?.(s.id);
                  }}
                  onKeyDown={(e) => onSymbolKey(e, s.id)}
                  sx={{
                    cursor: onMove ? (moving ? 'grabbing' : 'grab') : 'pointer',
                    color: 'canvas.symbol',
                    outline: 'none',
                    '&:hover .glyph, &:focus-visible .glyph': { color: 'primary.main' },
                  }}
                >
                  {/* Mounted: the cube around the part. Not mounted yet: a dashed outline, no holder. Ideal: a dotted ring, no part yet. */}
                  {(() => {
                    const mounted = s.placement.state === 'in-cube';
                    if (mounted && !options.showCages) return null;
                    const cage = cageOf(b);
                    if (s.placement.state === 'ideal') {
                      return (
                        <circle
                          cx={cage.x + cage.side / 2}
                          cy={cage.y + cage.side / 2}
                          r={(cage.side / 2) * 1.05}
                          strokeWidth={1}
                          strokeDasharray="1 4"
                          strokeLinecap="round"
                          {...line}
                          stroke="var(--mui-palette-primary-main)"
                        />
                      );
                    }
                    return (
                      <rect
                        x={cage.x}
                        y={cage.y}
                        width={cage.side}
                        height={cage.side}
                        rx={0.15}
                        strokeWidth={1}
                        strokeDasharray={mounted ? undefined : '3 3'}
                        {...line}
                        stroke={mounted ? 'var(--mui-palette-text-meta)' : 'var(--mui-palette-warning-main)'}
                      />
                    );
                  })()}
                  {/* generous hit area */}
                  <rect x={b.x - 0.2} y={b.y - 0.2} width={b.w + 0.4} height={b.h + 0.4} fill="transparent" />
                  {/* Turned in its cube by its seat, a quarter at a time. */}
                  <g
                    className="glyph"
                    transform={`translate(${s.x} ${-s.y}) rotate(${s.placement.state === 'in-cube' ? s.placement.seat * 90 : 0})`}
                    stroke="currentColor"
                    strokeWidth={1.5}
                    fill="none"
                  >
                    {(() => {
                      // Real glass at its true size (1 unit = one cube); a mirror lies at 45°, as its symbol does.
                      const glass = (s.kind === 'lens' || s.kind === 'mirror') && s.placement.state !== 'ideal' ? opticFor?.(s) : undefined;
                      return glass ? (
                        <g transform={`scale(${1 / schematic.unitMm})${s.kind === 'mirror' ? ' rotate(45)' : ''}`}>
                          <OpticOutline surfaces={glass} strokeWidth={1.5} nonScaling />
                        </g>
                      ) : (
                        <SymbolGlyphNonScaling kind={s.kind} />
                      );
                    })()}
                  </g>
                  {options.showPartLabels !== false && (
                    <Box
                      component="text"
                      x={b.x + b.w / 2}
                      y={nameTop(b) + LABEL * nameScale}
                      fontSize={LABEL * nameScale}
                      textAnchor="middle"
                      sx={{
                        fill:
                          s.placement.state === 'unmounted'
                            ? 'var(--mui-palette-warning-main)'
                            : s.placement.state === 'ideal'
                              ? 'var(--mui-palette-primary-main)'
                            : isSelected
                              ? 'var(--mui-palette-text-primary)'
                              : 'var(--mui-palette-text-secondary)',
                      }}
                    >
                      {s.label}
                      {s.placement.state === 'ideal' && specLine(s) && <tspan opacity={0.7}>{` · ${specLine(s)}`}</tspan>}
                    </Box>
                  )}
                  {/* A locked part wears a small padlock. */}
                  {s.locks && Object.values(s.locks).some(Boolean) && (
                    <g transform={`translate(${b.x + b.w + 0.15} ${b.y - 0.15})`} pointerEvents="none">
                      {/* Plain SVG: a Box would read width and height as CSS sizes. */}
                      <rect x={-0.17} y={-0.05} width={0.34} height={0.26} rx={0.04} fill="var(--mui-palette-text-secondary)" />
                      <path d="M-0.1 -0.05V-0.13A0.1 0.1 0 0 1 0.1 -0.13V-0.05" fill="none" stroke="var(--mui-palette-text-secondary)" strokeWidth={0.06} />
                    </g>
                  )}
                </Box>
              );
            })}

            {selectedParts.map((s) => (
              <Selection key={s.id} s={s} />
            ))}

            {/* the box being dragged out to select */}
            {marquee && (
              <rect
                x={marquee.x0}
                y={marquee.y0}
                width={marquee.x1 - marquee.x0}
                height={marquee.y1 - marquee.y0}
                fill="color-mix(in srgb, var(--mui-palette-primary-main) 8%, transparent)"
                stroke="var(--mui-palette-primary-main)"
                strokeWidth={1}
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            )}

            {/* where the dragged parts are going: the one under the pointer says */}
            {moving && (() => {
              const s = symbols.find((sym) => sym.id === (moving.copy ? `${moving.anchor}-copy` : moving.anchor));
              if (!s) return null;
              const b = symbolBounds(s);
              const many = moving.ids.length > 1 ? `${moving.ids.length} parts · ` : '';
              const text = `${many}x ${s.x}  y ${s.y}${moving.free ? ' · off grid' : ''}${moving.copy ? ' · copy' : ''}`;
              return (
                <Box
                  component="text"
                  x={b.x + b.w / 2}
                  y={b.y - 0.55}
                  fontSize={LABEL * 0.95}
                  textAnchor="middle"
                  sx={{ fill: 'var(--mui-palette-primary-main)', fontFamily: (t) => t.typography.mono.fontFamily, paintOrder: 'stroke', stroke: 'var(--mui-palette-canvas-ground)', strokeWidth: 0.12, pointerEvents: 'none' }}
                >
                  {text}
                </Box>
              );
            })()}

            {/* the part being placed, under the cursor, in the cube it will have */}
            {placing && pointer && (() => {
              const cage = cageOf(symbolBounds({ kind: placing.kind, x: pointer.x, y: -pointer.y }));
              return (
                <Box component="g" sx={{ color: 'primary.main', pointerEvents: 'none' }} opacity={0.7}>
                  <rect x={cage.x} y={cage.y} width={cage.side} height={cage.side} rx={0.15} stroke="currentColor" strokeDasharray="3 3" strokeWidth={1} {...line} />
                  <g transform={`translate(${pointer.x} ${pointer.y})`} stroke="currentColor" strokeWidth={1.5} fill="none">
                    <SymbolGlyphNonScaling kind={placing.kind} />
                  </g>
                </Box>
              );
            })()}

            {/* the measure: from the first click to the second, or to the cursor */}
            {tool === 'measure' && measure && <Measure a={measure.a} b={measure.b ?? pointer} unitMm={schematic.unitMm} />}
          </>
        )}
      </Box>

      {/* other views: placeholder */}
      {view === '3d' && (
        <Stack spacing={1} sx={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: 'text.secondary' }}>
          <ViewInArOutlinedIcon />
          <Typography variant="subtitle2">{VIEW_LABELS[view]}</Typography>
          <Typography variant="body2">
            The same design in 3D: cube cages, other layers translucent.
          </Typography>
        </Stack>
      )}

      {toolbar && <Box sx={{ position: 'absolute', top: (t) => t.spacing(1.5), left: (t) => t.spacing(1.5) }}>{toolbar}</Box>}

      {/* axis indicator */}
      <Box
        component="svg"
        viewBox="0 0 40 40"
        aria-hidden
        sx={{ position: 'absolute', left: (t) => t.spacing(2), bottom: (t) => t.spacing(2), width: (t) => t.spacing(6), height: (t) => t.spacing(6), color: 'text.meta', typography: 'caption' }}
      >
        <path d="M6 34 H34 M30 30 L34 34 L30 38 M6 34 V6 M2 10 L6 6 L10 10" fill="none" stroke="currentColor" strokeWidth={1.25} />
        <text x={36} y={37} fontSize={8} fill="currentColor">
          x
        </text>
        <text x={1} y={5} fontSize={8} fill="currentColor">
          y
        </text>
      </Box>

      {/* the selection's actions, just above it (below it near the top edge) */}
      {view === '2d' && selectedParts.length > 0 && selectionActions && interactive && selectedParts.some((s) => onLayer(s.z)) && (() => {
        const boxes = selectedParts.filter((s) => onLayer(s.z)).map(symbolBounds);
        const x0 = Math.min(...boxes.map((r) => r.x));
        const y0 = Math.min(...boxes.map((r) => r.y));
        const b = { x: x0, y: y0, w: Math.max(...boxes.map((r) => r.x + r.w)) - x0 };
        const under = Math.max(...boxes.map(nameTop)) + LABEL * nameScale + 0.2;
        const above = (b.y - vy) * scale - 12;
        const flip = above < 72;
        return (
          <Box
            sx={{
              position: 'absolute',
              left: (b.x + b.w / 2 - vx) * scale,
              top: flip ? (under - vy) * scale + 12 : above,
              transform: flip ? 'translateX(-50%)' : 'translate(-50%, -100%)',
              zIndex: 1,
            }}
          >
            {selectionActions}
          </Box>
        );
      })()}

      {/* hint */}
      {view === '2d' && hint && (selectedParts.length === 0 || !interactive) && (
        <Paper
          variant="outlined"
          sx={{
            position: 'absolute',
            left: hintPlace?.left ?? '50%',
            ...(hintPlace ? { top: hintPlace.top, maxWidth: hintPlace.maxWidth, width: 'max-content' } : { [hintAt]: (t: Theme) => t.spacing(2.5) }),
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: (t) => `${t.radius.tile}px`,
            pointerEvents: 'none',
            whiteSpace: hintPlace ? 'normal' : 'nowrap',
          }}
        >
          <NearMeOutlinedIcon fontSize="small" sx={{ transform: 'scaleX(-1)', color: 'text.secondary' }} />
          <Typography variant="body2">{moving ? 'Shift: off the grid · Alt: drop copies · Esc: put back' : marquee ? 'Everything the box touches · Shift adds to the selection' : hint}</Typography>
        </Paper>
      )}
    </Box>
  );
}

/** A measured distance: a dashed line and its length in mm and in cubes. */
function Measure({ a, b, unitMm }: { a: { x: number; y: number }; b: { x: number; y: number } | null; unitMm: number }) {
  if (!b) return <Box component="circle" cx={a.x} cy={a.y} r={0.15} sx={{ fill: 'var(--mui-palette-primary-main)' }} />;
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  return (
    <Box component="g" sx={{ color: 'primary.main', pointerEvents: 'none' }}>
      <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke="currentColor" strokeWidth={1.5} strokeDasharray="6 3" {...line} />
      <circle cx={a.x} cy={a.y} r={0.15} fill="currentColor" />
      <circle cx={b.x} cy={b.y} r={0.15} fill="currentColor" />
      <Box
        component="text"
        x={(a.x + b.x) / 2}
        y={(a.y + b.y) / 2 - 0.4}
        fontSize={LABEL * 1.1}
        textAnchor="middle"
        sx={{ fill: 'currentColor', paintOrder: 'stroke', stroke: 'var(--mui-palette-canvas-ground)', strokeWidth: 0.12, strokeLinejoin: 'round' }}
      >
        {`${Math.round(d * unitMm)} mm · ${+d.toFixed(2)} cubes`}
      </Box>
    </Box>
  );
}

/** SymbolGlyph with non-scaling strokes on every child shape. */
function SymbolGlyphNonScaling({ kind }: { kind: SchematicSymbol['kind'] }) {
  return (
    <Box component="g" sx={{ '& *': { vectorEffect: 'non-scaling-stroke' } }}>
      <SymbolGlyph kind={kind} />
    </Box>
  );
}
