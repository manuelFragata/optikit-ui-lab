/**
 * One surface's reflectance across the spectrum, as a vendor's coating plot:
 * the curve, the band the coating is made for, and the design's wavelengths
 * marked on it with what the surface sends back at each.
 */
import Box from '@mui/material/Box';
import { coating, surfaceReflectance, type SurfaceInfo } from '../../../standins/kernel/coatings';
import { nmColor } from './nmColor';

const W = 300;
const H = 156;
const PAD = { left: 30, right: 8, top: 10, bottom: 30 };

export function CoatingChart({ info, wavelengths }: { info: SurfaceInfo; wavelengths: number[] }) {
  const band = info.coating ? coating(info.coating).band : undefined;
  const xMax = (band?.[1] ?? 0) > 1100 || wavelengths.some((w) => w > 1100) ? 1700 : 1100;
  const xMin = 350;
  const samples = Array.from({ length: 161 }, (_, i) => xMin + ((xMax - xMin) * i) / 160);
  const values = samples.map((nm) => 100 * surfaceReflectance(info, nm));
  const mirror = info.role === 'mirror';
  // A mirror is read near the top (how much comes back), a glass face near the bottom (how much is lost).
  const [y0, y1] = mirror ? [Math.min(80, Math.floor(Math.min(...values) / 10) * 10), 100] : [0, Math.min(12, Math.max(5, Math.ceil(Math.max(...values))))];
  const x = (nm: number) => PAD.left + ((nm - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right);
  const y = (pct: number) => PAD.top + (1 - (Math.min(Math.max(pct, y0), y1) - y0) / (y1 - y0)) * (H - PAD.top - PAD.bottom);
  const path = samples.map((nm, i) => `${i ? 'L' : 'M'}${x(nm).toFixed(1)} ${y(values[i]).toFixed(1)}`).join('');
  const ticksX = xMax > 1100 ? [400, 700, 1000, 1300, 1600] : [400, 500, 600, 700, 800, 900, 1000];
  const ticksY = mirror ? [y0, (y0 + y1) / 2, y1] : [0, Math.round(y1 / 2), y1];
  const bottom = H - PAD.bottom;
  const visible = [380, 440, 490, 520, 570, 600, 650, 750];

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Reflectance of surface ${info.index + 1}`}
      sx={{
        width: '100%',
        display: 'block',
        fontFamily: 'inherit',
        overflow: 'visible',
      }}
    >
      <defs>
        <linearGradient id="visible-strip" x1={x(380)} x2={x(750)} gradientUnits="userSpaceOnUse">
          {visible.map((nm) => (
            <stop key={nm} offset={(nm - 380) / 370} stopColor={nmColor(nm)} />
          ))}
        </linearGradient>
      </defs>
      {band && (
        <rect
          x={x(Math.max(band[0], xMin))}
          width={x(Math.min(band[1], xMax)) - x(Math.max(band[0], xMin))}
          y={PAD.top}
          height={bottom - PAD.top}
          fill="var(--mui-palette-primary-main)"
          opacity={0.07}
        />
      )}
      {ticksY.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--mui-palette-divider)" />
          <text x={PAD.left - 4} y={y(t) + 3} textAnchor="end" fontSize={9} fill="var(--mui-palette-text-secondary)">
            {`${t}%`}
          </text>
        </g>
      ))}
      {/* The visible spectrum, under the axis. */}
      <rect x={x(380)} width={x(750) - x(380)} y={bottom + 1} height={3} fill="url(#visible-strip)" />
      {ticksX.map((t) => (
        <text key={t} x={x(t)} y={bottom + 15} textAnchor="middle" fontSize={9} fill="var(--mui-palette-text-secondary)">
          {t}
        </text>
      ))}
      <text x={W - PAD.right} y={H - 2} textAnchor="end" fontSize={9} fill="var(--mui-palette-text-meta)">
        nm
      </text>
      <path d={path} fill="none" stroke="var(--mui-palette-primary-main)" strokeWidth={1.75} strokeLinejoin="round" />
      {wavelengths
        .filter((nm) => nm >= xMin && nm <= xMax)
        .map((nm) => {
          const r = 100 * surfaceReflectance(info, nm);
          return (
            <g key={nm}>
              <line x1={x(nm)} x2={x(nm)} y1={PAD.top} y2={bottom} stroke={nmColor(nm)} strokeDasharray="3 2" />
              <circle cx={x(nm)} cy={y(r)} r={3} fill={nmColor(nm)} stroke="var(--mui-palette-background-paper)" />
              <text x={x(nm) + 4} y={Math.max(y(r) - 5, PAD.top + 8)} fontSize={9} fill="var(--mui-palette-text-primary)">
                {`${r < 10 ? r.toFixed(1) : r.toFixed(0)}%`}
              </text>
            </g>
          );
        })}
    </Box>
  );
}
