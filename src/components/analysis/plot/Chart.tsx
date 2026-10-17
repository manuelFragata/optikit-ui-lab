/**
 * The plots' kit, set as a research paper's figures are: a dark frame with
 * major and minor ticks pointing in on all four sides, no grid, a faint
 * line at zero, and all text in the serif of scientific publishing (STIX Two
 * Text): tick numbers with a true minus, axis titles with their variables in
 * italic and their unit in parentheses ("Defocus Δ*z* (mm)"; see markup.ts).
 * Series are clipped to the frame. Drawn at the container's real pixel size
 * (measured), so text keeps its size however wide the plot is.
 *
 * - `Figure`: a plot's title and its key figures above it, on a hairline panel,
 *   with its export as SVG or PNG (exportFigure.ts).
 * - `Chart`: the axes; its children get the scales and draw the series.
 * - `Line`, `Dots`, `Rule`, `Legend`, `Label`: what goes on it.
 */
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import type { SxProps, Theme } from '@mui/material/styles';
import { fonts } from '../../../theme/tokens';
import { usePreferences } from '../../../settings/preferences';
import { exportPng, exportSvg, fileNameOf, type PlotGround } from './exportFigure';
import { plainOf, runsOf } from './markup';
import { linear, tickLabel, ticks as ticksOf, type Ticks } from './scale';

/** The plots' colours, from the theme: ink for data and the frame, the accent for a second series. */
export const INK = 'var(--mui-palette-text-primary)';
export const ACCENT = 'var(--mui-palette-primary-main)';
export const WARN = 'var(--mui-palette-warning-main)';
export const ALERT = 'var(--mui-palette-error-main)';
export const MUTED = 'var(--mui-palette-text-secondary)';
const PAPER = 'var(--mui-palette-background-paper)';
const SERIF = fonts.plot;

const MAJOR = 5;
const MINOR = 2.5;
const TICK_FONT = 11.5;
const TITLE_FONT = 12.5;
/** About how wide a figure is in the serif at the tick size (lining figures are half an em). */
const DIGIT = TICK_FONT * 0.5;
/** About how wide a letter is, on average, at the title size. */
const LETTER = TITLE_FONT * 0.46;

export interface Axis {
  domain: [number, number];
  /** The quantity, in the label markup: "Defocus Δ*z*". */
  label: string;
  /** Shown in parentheses after the label. */
  unit?: string;
  /** Widen the domain out to whole ticks (default). */
  nice?: boolean;
  /** About how many ticks. */
  count?: number;
  /** Ticks by hand (the domain stays as given). */
  values?: number[];
  format?: (v: number) => string;
  /** A faint line at zero, when the domain crosses it. */
  zero?: boolean;
  /** Tick labels are names, not numbers: no minor ticks. */
  names?: boolean;
}

export interface Scales {
  x: (v: number) => number;
  y: (v: number) => number;
  /** The plot area, in pixels. */
  left: number;
  right: number;
  top: number;
  bottom: number;
  xTicks: Ticks;
  yTicks: Ticks;
}

/** The width of an element, kept up to date. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

const ticksFor = (a: Axis): Ticks =>
  a.values ? { domain: a.domain, step: a.values.length > 1 ? Math.abs(a.values[1] - a.values[0]) : 1, values: a.values } : ticksOf(a.domain[0], a.domain[1], { count: a.count, nice: a.nice });

/** Minor ticks between the majors: fifths of a 1 or 5 step, quarters of a 2. */
function minorsOf(t: Ticks): number[] {
  const lead = Math.round(t.step / 10 ** Math.floor(Math.log10(t.step) + 1e-9));
  const minor = t.step / (lead === 2 ? 4 : 5);
  const out: number[] = [];
  const [lo, hi] = t.domain[0] <= t.domain[1] ? t.domain : [t.domain[1], t.domain[0]];
  for (let k = Math.ceil(lo / minor - 1e-9); k * minor <= hi + minor * 1e-9; k++) {
    const v = k * minor;
    if (!t.values.some((m) => Math.abs(m - v) < minor * 1e-6)) out.push(v);
  }
  return out;
}

/** Text in the label markup, as SVG runs: italics, and subscripts set smaller and lower. */
export function Label({ text, ...props }: { text: string } & React.SVGProps<SVGTextElement>) {
  const runs = runsOf(text);
  return (
    <text fontFamily={SERIF} {...props}>
      {runs.map((r, i) => {
        const after = runs[i - 1]?.sub && !r.sub;
        return (
          <tspan key={i} fontStyle={r.italic ? 'italic' : undefined} fontSize={r.sub ? '0.72em' : undefined} dy={r.sub ? '0.28em' : after ? '-0.28em' : undefined}>
            {r.text}
          </tspan>
        );
      })}
      <title>{plainOf(text)}</title>
    </text>
  );
}

