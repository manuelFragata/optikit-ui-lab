/**
 * The beam, unfolded onto one line: distance along the light across, height
 * from the axis up (stretched, so a 2 mm beam reads beside a 25 mm lens).
 * The marginal ray's envelope in the path's colour, each part at its place
 * with its clear aperture, the foci, and an optimizer's proposal dashed over
 * it. A part can be hovered and picked, as in the beam table.
 */
import Box from '@mui/material/Box';
import type { Beam, BeamElement } from '../../standins/kernel/simulate/beam';
import type { BeamResult, Trace } from '../../standins/kernel/simulate/paraxial';

const W = 1000;
const H = 250;
const PAD = { left: 24, right: 24, top: 26, bottom: 46 };

export interface BeamLayoutProps {
  beam: Beam;
  trace: Trace;
  result: BeamResult;
  /** An optimizer's proposal: the beam with the parts moved, and its trace. */
  proposal?: { beam: Beam; trace: Trace } | null;
  color: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
}

/** A round step for the distance scale: 1, 2 or 5 × a power of ten, about `n` steps across. */
function niceStep(span: number, n = 8) {
  const raw = span / n;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((k) => k * p).find((s) => s >= raw)!;
}

const envelope = (t: Trace, x: (z: number) => number, y: (v: number) => number) => {
  const top = t.samples.map((s) => `${x(s.z).toFixed(1)},${y(Math.abs(s.y)).toFixed(1)}`);
  const bottom = [...t.samples].reverse().map((s) => `${x(s.z).toFixed(1)},${y(-Math.abs(s.y)).toFixed(1)}`);
  return [...top, ...bottom].join(' ');
};

/** The marginal ray itself (signed), for the dashed proposal and the ray line. */
const rayLine = (t: Trace, x: (z: number) => number, y: (v: number) => number) => t.samples.map((s) => `${x(s.z).toFixed(1)},${y(s.y).toFixed(1)}`).join(' ');

function Part({ e, x, y, half, clipped, picked, onSelect }: { e: BeamElement; x: number; y: (v: number) => number; half: number; clipped: boolean; picked: boolean; onSelect: (id: string) => void }) {
  const stroke = clipped ? 'var(--mui-palette-error-main)' : picked ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-text-primary)';
  const top = y(half);
  const bottom = y(-half);
  const w = picked ? 2.5 : 1.5;
  const arrow = (at: number, up: boolean, out: boolean) => {
    const d = (up ? -1 : 1) * (out ? 1 : -1) * 7;
    return <path d={`M${x - 5} ${at + d} L${x} ${at} L${x + 5} ${at + d}`} fill="none" stroke={stroke} strokeWidth={w} />;
  };
  let mark;
  switch (e.role) {
    case 'lens':
    case 'objective': {
      const positive = (e.focalMm ?? 1) > 0;
      mark = (
        <>
          <line x1={x} x2={x} y1={top} y2={bottom} stroke={stroke} strokeWidth={e.role === 'objective' ? w + 1.5 : w} />
          {arrow(top, true, positive)}
          {arrow(bottom, false, positive)}
        </>
      );
      break;
    }
    case 'mirror':
      mark = (
        <>
          <line x1={x} x2={x} y1={top} y2={bottom} stroke={stroke} strokeWidth={w + 1} />
          {Array.from({ length: 6 }, (_, k) => {
            const yy = top + ((bottom - top) * (k + 0.5)) / 6;
            return <line key={k} x1={x} x2={x + 6} y1={yy} y2={yy - 6} stroke={stroke} strokeWidth={1} />;
          })}
        </>
      );
      break;
    case 'plate':
      mark = <rect x={x - 2} y={top} width={4} height={bottom - top} fill="none" stroke={stroke} strokeWidth={w} />;
      break;
    case 'stop':
      // The blades, from the opening outwards.
      mark = <path d={`M${x} ${top - 14} V${top} M${x} ${bottom} V${bottom + 14} M${x - 5} ${top} H${x + 5} M${x - 5} ${bottom} H${x + 5}`} fill="none" stroke={stroke} strokeWidth={w} />;
      break;
    case 'detector':
      mark = <rect x={x} y={y(6)} width={6} height={y(-6) - y(6)} fill={stroke} />;
      break;
    case 'source':
      mark = <rect x={x - 16} y={y(0) - 7} width={16} height={14} rx={2} fill="none" stroke={stroke} strokeWidth={w} />;
      break;
    case 'sample':
      mark = <circle cx={x} cy={y(0)} r={4} fill={stroke} />;
      break;
    default:
      mark = <line x1={x} x2={x} y1={y(4)} y2={y(-4)} stroke={stroke} strokeWidth={w} />;
  }
  return (
    <g style={{ cursor: 'pointer' }} onMouseEnter={() => onSelect(e.id)}>
      {/* A wide invisible target, so a thin part is easy to point at. */}
      <rect x={x - 10} y={PAD.top} width={20} height={H - PAD.top - PAD.bottom} fill="transparent" />
      {mark}
    </g>
  );
}

