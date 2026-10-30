/**
 * The ports of the wiring canvas, and which two may be joined:
 *
 * - the computer's port and a board's or a camera's own port;
 * - a board's output and a device's port of the type it takes, when the
 *   output is free or already that device's;
 * - a motor's axis and a design input.
 *
 * A cable starts at one port and follows the pointer until it ends on the other,
 * in either order. Near a port that fits, it snaps on. Tested in connections.test.ts.
 */
import type { Schematic } from '../editor/model';
import { HEAD_H, type Point, type WiringLayout } from './layout';
import { connect, KIND_DEFAULTS, setInput, type Connection, type WiringView } from './wiring';

export type Port =
  /** A controller's side. `output`: a board's output by name; `null`: the computer's one port. */
  | { kind: 'out'; board: string; output: string | null }
  /** A board's or a device's own port. `device`: `null` for a board. */
  | { kind: 'in'; part: string; device: string | null }
  | { kind: 'axis'; part: string; device: string; axis: string }
  | { kind: 'input'; name: string };

export const portKey = (p: Port) =>
  p.kind === 'out' ? `out:${p.board}/${p.output ?? ''}` : p.kind === 'input' ? `input:${p.name}` : p.kind === 'in' ? `in:${p.part}/${p.device ?? ''}` : `axis:${p.part}/${p.device}`;

type Pair =
  | { kind: 'connection'; out: Extract<Port, { kind: 'out' }>; into: Extract<Port, { kind: 'in' }> }
  | { kind: 'input'; axis: Extract<Port, { kind: 'axis' }>; input: Extract<Port, { kind: 'input' }> };

function pair(a: Port, b: Port): Pair | null {
  if (a.kind === 'out' && b.kind === 'in') return { kind: 'connection', out: a, into: b };
  if (b.kind === 'out' && a.kind === 'in') return { kind: 'connection', out: b, into: a };
  if (a.kind === 'axis' && b.kind === 'input') return { kind: 'input', axis: a, input: b };
  if (b.kind === 'axis' && a.kind === 'input') return { kind: 'input', axis: b, input: a };
  return null;
}

/** The connection these two ports would make; `null` when they do not go together. */
function connectionFor(view: WiringView, { out, into }: Extract<Pair, { kind: 'connection' }>): Connection | null {
  const board = view.boards.find((b) => b.id === out.board);
  if (!board) return null;
  const target = view.boards.find((b) => b.id === into.part && into.device === null);
  if (board.isRoot) {
    // The computer reaches boards and cameras.
    if (target) return { kind: target.protocols[0], controller: board.id, part: target.id, device: null, settings: target.defaults ?? KIND_DEFAULTS[target.protocols[0]] };
    const camera = view.carriers.find((c) => c.id === into.part)?.devices.find((d) => d.device.key === into.device && d.device.type === 'detector');
    return camera ? { kind: 'usb3-vision', controller: board.id, part: into.part, device: into.device, settings: KIND_DEFAULTS['usb3-vision'] } : null;
  }
  // A board's output reaches a device of the type it takes, and has room for one.
  const d = view.carriers.find((c) => c.id === into.part)?.devices.find((x) => x.device.key === into.device);
  const output = board.outputs.find((o) => o.name === out.output);
  if (!d || !output || output.takes !== d.device.type) return null;
  const taken = view.carriers.some((c) => c.devices.some((x) => x.parent?.id === board.id && x.output === output && !(c.id === into.part && x.device.key === into.device)));
  return taken ? null : { kind: 'direct', controller: board.id, part: into.part, device: into.device, settings: { id: output.id, subid: output.subid } };
}

/** May these two be joined? */
export function canJoin(view: WiringView, a: Port, b: Port): boolean {
  const p = pair(a, b);
  return !!p && (p.kind === 'input' || connectionFor(view, p) !== null);
}

/** The design with the two joined; as it was when they do not fit. */
export function join(design: Schematic, view: WiringView, a: Port, b: Port): Schematic {
  const p = pair(a, b);
  if (!p) return design;
  if (p.kind === 'input') return setInput(design, p.axis.part, p.axis.axis, p.input.name);
  const connection = connectionFor(view, p);
  return connection ? connect(design, connection) : design;
}

/** Every port on the canvas, and where it is. */
export function portPoints(layout: WiringLayout): { port: Port; at: Point }[] {
  return [
    ...layout.boards.flatMap(({ board, rect, rows }) => [
      ...rows.map((r) => ({ port: { kind: 'out', board: board.id, output: r.output } as Port, at: { x: rect.x + rect.w, y: r.y } })),
      ...(board.isRoot ? [] : [{ port: { kind: 'in', part: board.id, device: null } as Port, at: { x: rect.x, y: rect.y + HEAD_H / 2 } }]),
    ]),
    ...layout.carriers.flatMap(({ carrier, rect, rows }) =>
      rows.flatMap(({ d, y }) => [
        { port: { kind: 'in', part: carrier.id, device: d.device.key } as Port, at: { x: rect.x, y } },
        ...(d.device.axis ? [{ port: { kind: 'axis', part: carrier.id, device: d.device.key, axis: d.device.axis.name } as Port, at: { x: rect.x + rect.w, y } }] : []),
      ]),
    ),
    ...layout.inputs.map(({ input, rect }) => ({ port: { kind: 'input', name: input.name } as Port, at: { x: rect.x, y: rect.y + rect.h / 2 } })),
  ];
}

/** How near a port that fits, px, the cable snaps onto it. */
export const SNAP_REACH = 28;

/** The nearest port within reach of the pointer that fits this one. */
export function nearestFit(view: WiringView, layout: WiringLayout, from: Port, at: Point, reach = SNAP_REACH): { port: Port; at: Point } | null {
  let best: { port: Port; at: Point } | null = null;
  let bestDistance = reach;
  for (const p of portPoints(layout)) {
    const distance = Math.hypot(p.at.x - at.x, p.at.y - at.y);
    if (distance <= bestDistance && canJoin(view, from, p.port)) {
      best = p;
      bestDistance = distance;
    }
  }
  return best;
}

/** A cable on its way: it leaves a port on a card's right edge to the right, and comes to one on a left edge from the left. */
export const pullEnds = (port: Port, anchor: Point, end: Point) => (port.kind === 'out' || port.kind === 'axis' ? { from: anchor, to: end } : { from: end, to: anchor });
