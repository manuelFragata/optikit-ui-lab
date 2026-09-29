import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { rayPoints, symbolBounds, type Schematic, type SchematicSymbol } from './model';
import { SymbolGlyph } from './SymbolGlyph';
import { VIEW_LABELS, type EditorView, type ViewOptions } from './CanvasToolbar';

export interface SchematicCanvasProps {
  schematic: Schematic;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  view?: EditorView;
  options: Pick<ViewOptions, 'showRayLabels'> & Partial<Pick<ViewOptions, 'showCages'>>;
  /** Floating controls in the top-left corner (see CanvasToolbar). */
  toolbar?: ReactNode;
  /**
   * Fit the drawing into the frame (never zooming in past 100%) instead of the
   * fixed editor zoom. For previews and small embeds.
   */
  fit?: boolean;
  /** Bottom hint while nothing is selected; `false` hides it. */
  hint?: string | false;
}

// Everything inside the SVG is in grid units: 1 unit = 1 cube. The zoom is
// fixed (PX_PER_UNIT at 100%); the viewBox follows the canvas size and stays
// centred on the drawing, so opening a side panel never rescales the schematic.
const GRID = { minX: -40, maxX: 80, minY: -50, maxY: 30 };
const PX_PER_UNIT = 32;
const CENTER = { x: 10, y: -7.5 }; // drawing centre, screen coordinates (y down)
const LABEL = 0.4; // label font size, grid units
const PAD = 0.9; // group box padding around its symbols
const FIT_MARGIN = 2.5; // grid units kept free around a fitted drawing