export function BeamLayout({ beam, trace, result, proposal, color, selected, onSelect }: BeamLayoutProps) {
  const zs = [...beam.elements.map((e) => e.atMm), beam.endMm, ...(proposal ? proposal.beam.elements.map((e) => e.atMm) : []), ...result.foci];
  if (result.out.focusMm !== null && result.out.focusMm < beam.endMm + 300) zs.push(result.out.focusMm);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  const span = Math.max(z1 - z0, 1);
  const halfs = [...beam.elements.map((e) => (e.apertureMm ?? 0) / 2), ...trace.samples.map((s) => Math.abs(s.y)), ...(proposal ? proposal.trace.samples.map((s) => Math.abs(s.y)) : [])];
  const reach = Math.max(4, ...halfs) * 1.12;
  const x = (z: number) => PAD.left + ((z - z0) / span) * (W - PAD.left - PAD.right);
  const mid = PAD.top + (H - PAD.top - PAD.bottom) / 2;
  const y = (v: number) => mid - (v / reach) * ((H - PAD.top - PAD.bottom) / 2);
  const step = niceStep(span);
  const ticks = Array.from({ length: Math.floor(span / step) + 1 }, (_, k) => Math.ceil(z0 / step) * step + k * step).filter((t) => t <= z1);
  const clipped = new Set(result.elements.filter((r) => r.clipped).map((r) => r.id));
  const bottom = H - PAD.bottom;
  // How much more a millimetre counts across than along.
  const stretch = (H - PAD.top - PAD.bottom) / 2 / reach / ((W - PAD.left - PAD.right) / span);

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`The ${beam.ray.label} beam, unfolded`}
      onMouseLeave={() => onSelect(null)}
      sx={{ width: '100%', display: 'block', fontFamily: 'inherit', userSelect: 'none' }}
    >
      <line x1={PAD.left} x2={W - PAD.right} y1={mid} y2={mid} stroke="var(--mui-palette-text-meta)" strokeDasharray="6 4" />
      <polygon points={envelope(trace, x, y)} fill={color} fillOpacity={0.16} stroke="none" />
      <polyline points={rayLine(trace, x, y)} fill="none" stroke={color} strokeWidth={1.75} />
      {proposal && <polyline points={rayLine(proposal.trace, x, y)} fill="none" stroke="var(--mui-palette-primary-main)" strokeWidth={1.75} strokeDasharray="6 4" />}

      {result.foci.map((f, i) => (
        <g key={i}>
          <path d={`M${x(f) - 5} ${mid - 5} L${x(f) + 5} ${mid + 5} M${x(f) - 5} ${mid + 5} L${x(f) + 5} ${mid - 5}`} stroke={color} strokeWidth={2} />
          <text x={x(f)} y={mid - 10} textAnchor={x(f) > W - 60 ? 'end' : 'middle'} fontSize={11} fill={color}>
            focus
          </text>
        </g>
      ))}

      {beam.elements.map((e, i) => {
        const half = e.apertureMm ? e.apertureMm / 2 : Math.min(reach * 0.5, 8);
        const label = (
          <text
            x={x(e.atMm)}
            y={i % 2 ? bottom + 30 : bottom + 15}
            textAnchor={i === 0 ? 'start' : i === beam.elements.length - 1 ? 'end' : 'middle'}
            fontSize={11}
            fontWeight={selected === e.id ? 600 : 400}
            fill={clipped.has(e.id) ? 'var(--mui-palette-error-main)' : 'var(--mui-palette-text-primary)'}
          >
            {e.label}
          </text>
        );
        return (
          <g key={e.id}>
            <Part e={e} x={x(e.atMm)} y={y} half={half} clipped={clipped.has(e.id)} picked={selected === e.id} onSelect={onSelect} />
            {label}
          </g>
        );
      })}

      {/* Where the optimizer would put the parts it moves. */}
      {proposal?.beam.elements
        .filter((e) => {
          const was = beam.elements.find((b) => b.id === e.id);
          return was && Math.abs(was.atMm - e.atMm) > 0.05;
        })
        .map((e) => (
          <g key={`p${e.id}`}>
            <line x1={x(e.atMm)} x2={x(e.atMm)} y1={y((e.apertureMm ?? 10) / 2)} y2={y(-(e.apertureMm ?? 10) / 2)} stroke="var(--mui-palette-primary-main)" strokeWidth={2} strokeDasharray="4 3" />
            <text x={x(e.atMm)} y={PAD.top - 8} textAnchor="middle" fontSize={11} fill="var(--mui-palette-primary-main)">
              {`${e.label} →`}
            </text>
          </g>
        ))}

      {/* The distance scale. */}
      <line x1={PAD.left} x2={W - PAD.right} y1={bottom} y2={bottom} stroke="var(--mui-palette-divider)" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={bottom} y2={bottom + 4} stroke="var(--mui-palette-text-meta)" />
          <text x={x(t)} y={H - 2} textAnchor="middle" fontSize={10} fill="var(--mui-palette-text-meta)">
            {`${Math.round(t)}`}
          </text>
        </g>
      ))}
      <text x={W - PAD.right} y={PAD.top - 8} textAnchor="end" fontSize={10} fill="var(--mui-palette-text-meta)">
        {stretch > 1.5 ? `mm along the beam · heights ×${stretch.toFixed(0)}` : 'mm along the beam'}
      </text>
    </Box>
  );
}
