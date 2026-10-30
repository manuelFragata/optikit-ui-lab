import { describe, expect, it } from 'vitest';
import { demoSchematic } from '../../demo/editorContent';
import { ELECTRONICS } from '../../standins/library/electronics';
import { canJoin, join, nearestFit, portPoints, pullEnds, type Port } from './connections';
import { cablePath, layoutWiring, positionsOf, snap } from './layout';
import { addControlPart, wiringView } from './wiring';

const modelOf = (m: string) => ELECTRONICS[m];
const view = wiringView(demoSchematic, modelOf);

const computer: Port = { kind: 'out', board: 'root', output: null };
const camera: Port = { kind: 'in', part: 'S6', device: 'drivers' };
const board1: Port = { kind: 'in', part: 'C1', device: null };
const laser: Port = { kind: 'in', part: 'S1', device: 'drivers' };
const laser0: Port = { kind: 'out', board: 'C1', output: 'laser-0' };
const motorA: Port = { kind: 'out', board: 'C1', output: 'motor-a' };
const motorX: Port = { kind: 'out', board: 'C1', output: 'motor-x' };
const stageZ: Port = { kind: 'in', part: 'C4', device: 'z-axis-driver' };
const zAxis: Port = { kind: 'axis', part: 'C4', device: 'z-axis-driver', axis: 'z' };
const sampleZ: Port = { kind: 'input', name: 'sample-z' };

describe('canJoin', () => {
  it('the computer reaches boards and cameras, not lasers or motors', () => {
    expect(canJoin(view, computer, board1)).toBe(true);
    expect(canJoin(view, camera, computer)).toBe(true);
    expect(canJoin(view, computer, laser)).toBe(false);
    expect(canJoin(view, computer, stageZ)).toBe(false);
  });

  it('a board’s output takes a device of its type, either way round', () => {
    expect(canJoin(view, motorA, stageZ)).toBe(true);
    expect(canJoin(view, stageZ, motorA)).toBe(true);
    expect(canJoin(view, laser0, stageZ)).toBe(false);
    expect(canJoin(view, motorA, camera)).toBe(false);
    expect(canJoin(view, motorA, board1)).toBe(false);
  });

  it('an output in use takes only the device already on it', () => {
    expect(canJoin(view, motorX, stageZ)).toBe(false);
    expect(canJoin(view, laser0, laser)).toBe(true);
  });

  it('joins an axis to an input, and nothing else to either', () => {
    expect(canJoin(view, zAxis, sampleZ)).toBe(true);
    expect(canJoin(view, zAxis, computer)).toBe(false);
    expect(canJoin(view, camera, sampleZ)).toBe(false);
  });
});

describe('join', () => {
  it('wires the camera over USB3 Vision and gives the z motor its input', () => {
    const d = join(join(demoSchematic, view, camera, computer), view, sampleZ, zAxis);
    expect(wiringView(d, modelOf).count).toEqual({ devices: 10, wired: 10 });
    expect(d.wiring?.connections.at(-1)).toEqual({ kind: 'usb3-vision', controller: 'root', part: 'S6', device: 'drivers', settings: { name: '' } });
  });

  it('fills a direct connection from the output', () => {
    const d = join(demoSchematic, view, motorA, stageZ);
    expect(d.wiring?.connections.at(-1)).toMatchObject({ kind: 'direct', controller: 'C1', device: 'z-axis-driver', settings: { id: 0, subid: 0 } });
  });

  it('a HAT+ starts over CAN', () => {
    const d = addControlPart(demoSchematic, { id: 'C5', label: 'HAT+', module: 'HAT+ board', source: 'Box' });
    const v = wiringView(d, modelOf);
    expect(join(d, v, computer, { kind: 'in', part: 'C5', device: null }).wiring?.connections.at(-1)).toMatchObject({ kind: 'canopen-canbus', settings: { channel: 'can0' } });
  });
});

