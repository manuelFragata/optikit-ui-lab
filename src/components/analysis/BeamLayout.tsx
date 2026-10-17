/**
 * The beam envelope: the path unfolded onto one axis, distance along the
 * beam across and ray height up, on the plot kit's axes. The marginal ray
 * and its envelope in the path's colour, each part at its place drawn to its
 * clear aperture (lenses with their arrowheads, mirrors hatched, the
 * detector as a bar), the foci crossed, and an optimizer's proposal dashed
 * over it. The parts are named above the frame.
 */
import type { Beam, BeamElement } from '../../standins/kernel/simulate/beam';
import type { BeamResult, Trace } from '../../standins/kernel/simulate/paraxial';
import { fonts } from '../../theme/tokens';
import { ACCENT, ALERT, Chart, INK, Legend, MUTED, type Scales } from './plot/Chart';

export interface BeamLayoutProps {
  beam: Beam;
  trace: Trace;
  result: BeamResult;
  /** An optimizer's proposal: the beam with the parts moved, and its trace. */
  proposal?: { beam: Beam; trace: Trace } | null;
  color: string;
  height?: number;
}

/** A part at its place, drawn to its clear aperture `half` (mm) in data units. */
function Part({ e, s, half, clipped, color = INK, dash }: { e: BeamElement; s: Scales; half: number; clipped: boolean; color?: string; dash?: string }) {
  const stroke = clipped ? ALERT : color;
  const x = s.x(e.atMm);
  const top = s.y(half);
  const bottom = s.y(-half);
  const head = (at: number, up: boolean, out: boolean) => {
    const d = (up ? -1 : 1) * (out ? 1 : -1) * 5;
    return <path d={`M${x - 4} ${at + d} L${x} ${at} L${x + 4} ${at + d}`} fill="none" stroke={stroke} strokeWidth={1.25} />;
  };
  switch (e.role) {
    case 'lens':
    case 'objective': {
      const positive = (e.focalMm ?? 1) > 0;
      return (
        <g>
          <line x1={x} x2={x} y1={top} y2={bottom} stroke={stroke} strokeWidth={e.role === 'objective' ? 2.5 : 1.5} strokeDasharray={dash} />
          {head(top, true, positive)}
          {head(bottom, false, positive)}
        </g>
      );
    }
    case 'mirror':
      return (
        <g stroke={stroke}>
          <line x1={x} x2={x} y1={top} y2={bottom} strokeWidth={2} strokeDasharray={dash} />
          {Array.from({ length: 7 }, (_, k) => {
            const yy = top + ((bottom - top) * (k + 0.5)) / 7;
            return <line key={k} x1={x} x2={x + 5} y1={yy} y2={yy - 5} strokeWidth={1} />;
          })}
        </g>
      );
    case 'plate':
      return <rect x={x - 2} y={top} width={4} height={bottom - top} fill="none" stroke={stroke} strokeWidth={1.25} strokeDasharray={dash} />;
    case 'stop':
      return <path d={`M${x} ${s.top} V${top} M${x} ${bottom} V${s.bottom} M${x - 4} ${top} H${x + 4} M${x - 4} ${bottom} H${x + 4}`} fill="none" stroke={stroke} strokeWidth={1.5} />;
    case 'detector':
      return <rect x={x - 1.5} y={top} width={4} height={bottom - top} fill={stroke} />;
    case 'source':
      return <rect x={x - 10} y={s.y(0) - 5} width={10} height={10} fill="none" stroke={stroke} strokeWidth={1.25} />;
    case 'sample':
      return <circle cx={x} cy={s.y(0)} r={3} fill={stroke} />;
    default:
      return <line x1={x} x2={x} y1={top} y2={bottom} stroke={stroke} strokeWidth={1.25} />;
  }
}

