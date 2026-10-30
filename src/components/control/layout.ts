/**
 * Where the wiring canvas draws everything, in px. A card that was moved stays
 * where it was left (`positions`). The others go in four columns, left to right
 * as the tree goes,
 *
 *   computer ──▶ boards ──▶ parts and their devices ──▶ design inputs
 *
 * With no card placed yet, the parts are sorted by the outputs they are on and
 * the inputs by the motors that move them, so that the cables cross as little
 * as they can. Once cards are placed, a new one goes under its column. Pure, so
 * the canvas needs no measuring.
 */
import { inputCard, type Board, type Carrier, type DesignInput, type DeviceState, type Point, type WiringView } from './wiring';

export const BLOCK_W = 256;
export const INPUT_W = 168;
export const GAP_X = 80;
export const HEAD_H = 48;
export const ROW_H = 32;
export const PAD_B = 8;
export const GAP_Y = 24;
export const MARGIN = 32;
/** Cards move and stop on the canvas's dots; the sizes above keep the cards placed for you on them too. */
export const SNAP = 16;

export type { Point };
export interface Rect extends Point {
  w: number;
  h: number;
}

export interface PlacedBoard {
  board: Board;
  rect: Rect;
  /** The port on the right of each row: a board's outputs; the computer's one row has `output: null`. */
  rows: { output: string | null; y: number }[];
}

export interface PlacedCarrier {
  carrier: Carrier;
  rect: Rect;
  rows: { d: DeviceState; y: number }[];
}

export interface PlacedInput {
  input: DesignInput;
  rect: Rect;
}

/** A connection to a board or a device, or a motor on the input it moves. */
export type Cable =
  | { kind: 'connection'; key: string; from: Point; to: Point; part: string; device: string | null; controller: string }
  | { kind: 'input'; key: string; from: Point; to: Point; part: string; device: string; axis: string; input: string };

export interface WiringLayout {
  width: number;
  height: number;
  boards: PlacedBoard[];
  carriers: PlacedCarrier[];
  inputs: PlacedInput[];
  cables: Cable[];
}

export const connectionKey = (part: string, device: string | null) => `c:${part}/${device ?? ''}`;
export const inputKey = (part: string, device: string) => `i:${part}/${device}`;

const blockH = (rows: number) => HEAD_H + rows * ROW_H + PAD_B;
const rowY = (top: number, i: number) => top + HEAD_H + i * ROW_H + ROW_H / 2;

export const snap = (v: number) => Math.max(0, Math.round(v / SNAP) * SNAP);

