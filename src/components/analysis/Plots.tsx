/**
 * The analyses' plots, each one picture: the spot at a plane, the ray fan,
 * the RMS spot through focus, how full each part's aperture is, and what the
 * path passes across the spectrum. Drawn in SVG with the theme's colours.
 */
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { nmColor } from '../editor/optics/nmColor';
import type { Beam } from '../../standins/kernel/simulate/beam';
import type { BeamResult } from '../../standins/kernel/simulate/paraxial';

const W = 480;
const H = 210;
const PAD = { left: 40, right: 12, top: 12, bottom: 30 };
const ink = 'var(--mui-palette-text-primary)';
const meta = 'var(--mui-palette-text-meta)';
const muted = 'var(--mui-palette-text-secondary)';
const rule = 'var(--mui-palette-divider)';

function Svg({ label, children, height = H }: { label: string; children: ReactNode; height?: number }) {
  return (
    <Box component="svg" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label} sx={{ width: '100%', display: 'block', fontFamily: 'inherit' }}>
      {children}
    </Box>
  );
}

export function Empty({ children }: { children: string }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
      {children}
    </Typography>
  );
}

/** Each part's clear aperture, and how much of it the beam fills: past 100 % it clips. */
export function ApertureFill({ beam, result }: { beam: Beam; result: BeamResult }) {
  const rows = beam.elements.flatMap((e, i) => (e.apertureMm ? [{ e, fill: result.elements[i].beamMm / e.apertureMm }] : []));
  if (!rows.length) return <Empty>No part states an aperture.</Empty>;
  const row = 26;
  const height = PAD.top + rows.length * row + 22;
  const left = 130;
  const max = Math.max(1.2, ...rows.map((r) => r.fill));
  const x = (f: number) => left + (f / max) * (W - left - PAD.right - 40);
  return (
    <Svg label="Aperture fill per part" height={height}>
      {rows.map(({ e, fill }, i) => {
        const y = PAD.top + i * row;
        const over = fill > 1;
        return (
          <g key={e.id}>
            <text x={left - 8} y={y + 15} textAnchor="end" fontSize={12} fill={ink}>
              {e.label}
            </text>
            <rect x={left} y={y + 4} width={x(1) - left} height={16} fill={rule} opacity={0.6} rx={2} />
            <rect x={left} y={y + 4} width={Math.max(1, x(fill) - left)} height={16} fill={over ? 'var(--mui-palette-error-main)' : 'var(--mui-palette-primary-main)'} rx={2} />
            <text x={x(Math.max(fill, 1)) + 6} y={y + 16} fontSize={11} fill={over ? 'var(--mui-palette-error-main)' : muted}>
              {`${Math.round(fill * 100)}%`}
            </text>
          </g>
        );
      })}
      <line x1={x(1)} x2={x(1)} y1={PAD.top} y2={height - 18} stroke={ink} strokeDasharray="3 3" />
      <text x={x(1)} y={height - 4} textAnchor="middle" fontSize={10} fill={meta}>
        clear aperture
      </text>
    </Svg>
  );
}