/** Screen-space bounds (y down) of every symbol and ray point. */
function drawingBounds({ symbols, rays }: Schematic) {
  const boxes = symbols.map(symbolBounds);
  const points = rays.flatMap((r) => rayPoints(r, symbols));
  const xs = [...boxes.flatMap((b) => [b.x, b.x + b.w]), ...points.map((p) => p.x)];
  const ys = [...boxes.flatMap((b) => [b.y, b.y + b.h + LABEL]), ...points.map((p) => p.y)];
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
  onSelect,
  view = '2d',
  options,
  toolbar,
  fit = false,
  hint = 'Select a symbol to open its properties',
}: SchematicCanvasProps) {
  const { symbols, groups, rays } = schematic;
  const selected = symbols.find((s) => s.id === selectedId) ?? null;

  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 960, h: 600 });
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const bounds = fit ? drawingBounds(schematic) : null;
  const scale = bounds ? Math.min(PX_PER_UNIT, size.w / bounds.w, size.h / bounds.h) : PX_PER_UNIT;
  const center = bounds ? { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 } : CENTER;
  const vw = size.w / scale;
  const vh = size.h / scale;

  const groupBoxes = groups.flatMap((g) => {
    const members = symbols.filter((s) => s.group === g.id).map(symbolBounds);
    if (members.length === 0) return [];
    const x0 = Math.min(...members.map((b) => b.x)) - PAD;
    const y0 = Math.min(...members.map((b) => b.y)) - PAD;
    const x1 = Math.max(...members.map((b) => b.x + b.w)) + PAD;
    const y1 = Math.max(...members.map((b) => b.y + b.h)) + PAD + LABEL; // room for symbol labels
    return [{ ...g, x: x0, y: y0, w: x1 - x0, h: y1 - y0 }];
  });

  const onSymbolKey = (event: KeyboardEvent, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(id);
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
        viewBox={`${center.x - vw / 2} ${center.y - vh / 2} ${vw} ${vh}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Optics schematic"
        onClick={() => onSelect(null)}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', typography: 'body2' }}
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
              <Box component="g" key={g.id} sx={{ color: 'canvas.group' }}>
                <rect x={g.x} y={g.y} width={g.w} height={g.h} stroke="currentColor" strokeWidth={1} strokeDasharray="5 4" {...line} />
                <Box component="text" x={g.x + 0.2} y={g.y - 0.3} fontSize={LABEL * 0.85} sx={{ fill: 'var(--mui-palette-text-secondary)', letterSpacing: '0.08em', fontWeight: 500 }}>
                  {g.label.toUpperCase()}
                </Box>
              </Box>
            ))}

            {/* rays */}
            {rays.map((ray) => {
              const pts = rayPoints(ray, symbols);
              if (pts.length < 2) return null;
              const a = pts[Math.min(ray.arrowSegment, pts.length - 2)];
              const b = pts[Math.min(ray.arrowSegment + 1, pts.length - 1)];
              const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
              const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
              const lp = pts[Math.min(ray.labelAt, pts.length - 1)];
              const prev = pts[Math.max(0, Math.min(ray.labelAt, pts.length - 1) - 1)];
              const endsRight = lp.x >= prev.x;
              return (
                <Box component="g" key={ray.id} sx={{ color: `rays.${ray.color}`, pointerEvents: 'none' }}>
                  <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" {...line} />
                  <path d="M-0.2 -0.14 L0.2 0 L-0.2 0.14 Z" fill="currentColor" transform={`translate(${mid.x} ${mid.y}) rotate(${angle})`} />
                  {options.showRayLabels && (
                    <text
                      x={endsRight ? lp.x - 0.1 : lp.x + 0.5}
                      y={lp.y - 0.35}
                      fontSize={LABEL * 0.9}
                      textAnchor={endsRight ? 'end' : 'start'}
                      fill="currentColor"
                    >
                      {ray.label}
                    </text>
                  )}
                </Box>
              );
            })}

            {/* sample plane */}
            {(() => {
              const pts = rays.length ? rayPoints(rays[0], symbols) : [];
              const end = pts[pts.length - 1];
              if (!end) return null;
              return (
                <Box component="g" sx={{ color: 'text.meta', pointerEvents: 'none' }}>
                  <path d={`M${end.x} ${end.y - 0.5}V${end.y + 0.9}`} stroke="currentColor" strokeWidth={1.5} strokeDasharray="3 2" {...line} />
                  <text x={end.x + 0.3} y={end.y + 1.4} fontSize={LABEL * 0.85} fill="currentColor">
                    sample
                  </text>
                </Box>
              );
            })()}

            {/* symbols */}
            {symbols.map((s) => {
              const b = symbolBounds(s);
              const isSelected = s.id === selectedId;
              return (
                <Box
                  component="g"
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${s.label} (${s.id})`}
                  aria-pressed={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(s.id);
                  }}
                  onKeyDown={(e) => onSymbolKey(e, s.id)}
                  sx={{
                    cursor: 'pointer',
                    color: 'canvas.symbol',
                    outline: 'none',
                    '&:hover .glyph, &:focus-visible .glyph': { color: 'primary.main' },
                  }}
                >
                  {/* Mounted: the cube around the part. Not mounted yet: a dashed outline, no holder. */}
                  {(() => {
                    const mounted = s.placement.state === 'in-cube';
                    if (mounted && !options.showCages) return null;
                    const side = Math.max(b.w, b.h) + 0.5;
                    const cx = b.x + b.w / 2;
                    const cy = b.y + b.h / 2;
                    return (
                      <Box
                        component="rect"
                        x={cx - side / 2}
                        y={cy - side / 2}
                        width={side}
                        height={side}
                        rx={0.15}
                        strokeWidth={1}
                        strokeDasharray={mounted ? undefined : '3 3'}
                        {...line}
                        sx={{ stroke: mounted ? 'var(--mui-palette-text-meta)' : 'var(--mui-palette-warning-main)' }}
                      />
                    );
                  })()}
                  {/* generous hit area */}
                  <rect x={b.x - 0.2} y={b.y - 0.2} width={b.w + 0.4} height={b.h + 0.4} fill="transparent" />
                  <g className="glyph" transform={`translate(${s.x} ${-s.y})`} stroke="currentColor" strokeWidth={1.5} fill="none">
                    <SymbolGlyphNonScaling kind={s.kind} />
                  </g>
                  <Box
                    component="text"
                    x={b.x + b.w / 2}
                    y={b.y + b.h + LABEL + 0.15}
                    fontSize={LABEL}
                    textAnchor="middle"
                    sx={{
                      fill:
                        s.placement.state === 'unmounted'
                          ? 'var(--mui-palette-warning-main)'
                          : isSelected
                            ? 'var(--mui-palette-text-primary)'
                            : 'var(--mui-palette-text-secondary)',
                    }}
                  >
                    {s.label}
                  </Box>
                </Box>
              );
            })}

            {selected && <Selection s={selected} />}
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

      {/* hint */}
      {view === '2d' && !selected && hint && (
        <Paper
          variant="outlined"
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: (t) => t.spacing(2.5),
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: (t) => `${t.radius.tile}px`,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <NearMeOutlinedIcon fontSize="small" sx={{ transform: 'scaleX(-1)', color: 'text.secondary' }} />
          <Typography variant="body2">{hint}</Typography>
        </Paper>
      )}
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