export interface ChartProps {
  x: Axis;
  y: Axis;
  /** Total height, px. */
  height?: number;
  /** Equal scales across and up, the plot area square (a spot diagram). */
  square?: boolean;
  /** For screen readers: what the plot shows. */
  label: string;
  /** The series, clipped to the plot area. */
  children: (s: Scales) => ReactNode;
  /** Drawn over the frame, unclipped: labels on rules, a legend. */
  overlay?: (s: Scales) => ReactNode;
  /** Room above the frame, px (for labels over the plot). */
  headroom?: number;
}

/** Axes with their ticks and titles; the series inside, clipped to the frame. */
export function Chart({ x: xAxis, y: yAxis, height = 240, square = false, label, children, overlay, headroom = 0 }: ChartProps) {
  const clip = useId();
  const [ref, width] = useWidth();

  const xt = ticksFor(xAxis);
  const yt = ticksFor(yAxis);
  const xFormat = xAxis.format ?? ((v: number) => tickLabel(v, xt.step));
  const yFormat = yAxis.format ?? ((v: number) => tickLabel(v, yt.step));
  const yLabelWidth = Math.max(...yt.values.map((v) => yFormat(v).length)) * (yAxis.names ? LETTER : DIGIT);
  const margin = { left: (yAxis.label ? TITLE_FONT + 10 : 4) + 6 + yLabelWidth, right: 14, top: 10 + headroom, bottom: 6 + TICK_FONT + 8 + TITLE_FONT + 6 };
  let left = margin.left;
  let right = Math.max(left + 40, width - margin.right);
  const top = margin.top;
  let bottom = height - margin.bottom;
  if (square) {
    const side = Math.max(40, Math.min(right - left, bottom - top));
    const free = right - left - side;
    left += free / 2;
    right = left + side;
    bottom = top + side;
  }
  const s: Scales = { x: linear(xt.domain, [left, right]), y: linear(yt.domain, [bottom, top]), left, right, top, bottom, xTicks: xt, yTicks: yt };
  const crosses = (d: [number, number]) => d[0] < 0 && d[1] > 0;
  const xMinor = xAxis.names ? [] : minorsOf(xt);
  const yMinor = yAxis.names ? [] : minorsOf(yt);
  const xTitle = xAxis.unit ? `${xAxis.label} (${xAxis.unit})` : xAxis.label;
  const yTitle = yAxis.unit ? `${yAxis.label} (${yAxis.unit})` : yAxis.label;

  return (
    <Box ref={ref} sx={{ width: '100%', minWidth: 0 }}>
      {width > 0 && (
        <svg width={width} height={square ? bottom + margin.bottom : height} role="img" aria-label={label} data-plot="" style={{ display: 'block', userSelect: 'none' }}>
          <defs>
            <clipPath id={clip}>
              <rect x={left} y={top} width={right - left} height={bottom - top} />
            </clipPath>
          </defs>
          <rect x={left} y={top} width={right - left} height={bottom - top} fill={PAPER} />
          <g stroke={MUTED} strokeWidth={0.75} strokeDasharray="2 3" opacity={0.6} shapeRendering="crispEdges">
            {xAxis.zero && crosses(xt.domain) && <line x1={s.x(0)} x2={s.x(0)} y1={top} y2={bottom} />}
            {yAxis.zero && crosses(yt.domain) && <line x1={left} x2={right} y1={s.y(0)} y2={s.y(0)} />}
          </g>

          <g clipPath={`url(#${clip})`}>{children(s)}</g>

          {/* The frame, with its ticks pointing in on all four sides. */}
          <g stroke={INK} strokeWidth={1} fill="none" shapeRendering="crispEdges">
            <rect x={left} y={top} width={right - left} height={bottom - top} />
            {xt.values.map((v) => (
              <path key={`tx${v}`} d={`M${s.x(v)} ${bottom}v${-MAJOR}M${s.x(v)} ${top}v${MAJOR}`} />
            ))}
            {xMinor.map((v) => (
              <path key={`mx${v}`} d={`M${s.x(v)} ${bottom}v${-MINOR}M${s.x(v)} ${top}v${MINOR}`} />
            ))}
            {yt.values.map((v) => (
              <path key={`ty${v}`} d={`M${left} ${s.y(v)}h${MAJOR}M${right} ${s.y(v)}h${-MAJOR}`} />
            ))}
            {yMinor.map((v) => (
              <path key={`my${v}`} d={`M${left} ${s.y(v)}h${MINOR}M${right} ${s.y(v)}h${-MINOR}`} />
            ))}
          </g>
          <g fontFamily={SERIF} fontSize={TICK_FONT} fill={INK} style={{ fontVariantNumeric: 'lining-nums tabular-nums' }}>
            {xt.values.map((v) => (
              <text key={`lx${v}`} x={s.x(v)} y={bottom + 6 + TICK_FONT} textAnchor="middle">
                {xFormat(v)}
              </text>
            ))}
            {yt.values.map((v) => (
              <text key={`ly${v}`} x={left - 6} y={s.y(v) + TICK_FONT * 0.34} textAnchor="end" fontSize={yAxis.names ? TITLE_FONT : undefined}>
                {yFormat(v)}
              </text>
            ))}
          </g>
          <g fontSize={TITLE_FONT} fill={INK}>
            <Label text={xTitle} x={(left + right) / 2} y={bottom + 6 + TICK_FONT + 8 + TITLE_FONT} textAnchor="middle" />
            {yAxis.label && <Label text={yTitle} transform={`translate(${left - 10 - yLabelWidth} ${(top + bottom) / 2}) rotate(-90)`} textAnchor="middle" />}
          </g>
          {overlay?.(s)}
        </svg>
      )}
    </Box>
  );
}