describe('layoutWiring', () => {
  const layout = layoutWiring(view);

  it('draws one cable per connection and one per motor on an input', () => {
    expect(layout.cables.filter((c) => c.kind === 'connection')).toHaveLength(9);
    expect(layout.cables.filter((c) => c.kind === 'input')).toHaveLength(5);
  });

  it('goes in columns: computer, boards, parts, inputs; parts by their outputs, those with none last', () => {
    const xs = [layout.boards[0].rect.x, layout.boards[1].rect.x, layout.carriers[0].rect.x, layout.inputs[0].rect.x];
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    expect(layout.carriers.map((c) => c.carrier.id)).toEqual(['S1', 'C3', 'C4', 'S6']);
    expect(layout.inputs.at(-1)?.input.name).toBe('sample-z');
  });

  it('starts each cable on a card’s right edge', () => {
    const edges = [...layout.boards.map((b) => b.rect.x + b.rect.w), ...layout.carriers.map((p) => p.rect.x + p.rect.w)];
    for (const c of layout.cables) expect(edges).toContain(c.from.x);
  });

  it('a card left somewhere stays there, its cables go with it, and the others stay', () => {
    const after = layoutWiring(view, { ...positionsOf(layout), C3: { x: 800, y: 640 } });
    const stage = after.carriers.find((c) => c.carrier.id === 'C3');
    expect(stage?.rect).toMatchObject({ x: 800, y: 640 });
    expect(after.cables.find((c) => c.key === 'c:C3/x-axis-driver')?.to).toEqual({ x: 800, y: stage?.rows[0].y });
    expect(after.height).toBeGreaterThan(layout.height);
    expect(after.boards[1].rect).toEqual(layout.boards[1].rect);
    expect(after.carriers.find((c) => c.carrier.id === 'S1')?.rect).toEqual(layout.carriers.find((c) => c.carrier.id === 'S1')?.rect);
  });

  it('with cards placed, a new one goes under its column', () => {
    const d = addControlPart(demoSchematic, { id: 'C5', label: 'LED', module: 'LED ring', source: 'Box' });
    const after = layoutWiring(wiringView(d, modelOf), positionsOf(layout));
    const lowest = Math.max(...layout.carriers.map((c) => c.rect.y + c.rect.h));
    expect(after.carriers.find((c) => c.carrier.id === 'C5')?.rect.y).toBeGreaterThan(lowest);
  });

  it('snaps to the canvas’s dots, and never off its edge', () => {
    expect(snap(25)).toBe(32);
    expect(snap(-40)).toBe(0);
  });

  it('draws a loop when the second card is to the left of the first', () => {
    expect(cablePath({ from: { x: 500, y: 10 }, to: { x: 100, y: 10 } })).toBe('M 500 10 C 700 10, -100 10, 100 10');
  });
});

describe('a cable on its way', () => {
  const layout = layoutWiring(view);
  const point = (p: Port) => portPoints(layout).find((x) => JSON.stringify(x.port) === JSON.stringify(p))?.at ?? { x: 0, y: 0 };

  it('finds every port where the canvas draws it', () => {
    const stage = layout.carriers.find((c) => c.carrier.id === 'C4');
    expect(point(stageZ)).toEqual({ x: stage?.rect.x, y: stage?.rows[2].y });
    expect(point(computer).x).toBe(layout.boards[0].rect.x + layout.boards[0].rect.w);
  });

  it('snaps onto a port that fits, near the pointer', () => {
    const at = point(computer);
    expect(nearestFit(view, layout, camera, { x: at.x + 10, y: at.y - 10 })?.port).toEqual(computer);
  });

  it('does not snap from far away, or onto a port that does not fit', () => {
    const at = point(computer);
    expect(nearestFit(view, layout, camera, { x: at.x + 200, y: at.y })).toBeNull();
    expect(nearestFit(view, layout, stageZ, at)).toBeNull();
  });

  it('takes the nearest of two that fit', () => {
    const at = point(motorA);
    expect(nearestFit(view, layout, stageZ, { x: at.x, y: at.y + 2 })?.port).toEqual(motorA);
  });

  it('leaves a right-edge port to the right, and comes to a left-edge port from the left', () => {
    const a = { x: 10, y: 10 };
    const b = { x: 50, y: 50 };
    expect(pullEnds(computer, a, b)).toEqual({ from: a, to: b });
    expect(pullEnds(zAxis, a, b)).toEqual({ from: a, to: b });
    expect(pullEnds(camera, a, b)).toEqual({ from: b, to: a });
    expect(pullEnds(sampleZ, a, b)).toEqual({ from: b, to: a });
  });
});
