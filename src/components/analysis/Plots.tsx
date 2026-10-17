/**
 * The analyses' plots, each an engineering plot on the kit (./plot): the
 * spot at a plane, the ray fan, the RMS spot through focus, how full each
 * part's aperture is, and what the path passes across the spectrum. Axes
 * with units, a grid on round ticks, ink for data and dashed rules for
 * references.
 */
import Typography from '@mui/material/Typography';
import { nmColor } from '../editor/optics/nmColor';
import type { Detail } from '../../ports/analysis';
import { ACCENT, ALERT, Chart, Dots, INK, Legend, Line, Rule, WARN } from './plot/Chart';
import { lengthUnit, spotReach } from './plot/scale';
import { fonts } from '../../theme/tokens';

export function Empty({ children }: { children: string }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
      {children}
    </Typography>
  );
}

const circle = (radius: number): [number, number][] => Array.from({ length: 97 }, (_, k) => [radius * Math.cos((k / 96) * 2 * Math.PI), radius * Math.sin((k / 96) * 2 * Math.PI)]);

/**
 * The spot at a plane: every ray where it lands, the RMS radius dashed, and
 * the Airy radius (`airyMm`) as a solid circle: rays inside it land in one
 * diffraction spot. Square, equal scales; `reachMm` to share a scale with another.
 */
export function SpotDiagram({
  points,
  rmsMm,
  airyMm = null,
  reachMm,
  color = ACCENT,
  height = 300,
  legend = true,
}: {
  points: { x: number; y: number }[];
  rmsMm: number;
  airyMm?: number | null;
  reachMm?: number;
  color?: string;
  height?: number;
  legend?: boolean;
}) {
  const reach = reachMm ?? spotReach(points, Math.max(rmsMm, airyMm ?? 0));
  const { unit, perMm } = lengthUnit(reach);
  const r = reach * perMm;
  const at = points.map((p) => ({ x: p.x * perMm, y: p.y * perMm }));
  const ring = circle(rmsMm * perMm);
  return (
    <Chart
      square
      height={height}
      label="Spot diagram"
      x={{ domain: [-r, r], label: '*x*', unit, count: 4, zero: true }}
      y={{ domain: [-r, r], label: '*y*', unit, count: 4, zero: true }}
      overlay={(s) =>
        legend && (
          <Legend
            s={s}
            items={[
              { label: 'Rays', color, dot: true },
              { label: 'RMS radius', color: INK, dash: '4 3' },
              ...(airyMm ? [{ label: 'Airy radius', color: INK }] : []),
            ]}
          />
        )
      }
    >
      {(s) => (
        <>
          <Dots s={s} points={at} color={color} r={1.5} />
          <Line s={s} points={ring} color={INK} width={1} dash="4 3" />
          {airyMm && <Line s={s} points={circle(airyMm * perMm)} color={INK} width={1} />}
        </>
      )}
    </Chart>
  );
}

/** The transverse error of each ray at the plane, against its place in the pupil. */
export function RayFan({ fan, height = 240 }: { fan: { rho: number; y: number }[]; height?: number }) {
  const max = Math.max(1e-6, ...fan.map((p) => Math.abs(p.y)));
  const { unit, perMm } = lengthUnit(max);
  const m = max * perMm;
  return (
    <Chart
      height={height}
      label="Ray fan"
      x={{ domain: [-1, 1], label: 'Normalized pupil coordinate *P*_{*y*}', values: [-1, -0.5, 0, 0.5, 1], zero: true }}
      y={{ domain: [-m * 1.1, m * 1.1], label: 'Transverse aberration *ε*_{*y*}', unit, zero: true }}
    >
      {(s) => <Line s={s} points={fan.map((p) => [p.rho, p.y * perMm])} color={ACCENT} />}
    </Chart>
  );
}

/** The RMS spot radius against a shift of the plane; the plane at 0, the best focus marked, and the diffraction limit (`airyMm`) below which a smaller spot is not seen. */
export function RmsFocusPlot({ samples, bestDz, plane, airyMm = null, height = 240 }: { samples: { dz: number; rms: number }[]; bestDz: number; plane: string; airyMm?: number | null; height?: number }) {
  const max = Math.max(1e-6, ...samples.map((p) => p.rms), (airyMm ?? 0) * 1.2);
  const { unit, perMm } = lengthUnit(max);
  const dz = samples.map((p) => p.dz);
  // The limit drawn only where it can be seen above the axis.
  const limit = airyMm && airyMm * perMm > max * perMm * 0.02 ? airyMm * perMm : null;
  return (
    <Chart
      height={height}
      label="RMS spot radius through focus"
      x={{ domain: [Math.min(...dz), Math.max(...dz)], label: 'Defocus Δ*z*', unit: 'mm', nice: false, count: 6 }}
      y={{ domain: [0, max * perMm * 1.05], label: 'RMS spot radius *r*_{RMS}', unit }}
      overlay={(s) => (
        <>
          <Rule s={s} at={0} label={plane} color={INK} dash="none" side="left" />
          {Math.abs(bestDz) > 1e-3 && <Rule s={s} at={bestDz} label="Best focus" color={WARN} />}
          {limit && <Legend s={s} items={[{ label: 'RMS radius', color: ACCENT }, { label: 'Diffraction limit (Airy)', color: INK, dash: '2 2' }]} />}
        </>
      )}
    >
      {(s) => (
        <>
          {limit && <Line s={s} points={[[Math.min(...dz), limit], [Math.max(...dz), limit]]} color={INK} width={1} dash="2 2" />}
          <Line s={s} points={samples.map((p) => [p.dz, p.rms * perMm])} color={ACCENT} />
        </>
      )}
    </Chart>
  );
}