/** A line through points (data units). */
export function Line({ s, points, color = INK, width = 1.25, dash }: { s: Scales; points: [number, number][]; color?: string; width?: number; dash?: string }) {
  if (points.length < 2) return null;
  const d = points.map(([px, py], i) => `${i ? 'L' : 'M'}${s.x(px).toFixed(1)} ${s.y(py).toFixed(1)}`).join('');
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinejoin="round" />;
}

/** Points as small dots (data units). */
export function Dots({ s, points, color = INK, r = 1.4, opacity = 0.9 }: { s: Scales; points: { x: number; y: number }[]; color?: string; r?: number; opacity?: number }) {
  return (
    <g fill={color} opacity={opacity}>
      {points.map((p, i) => (
        <circle key={i} cx={s.x(p.x)} cy={s.y(p.y)} r={r} />
      ))}
    </g>
  );
}

/** A vertical reference line at `at` (data units), labelled at its top (or `foot`) inside the frame. Goes in `overlay`. */
export function Rule({
  s,
  at,
  label,
  color = INK,
  dash = '4 3',
  side = 'right',
  foot = false,
}: {
  s: Scales;
  at: number;
  label?: string;
  color?: string;
  dash?: string;
  side?: 'left' | 'right';
  foot?: boolean;
}) {
  const px = s.x(at);
  if (px < s.left - 0.5 || px > s.right + 0.5) return null;
  const flip = side === 'left' || px > s.right - 80;
  return (
    <g>
      <line x1={px} x2={px} y1={s.top} y2={s.bottom} stroke={color} strokeWidth={1} strokeDasharray={dash} shapeRendering="crispEdges" />
      {label && (
        <Label
          text={label}
          x={px + (flip ? -5 : 5)}
          y={foot ? s.bottom - 7 : s.top + 15}
          textAnchor={flip ? 'end' : 'start'}
          fontSize={TICK_FONT}
          fill={color}
          stroke={PAPER}
          strokeWidth={3}
          paintOrder="stroke"
        />
      )}
    </g>
  );
}

export interface LegendItem {
  /** In the label markup. */
  label: string;
  color: string;
  dash?: string;
  /** A dot instead of a line. */
  dot?: boolean;
}

/** A legend in the plot's top right corner, on a paper ground with a thin frame. Goes in `overlay`. */
export function Legend({ s, items }: { s: Scales; items: LegendItem[] }) {
  const row = 16;
  const w = 32 + Math.max(...items.map((i) => plainOf(i.label).length)) * TICK_FONT * 0.47;
  const x0 = s.right - w - 8;
  const y0 = s.top + 8;
  return (
    <g fontSize={TICK_FONT}>
      <rect x={x0} y={y0} width={w} height={items.length * row + 6} fill={PAPER} fillOpacity={0.94} stroke={INK} strokeWidth={0.5} shapeRendering="crispEdges" />
      {items.map((it, i) => {
        const cy = y0 + 3 + row * i + row / 2;
        return (
          <g key={it.label}>
            {it.dot ? <circle cx={x0 + 13} cy={cy} r={2} fill={it.color} /> : <line x1={x0 + 5} x2={x0 + 21} y1={cy} y2={cy} stroke={it.color} strokeWidth={1.25} strokeDasharray={it.dash} />}
            <Label text={it.label} x={x0 + 27} y={cy + 4} fill={INK} />
          </g>
        );
      })}
    </g>
  );
}

const GROUNDS: { value: PlotGround; label: string; swatch: string }[] = [
  { value: 'white', label: 'White', swatch: '#ffffff' },
  { value: 'transparent', label: 'Transparent', swatch: 'repeating-conic-gradient(#d0d4da 0% 25%, #ffffff 0% 50%) 50% / 8px 8px' },
  { value: 'dark', label: 'Dark', swatch: '#14181d' },
];