export function BeamLayout({ beam, trace, result, proposal, color, height = 260 }: BeamLayoutProps) {
  const zs = [...beam.elements.map((e) => e.atMm), beam.endMm, ...(proposal ? proposal.beam.elements.map((e) => e.atMm) : []), ...result.foci];
  if (result.out.focusMm !== null && result.out.focusMm < beam.endMm + 300) zs.push(result.out.focusMm);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  const halfs = [...beam.elements.map((e) => (e.apertureMm ?? 0) / 2), ...trace.samples.map((t) => Math.abs(t.y)), ...(proposal ? proposal.trace.samples.map((t) => Math.abs(t.y)) : [])];
  const reach = Math.max(2, ...halfs) * 1.1;
  const clipped = new Set(result.elements.filter((r) => r.clipped).map((r) => r.id));
  const halfOf = (e: BeamElement) => (e.apertureMm ? e.apertureMm / 2 : e.role === 'detector' ? Math.min(reach * 0.4, 6) : reach * 0.35);
  const moved = (proposal?.beam.elements ?? []).filter((e) => {
    const was = beam.elements.find((b) => b.id === e.id);
    return was && Math.abs(was.atMm - e.atMm) > 0.05;
  });

  return (
    <Chart
      height={height}
      headroom={26}
      label={`The ${beam.ray.label} beam, unfolded`}
      x={{ domain: [z0, z1 + (z1 - z0) * 0.02], label: 'Axial distance *z*', unit: 'mm', count: 8 }}
      y={{ domain: [-reach, reach], label: 'Ray height *y*', unit: 'mm', count: 4, zero: true }}
      overlay={(s) => (
        <>
          {/* The parts' names, above the frame in two rows so neighbours do not collide. */}
          <g fontFamily={fonts.plot} fontSize={11.5}>
            {beam.elements.map((e, i) => {
              const x = s.x(e.atMm);
              const y = s.top - (i % 2 ? 6 : 19);
              return (
                <g key={e.id}>
                  <line x1={x} x2={x} y1={y + 3} y2={s.top} stroke={MUTED} strokeWidth={0.75} opacity={0.6} />
                  <text x={x} y={y} textAnchor={x < s.left + 30 ? 'start' : x > s.right - 30 ? 'end' : 'middle'} fill={clipped.has(e.id) ? ALERT : MUTED}>
                    {e.label}
                  </text>
                </g>
              );
            })}
          </g>
          <Legend
            s={s}
            items={[
              { label: 'Marginal ray', color },
              ...(proposal ? [{ label: 'Proposed', color: ACCENT, dash: '5 3' }] : []),
            ]}
          />
        </>
      )}
    >
      {(s) => {
        const top = trace.samples.map((t) => `${s.x(t.z).toFixed(1)},${s.y(Math.abs(t.y)).toFixed(1)}`);
        const bottom = [...trace.samples].reverse().map((t) => `${s.x(t.z).toFixed(1)},${s.y(-Math.abs(t.y)).toFixed(1)}`);
        const ray = (t: Trace) => t.samples.map((p) => `${s.x(p.z).toFixed(1)},${s.y(p.y).toFixed(1)}`).join(' ');
        return (
          <>
            <polygon points={[...top, ...bottom].join(' ')} fill={color} fillOpacity={0.12} />
            <polyline points={ray(trace)} fill="none" stroke={color} strokeWidth={1.5} />
            {proposal && <polyline points={ray(proposal.trace)} fill="none" stroke={ACCENT} strokeWidth={1.5} strokeDasharray="5 3" />}
            {result.foci.map((f, i) => (
              <path key={i} d={`M${s.x(f) - 4} ${s.y(0) - 4} L${s.x(f) + 4} ${s.y(0) + 4} M${s.x(f) - 4} ${s.y(0) + 4} L${s.x(f) + 4} ${s.y(0) - 4}`} stroke={color} strokeWidth={1.5} />
            ))}
            {beam.elements.map((e) => (
              <Part key={e.id} e={e} s={s} half={halfOf(e)} clipped={clipped.has(e.id)} />
            ))}
            {moved.map((e) => (
              <Part key={`p${e.id}`} e={e} s={s} half={halfOf(e)} clipped={false} color={ACCENT} dash="4 3" />
            ))}
          </>
        );
      }}
    </Chart>
  );
}
