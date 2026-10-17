/**
 * The beam envelope: the path unfolded onto one axis, distance along the
 * beam across and ray height up, on the plot kit's axes. The marginal ray
 * and its envelope in the path's colour, each part at its place drawn to its
 * clear aperture (lenses with their arrowheads, mirrors hatched, the
 * detector as a bar), the foci crossed, and an optimizer's proposal dashed
 * over it. The parts are named above the frame.
 */
import type { Envelope } from '../../ports/analysis';
import { fonts } from '../../theme/tokens';
import { ACCENT, ALERT, Chart, INK, Legend, MUTED, type Scales } from './plot/Chart';

type PathPart = Envelope['parts'][number];

export interface BeamLayoutProps {
  /** The path, as the analysis unfolds it. */
  envelope: Envelope;
  /** The path's name, for the plot's label. */
  name: string;
  /** An optimizer's proposal: the same path with the parts moved. */
  proposal?: Envelope | null;
  color: string;
  height?: number;
}

/** A part at its place, drawn to its clear aperture `half` (mm) in data units. */
function Part({ e, s, half, clipped, color = INK, dash }: { e: PathPart; s: Scales; half: number; clipped: boolean; color?: string; dash?: string }) {
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

export function BeamLayout({ envelope, name, proposal, color, height = 260 }: BeamLayoutProps) {
  const parts = envelope.parts;
  const zs = [...parts.map((e) => e.atMm), envelope.endMm, ...(proposal ? proposal.parts.map((e) => e.atMm) : []), ...envelope.foci];
  if (envelope.focusMm !== null && envelope.focusMm < envelope.endMm + 300) zs.push(envelope.focusMm);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  const halfs = [...parts.map((e) => (e.apertureMm ?? 0) / 2), ...envelope.marginal.map((t) => Math.abs(t.y)), ...(proposal ? proposal.marginal.map((t) => Math.abs(t.y)) : [])];
  const reach = Math.max(2, ...halfs) * 1.1;
  const clipped = new Set(parts.filter((e) => e.clipped).map((e) => e.id));
  const halfOf = (e: PathPart) => (e.apertureMm ? e.apertureMm / 2 : e.role === 'detector' ? Math.min(reach * 0.4, 6) : reach * 0.35);
  const moved = (proposal?.parts ?? []).filter((e) => {
    const was = parts.find((b) => b.id === e.id);
    return was && Math.abs(was.atMm - e.atMm) > 0.05;
  });

  return (
    <Chart
      height={height}
      headroom={26}
      label={`The ${name} beam, unfolded`}
      x={{ domain: [z0, z1 + (z1 - z0) * 0.02], label: 'Axial distance *z*', unit: 'mm', count: 8 }}
      y={{ domain: [-reach, reach], label: 'Ray height *y*', unit: 'mm', count: 4, zero: true }}
      overlay={(s) => (
        <>
          {/* The parts' names, above the frame in two rows so neighbours do not collide. */}
          <g fontFamily={fonts.plot} fontSize={11.5}>
            {parts.map((e, i) => {
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
        const top = envelope.marginal.map((t) => `${s.x(t.z).toFixed(1)},${s.y(Math.abs(t.y)).toFixed(1)}`);
        const bottom = [...envelope.marginal].reverse().map((t) => `${s.x(t.z).toFixed(1)},${s.y(-Math.abs(t.y)).toFixed(1)}`);
        const ray = (e: Envelope) => e.marginal.map((p) => `${s.x(p.z).toFixed(1)},${s.y(p.y).toFixed(1)}`).join(' ');
        return (
          <>
            <polygon points={[...top, ...bottom].join(' ')} fill={color} fillOpacity={0.12} />
            <polyline points={ray(envelope)} fill="none" stroke={color} strokeWidth={1.5} />
            {proposal && <polyline points={ray(proposal)} fill="none" stroke={ACCENT} strokeWidth={1.5} strokeDasharray="5 3" />}
            {envelope.foci.map((f, i) => (
              <path key={i} d={`M${s.x(f) - 4} ${s.y(0) - 4} L${s.x(f) + 4} ${s.y(0) + 4} M${s.x(f) - 4} ${s.y(0) + 4} L${s.x(f) + 4} ${s.y(0) - 4}`} stroke={color} strokeWidth={1.5} />
            ))}
            {parts.map((e) => (
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