/** Each part's clear aperture, and how much of it the beam fills: past 100 % it clips. A row clicked selects its part. */
export function ApertureFill({ rows, selectedId, onSelect }: { rows: Extract<Detail, { of: 'fill' }>['rows']; selectedId?: string | null; onSelect?: (id: string) => void }) {
  if (!rows.length) return <Empty>No part states an aperture.</Empty>;
  const max = Math.max(120, ...rows.map((r) => r.fill * 110));
  const at = (i: number) => rows.length - i - 0.5;
  return (
    <Chart
      height={Math.max(150, 56 + rows.length * 30)}
      label="Aperture fill per part"
      x={{ domain: [0, max], label: 'Fill of the clear aperture', unit: '%', count: 6 }}
      y={{ domain: [0, rows.length], label: '', values: rows.map((_, i) => at(i)), format: (v) => rows[Math.round(rows.length - v - 0.5)]?.label ?? '', names: true }}
      overlay={(s) => <Rule s={s} at={100} label="Clear aperture" color={ALERT} foot />}
    >
      {(s) =>
        rows.map((e, i) => {
          const y = s.y(at(i));
          const fill = e.fill;
          const pick = onSelect && e.selectable ? () => onSelect(e.id) : undefined;
          return (
            <g key={e.id} onClick={pick} style={{ cursor: pick ? 'pointer' : undefined }} role={pick ? 'button' : undefined} aria-label={pick ? `Select ${e.label}` : undefined}>
              <rect x={s.left} y={y - 13} width={s.right - s.left} height={26} fill={e.id === selectedId ? 'var(--mui-palette-primary-soft)' : 'transparent'} />
              <rect x={s.x(0)} y={y - 6} width={Math.max(1, s.x(fill * 100) - s.x(0))} height={12} fill={fill > 1 ? ALERT : ACCENT} />
              <text x={s.x(fill * 100) + 5} y={y + 4} fontFamily={fonts.plot} fontSize={11.5} fill={fill > 1 ? ALERT : INK} style={{ fontVariantNumeric: 'lining-nums tabular-nums' }}>
                {`${Math.round(fill * 100)}%`}
              </text>
            </g>
          );
        })
      }
    </Chart>
  );
}

/** What the path passes across the spectrum, with its wavelength marked; the visible band along the foot. */
export function SpectrumPlot({ curve, wavelengthNm, height = 240 }: { curve: { nm: number; t: number }[] | null; wavelengthNm: number | null; height?: number }) {
  if (!curve) return <Empty>No coatings known on this path.</Empty>;
  const [x0, x1] = [curve[0].nm, curve[curve.length - 1].nm];
  const at = wavelengthNm && wavelengthNm >= x0 && wavelengthNm <= x1 ? curve.reduce((a, b) => (Math.abs(b.nm - wavelengthNm) < Math.abs(a.nm - wavelengthNm) ? b : a)) : null;
  const visible = [380, 440, 490, 520, 570, 600, 650, 750];
  return (
    <Chart
      height={height}
      label="Transmission across the spectrum"
      x={{ domain: [x0, x1], label: 'Wavelength *λ*', unit: 'nm', nice: false, count: 8 }}
      y={{ domain: [0, 100], label: 'Transmittance *T*', unit: '%', values: [0, 20, 40, 60, 80, 100] }}
      overlay={(s) =>
        at && (
          <>
            <Rule s={s} at={at.nm} label={`${(at.t * 100).toFixed(1)} % at ${wavelengthNm} nm`} color={INK} />
            <circle cx={s.x(at.nm)} cy={s.y(at.t * 100)} r={3} fill={nmColor(at.nm)} stroke={INK} strokeWidth={1} />
          </>
        )
      }
    >
      {(s) => (
        <>
          <defs>
            <linearGradient id="spectrum-visible" x1={s.x(380)} x2={s.x(750)} gradientUnits="userSpaceOnUse">
              {visible.map((nm) => (
                <stop key={nm} offset={(nm - 380) / 370} stopColor={nmColor(nm)} />
              ))}
            </linearGradient>
          </defs>
          <rect x={s.x(380)} width={s.x(750) - s.x(380)} y={s.bottom - 4} height={4} fill="url(#spectrum-visible)" />
          <Line s={s} points={curve.map((c) => [c.nm, c.t * 100])} color={ACCENT} />
        </>
      )}
    </Chart>
  );
}