/** What the path passes across the spectrum, with its wavelength marked. */
export function SpectrumPlot({ curve, wavelengthNm }: { curve: { nm: number; t: number }[] | null; wavelengthNm: number | null }) {
  if (!curve) return <Empty>No coatings known on this path.</Empty>;
  const [x0, x1] = [curve[0].nm, curve[curve.length - 1].nm];
  const lo = Math.min(0.8, Math.floor(Math.min(...curve.map((c) => c.t)) * 10) / 10);
  const x = (nm: number) => PAD.left + ((nm - x0) / (x1 - x0)) * (W - PAD.left - PAD.right);
  const y = (t: number) => PAD.top + (1 - (t - lo) / (1 - lo)) * (H - PAD.top - PAD.bottom);
  const bottom = H - PAD.bottom;
  const path = curve.map((c, i) => `${i ? 'L' : 'M'}${x(c.nm).toFixed(1)} ${y(c.t).toFixed(1)}`).join('');
  const at = wavelengthNm && wavelengthNm >= x0 && wavelengthNm <= x1 ? curve.reduce((a, b) => (Math.abs(b.nm - wavelengthNm) < Math.abs(a.nm - wavelengthNm) ? b : a)) : null;
  const visible = [380, 440, 490, 520, 570, 600, 650, 750];
  return (
    <Svg label="Transmission across the spectrum">
      <defs>
        <linearGradient id="sim-visible" x1={x(380)} x2={x(750)} gradientUnits="userSpaceOnUse">
          {visible.map((nm) => (
            <stop key={nm} offset={(nm - 380) / 370} stopColor={nmColor(nm)} />
          ))}
        </linearGradient>
      </defs>
      {[lo, (lo + 1) / 2, 1].map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={rule} />
          <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill={muted}>
            {`${Math.round(t * 100)}%`}
          </text>
        </g>
      ))}
      <rect x={x(380)} width={x(750) - x(380)} y={bottom + 1} height={3} fill="url(#sim-visible)" />
      {[400, 600, 800, 1000].map((nm) => (
        <text key={nm} x={x(nm)} y={H - 6} textAnchor="middle" fontSize={10} fill={muted}>
          {nm}
        </text>
      ))}
      <path d={path} fill="none" stroke="var(--mui-palette-primary-main)" strokeWidth={2} />
      {at && (
        <g>
          <line x1={x(at.nm)} x2={x(at.nm)} y1={PAD.top} y2={bottom} stroke={nmColor(at.nm)} strokeDasharray="3 2" />
          <circle cx={x(at.nm)} cy={y(at.t)} r={4} fill={nmColor(at.nm)} />
          <text x={x(at.nm) + 7} y={y(at.t) < PAD.top + 24 ? y(at.t) + 18 : y(at.t) - 8} fontSize={11} fill={ink}>
            {`${(at.t * 100).toFixed(1)}% at ${wavelengthNm} nm`}
          </text>
        </g>
      )}
    </Svg>
  );
}

const um = (mm: number) => {
  const u = mm * 1000;
  return Math.abs(u) >= 100 ? u.toFixed(0) : Math.abs(u) >= 10 ? u.toFixed(1) : u.toFixed(2);
};

/** The spot at a plane: every ray where it lands, the RMS radius dashed. Square, µm. */
export function SpotDiagram({
  points,
  rmsMm,
  color = 'var(--mui-palette-primary-main)',
  size = 300,
  title,
}: {
  points: { x: number; y: number }[];
  rmsMm: number;
  color?: string;
  size?: number;
  title?: string;
}) {
  const reach = Math.max(rmsMm * 1.6, ...points.map((p) => Math.hypot(p.x, p.y)), 1e-6) * 1.1;
  const half = size / 2;
  const s = (v: number) => (v / reach) * (half - 14);
  return (
    <Box
      component="svg"
      viewBox={`0 0 ${size} ${size + 22}`}
      role="img"
      aria-label={title ?? 'Spot diagram'}
      sx={{ width: '100%', maxWidth: size, display: 'block', mx: 'auto', fontFamily: 'inherit' }}
    >
      <rect x={0.5} y={0.5} width={size - 1} height={size - 1} rx={6} fill="none" stroke={rule} />
      <line x1={half} x2={half} y1={8} y2={size - 8} stroke={rule} />
      <line y1={half} y2={half} x1={8} x2={size - 8} stroke={rule} />
      <circle cx={half} cy={half} r={s(rmsMm)} fill="none" stroke={ink} strokeDasharray="4 3" />
      {points.map((p, i) => (
        <circle key={i} cx={half + s(p.x)} cy={half - s(p.y)} r={1.6} fill={color} />
      ))}
      <text x={size - 8} y={size - 10} textAnchor="end" fontSize={11} fill={muted}>
        {reach >= 1 ? `±${reach.toFixed(1)} mm` : `±${um(reach)} µm`}
      </text>
      {title && (
        <text x={size / 2} y={size + 16} textAnchor="middle" fontSize={12} fill={ink}>
          {title}
        </text>
      )}
    </Box>
  );
}