export function layoutWiring(view: WiringView, positions: Readonly<Record<string, Point>> = {}): WiringLayout {
  const xColumn = [0, 1, 2].map((i) => MARGIN + i * (BLOCK_W + GAP_X));
  const placed = Object.keys(positions).length > 0;

  /** Goes down a column: a card that was left somewhere stays there, the others stack under the last. */
  const column = (x: number, gap = GAP_Y) => {
    let next = MARGIN;
    return (key: string, h: number): Point => {
      const at = positions[key] ?? { x, y: next };
      if (!positions[key] || at.x === x) next = Math.max(next, at.y + h + gap);
      return at;
    };
  };
  // Cards that stay where they are go first, so a new card lands under them.
  const settled = <T,>(items: T[], key: (t: T) => string) => [...items.filter((t) => positions[key(t)]), ...items.filter((t) => !positions[key(t)])];

  const place = column(xColumn[0]);
  const placeBoard = column(xColumn[1]);
  const boards = settled(view.boards, (b) => b.id).map((board): PlacedBoard => {
    const rows = board.isRoot ? 1 : board.outputs.length;
    const at = board.isRoot ? place(board.id, blockH(rows)) : placeBoard(board.id, blockH(rows));
    return {
      board,
      rect: { ...at, w: BLOCK_W, h: blockH(rows) },
      rows: board.isRoot ? [{ output: null, y: rowY(at.y, 0) }] : board.outputs.map((o, i) => ({ output: o.name, y: rowY(at.y, i) })),
    };
  });
  const boardById = new Map(boards.map((b) => [b.board.id, b]));
  const outY = (boardId: string, output: string | null) => boardById.get(boardId)?.rows.find((r) => r.output === output)?.y;

  // With nothing placed yet: as high as the highest output it is on; parts on none last, as they come.
  const rank = (c: Carrier) => Math.min(...c.devices.map((d) => (d.parent ? (outY(d.parent.id, d.output?.name ?? null) ?? Infinity) : Infinity)));
  const inOrder = placed ? view.carriers : view.carriers.map((c, i) => ({ c, i, r: rank(c) })).sort((a, b) => a.r - b.r || a.i - b.i).map((s) => s.c);
  const placeCarrier = column(xColumn[2]);
  const carriers = settled(inOrder, (c) => c.id).map((carrier): PlacedCarrier => {
    const h = blockH(carrier.devices.length);
    const at = placeCarrier(carrier.id, h);
    return { carrier, rect: { ...at, w: BLOCK_W, h }, rows: carrier.devices.map((d, i) => ({ d, y: rowY(at.y, i) })) };
  });

  // Likewise: as high as the highest motor that moves it.
  const moverY = new Map<string, number>();
  for (const pc of carriers) for (const r of pc.rows) if (r.d.input) moverY.set(r.d.input, Math.min(moverY.get(r.d.input) ?? Infinity, r.y));
  const inputOrder = placed ? view.inputs : view.inputs.map((input, i) => ({ input, i, r: moverY.get(input.name) ?? Infinity })).sort((a, b) => a.r - b.r || a.i - b.i).map((s) => s.input);
  const xInputs = xColumn[2] + BLOCK_W + GAP_X;
  const placeInput = column(xInputs, SNAP);
  const inputs = settled(inputOrder, (i) => inputCard(i.name)).map((input): PlacedInput => ({ input, rect: { ...placeInput(inputCard(input.name), HEAD_H), w: INPUT_W, h: HEAD_H } }));
  const inputAt = new Map(inputs.map((p) => [p.input.name, { x: p.rect.x, y: p.rect.y + HEAD_H / 2 }]));

  /** Where a connection leaves its controller: its output's row, or the head's edge for a custom value. */
  const leave = (boardId: string, output: string | null): Point | undefined => {
    const b = boardById.get(boardId);
    return b && { x: b.rect.x + BLOCK_W, y: outY(boardId, output) ?? b.rect.y + HEAD_H / 2 };
  };

  const cables: Cable[] = [
    ...boards.flatMap(({ board, rect }): Cable[] => {
      const from = board.connection && leave(board.connection.controller, null);
      return board.connection && from ? [{ kind: 'connection', key: connectionKey(board.id, null), from, to: { x: rect.x, y: rect.y + HEAD_H / 2 }, part: board.id, device: null, controller: board.connection.controller }] : [];
    }),
    ...carriers.flatMap((pc) =>
      pc.rows.flatMap(({ d, y }): Cable[] => {
        const out: Cable[] = [];
        const from = d.parent && leave(d.parent.id, d.parent.isRoot ? null : (d.output?.name ?? ''));
        if (d.parent && from) out.push({ kind: 'connection', key: connectionKey(pc.carrier.id, d.device.key), from, to: { x: pc.rect.x, y }, part: pc.carrier.id, device: d.device.key, controller: d.parent.id });
        const to = d.input ? inputAt.get(d.input) : undefined;
        if (d.input && d.device.axis && to) out.push({ kind: 'input', key: inputKey(pc.carrier.id, d.device.key), from: { x: pc.rect.x + BLOCK_W, y }, to, part: pc.carrier.id, device: d.device.key, axis: d.device.axis.name, input: d.input });
        return out;
      }),
    ),
  ];

  const rects = [...boards.map((b) => b.rect), ...carriers.map((c) => c.rect), ...inputs.map((i) => i.rect)];
  return {
    width: Math.max(0, ...rects.map((r) => r.x + r.w)) + MARGIN,
    height: Math.max(0, ...rects.map((r) => r.y + r.h)) + MARGIN,
    boards,
    carriers,
    inputs,
    cables,
  };
}

/** Where every card is in a layout, by card key. */
export const positionsOf = (layout: WiringLayout): Record<string, Point> =>
  Object.fromEntries([
    ...layout.boards.map((b) => [b.board.id, { x: b.rect.x, y: b.rect.y }]),
    ...layout.carriers.map((c) => [c.carrier.id, { x: c.rect.x, y: c.rect.y }]),
    ...layout.inputs.map((i) => [inputCard(i.input.name), { x: i.rect.x, y: i.rect.y }]),
  ]);

/** A cable's curve: out of one port level, into the other level; a loop when the second card is to the left of the first. */
export function cablePath({ from, to }: { from: Point; to: Point }) {
  const bend = Math.max(48, Math.abs(to.x - from.x) / 2);
  return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
}