/** The ground exported plots are saved on: three swatches and a colour of one's own. */
function GroundPicker({ value, onChange }: { value: PlotGround; onChange: (g: PlotGround) => void }) {
  const custom = value.startsWith('#') ? value : null;
  const swatchSx = (on: boolean, background: string) => (t: Theme) => ({
    width: 24,
    height: 24,
    borderRadius: '50%',
    background,
    border: `1px solid ${(t.vars ?? t).palette.divider}`,
    outline: on ? `2px solid ${(t.vars ?? t).palette.primary.main}` : 'none',
    outlineOffset: 2,
  });
  return (
    <Box sx={{ px: 2, pt: 1, pb: 1.5 }} onKeyDown={(e) => e.stopPropagation()}>
      <Typography variant="overline" color="text.secondary" component="div" sx={{ lineHeight: 2 }}>
        Background
      </Typography>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }} role="radiogroup" aria-label="Background">
        {GROUNDS.map((g) => (
          <Tooltip key={g.value} title={g.label}>
            <ButtonBase role="radio" aria-checked={value === g.value} aria-label={g.label} onClick={() => onChange(g.value)} sx={swatchSx(value === g.value, g.swatch)} />
          </Tooltip>
        ))}
        <Tooltip title="A colour of your own">
          <ButtonBase
            component="label"
            role="radio"
            aria-checked={Boolean(custom)}
            aria-label="A colour of your own"
            sx={swatchSx(Boolean(custom), custom ?? 'conic-gradient(#e5484d, #f5a524, #46a758, #0090ff, #8e4ec6, #e5484d)')}
          >
            <Box component="input" type="color" value={custom ?? '#f4efe6'} onChange={(e) => onChange(e.target.value as PlotGround)} sx={{ opacity: 0, width: 0, height: 0, p: 0, border: 0 }} />
          </ButtonBase>
        </Tooltip>
        <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
          {custom ? custom.toUpperCase() : GROUNDS.find((g) => g.value === value)?.label}
        </Typography>
      </Stack>
    </Box>
  );
}

/** A plot as a figure: its title and key figures above it, on a hairline panel, and its export (SVG or PNG). The figures are set in the plots' serif. */
export function Figure({ title, meta, children, sx, fileName }: { title: ReactNode; meta?: ReactNode; children: ReactNode; sx?: SxProps<Theme>; fileName?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const { prefs, update } = usePreferences();
  const ground = (prefs.plotGround || 'white') as PlotGround;
  const [error, setError] = useState<string | null>(null);
  const name = fileName ?? fileNameOf(typeof title === 'string' ? title : 'plot');
  const save = async (as: 'svg' | 'png') => {
    setMenu(null);
    const svg = ref.current?.querySelector<SVGSVGElement>('svg[data-plot]');
    if (!svg) return;
    try {
      setError(null);
      await (as === 'svg' ? exportSvg(svg, name, ground) : exportPng(svg, name, ground));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The plot could not be saved.');
    }
  };
  return (
    <Box
      ref={ref}
      component="figure"
      sx={[
        (t) => ({ m: 0, minWidth: 0, bgcolor: 'background.paper', border: `${t.layout.hairline}px solid`, borderColor: 'divider', borderRadius: 1, px: 1.5, pt: 1, pb: 0.75 }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Stack component="figcaption" direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.5, minHeight: 24 }}>
        <Typography variant="caption" sx={{ fontWeight: 'fontWeightMedium', color: 'text.primary', letterSpacing: '0.01em', flex: 1, minWidth: 0 }} noWrap>
          {title}
        </Typography>
        {meta && (
          <Typography component="span" color="text.secondary" sx={{ fontFamily: SERIF, fontSize: 13, fontVariantNumeric: 'lining-nums tabular-nums', minWidth: 0 }} noWrap>
            {meta}
          </Typography>
        )}
        <Tooltip title="Export the plot">
          <IconButton size="small" aria-label="Export the plot" aria-haspopup="menu" onClick={(e) => setMenu(e.currentTarget)} sx={{ my: -0.5, mr: -0.75, color: 'text.secondary' }}>
            <FileDownloadOutlinedIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <GroundPicker value={ground} onChange={(plotGround) => update({ plotGround })} />
          <Divider />
          <MenuItem onClick={() => save('svg')}>
            <ListItemText primary="SVG" secondary="Vector, for papers and slides" />
          </MenuItem>
          <MenuItem onClick={() => save('png')}>
            <ListItemText primary="PNG" secondary={ground === 'transparent' ? 'Image at 3× (about 300 dpi), transparent' : 'Image at 3× (about 300 dpi)'} />
          </MenuItem>
        </Menu>
      </Stack>
      {error && (
        <Typography variant="caption" color="error.main" component="div" role="alert" sx={{ mb: 0.5 }}>
          {error}
        </Typography>
      )}
      {children}
    </Box>
  );
}