/** A line plot with its axes: `x` across, `y` up, both labelled at their ends and middle. */
function LinePlot({
  data,
  xLabel,
  yLabel,
  markers = [],
  zeroLine,
  label,
}: {
  data: { x: number; y: number }[];
  xLabel: (v: number) => string;
  yLabel: (v: number) => string;
  markers?: { x: number; text: string; tone?: 'warning' | 'ink' }[];
  zeroLine?: boolean;
  label: string;
}) {
  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  let [y0, y1] = [Math.min(0, ...ys), Math.max(...ys)];
  if (y1 - y0 < 1e-12) [y0, y1] = [y0 - 1, y1 + 1];
  const pad = (y1 - y0) * 0.08;
  [y0, y1] = [y0 - (y0 < 0 ? pad : 0), y1 + pad];
  const x = (v: number) => PAD.left + ((v - x0) / (x1 - x0 || 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - y0) / (y1 - y0)) * (H - PAD.top - PAD.bottom);
  const bottom = H - PAD.bottom;
  return (
    <Svg label={label}>
      {[y0, (y0 + y1) / 2, y1].map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke={rule} />
          <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize={10} fill={muted}>
            {yLabel(v)}
          </text>
        </g>
      ))}
      {zeroLine && y0 < 0 && <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke={ink} strokeWidth={0.75} />}
      <path d={data.map((d, i) => `${i ? 'L' : 'M'}${x(d.x).toFixed(1)} ${y(d.y).toFixed(1)}`).join('')} fill="none" stroke="var(--mui-palette-primary-main)" strokeWidth={2} />
      {markers
        .filter((m) => m.x >= x0 && m.x <= x1)
        .map((m) => (
          <g key={m.text}>
            <line
              x1={x(m.x)}
              x2={x(m.x)}
              y1={PAD.top}
              y2={bottom}
              stroke={m.tone === 'warning' ? 'var(--mui-palette-warning-main)' : ink}
              strokeDasharray={m.tone === 'warning' ? '4 3' : undefined}
              strokeWidth={m.tone === 'warning' ? 1 : 1.5}
            />
            <text x={x(m.x) + 5} y={PAD.top + 12} fontSize={11} fill={m.tone === 'warning' ? 'var(--mui-palette-warning-main)' : ink}>
              {m.text}
            </text>
          </g>
        ))}
      {[x0, (x0 + x1) / 2, x1].map((v) => (
        <text key={v} x={x(v)} y={H - 6} textAnchor={v === x0 ? 'start' : v === x1 ? 'end' : 'middle'} fontSize={10} fill={muted}>
          {xLabel(v)}
        </text>
      ))}
    </Svg>
  );
}

/** The transverse error of each ray at the plane, against its place in the pupil, µm. */
export function RayFan({ fan }: { fan: { rho: number; y: number }[] }) {
  return <LinePlot label="Ray fan" data={fan.map((p) => ({ x: p.rho, y: p.y }))} xLabel={(v) => (v === 0 ? '0' : v.toFixed(1))} yLabel={(v) => um(v)} zeroLine />;
}

/** The RMS spot radius against a shift of the plane, µm; the plane at 0, the best focus marked. */
export function RmsFocusPlot({ samples, bestDz, plane }: { samples: { dz: number; rms: number }[]; bestDz: number; plane: string }) {
  return (
    <LinePlot
      label="RMS spot through focus"
      data={samples.map((s) => ({ x: s.dz, y: s.rms }))}
      xLabel={(v) => `${v > 0 ? '+' : ''}${Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1)} mm`}
      yLabel={(v) => um(v)}
      markers={[{ x: 0, text: plane, tone: 'ink' }, ...(Math.abs(bestDz) > 1e-3 ? [{ x: bestDz, text: 'best', tone: 'warning' as const }] : [])]}
    />
  );
}
