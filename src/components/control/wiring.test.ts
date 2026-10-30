import { describe, expect, it } from 'vitest';
import { demoSchematic } from '../../demo/editorContent';
import { benchInventory, ELECTRONICS, newswitchConfig, newswitchConfigObject } from '../../standins/library/electronics';
import ethanStageDemo from '../../standins/library/stage-demo.newswitch-config.json';
import { designFileText, readDesignFile } from '../editor/designFile';
import {
  addControlPart,
  addInput,
  connect,
  disconnect,
  KIND_DEFAULTS,
  moveCard,
  removeControlPart,
  removeInput,
  renameInput,
  setDeviceId,
  setInput,
  setKind,
  setSettings,
  tidyCards,
  wiringView,
  type Connection,
} from './wiring';

const modelOf = (m: string) => ELECTRONICS[m];
const view = (d = demoSchematic) => wiringView(d, modelOf);
const device = (d: typeof demoSchematic, part: string, key: string) =>
  view(d)
    .carriers.find((c) => c.id === part)
    ?.devices.find((x) => x.device.key === key);
const X = 'x-axis-driver';
const Z = 'z-axis-driver';
const camera: Connection = { kind: 'usb3-vision', controller: 'root', part: 'S6', device: 'drivers', settings: KIND_DEFAULTS['usb3-vision'] };
/** The demo design with what it lacks: all of Ethan's stage-demo. */
const allWired = setInput(connect(demoSchematic, camera), 'C4', 'z', 'sample-z');

describe('wiringView', () => {
  it('has the computer first, then the boards, and the parts with devices on the grid and off it', () => {
    const v = view();
    expect(v.boards.map((b) => b.deviceId)).toEqual(['root', 'standalone-board-1', 'standalone-board-2']);
    expect(v.carriers.map((c) => [c.id, c.onGrid])).toEqual([
      ['S1', true],
      ['S6', true],
      ['C3', false],
      ['C4', false],
    ]);
  });

  it('says how each device is wired', () => {
    const v = view();
    const status = Object.fromEntries(v.carriers.flatMap((c) => c.devices.map((d) => [d.deviceId, d.status])));
    expect(status).toEqual({
      laser: 'wired',
      camera: 'unwired',
      'optics-stage/x': 'wired',
      'optics-stage/y': 'wired',
      'optics-stage/z': 'wired',
      'sample-stage/x': 'wired',
      'sample-stage/y': 'wired',
      'sample-stage/z': 'no-input',
    });
    expect(v.count).toEqual({ devices: 10, wired: 8 });
  });

  it('knows the output from the id and subid, and takes another value as custom', () => {
    expect(device(demoSchematic, 'C3', X)?.output?.label).toBe('Motor X');
    const d = setSettings(demoSchematic, 'C3', X, { id: 7 });
    expect(device(d, 'C3', X)?.output).toBeUndefined();
    expect(device(d, 'C3', X)?.status).toBe('wired');
  });

  it('a laser and a motor may share an id; two motors may not', () => {
    expect(view().problems.filter((p) => p.level === 'error')).toEqual([]);
    const d = setSettings(demoSchematic, 'C3', X, { id: 2 });
    const [problem] = view(d).problems.filter((p) => p.level === 'error');
    expect(problem.text).toContain('Optics stage · X motor and Optics stage · Y motor have the same place on Standalone board 1');
  });

  it('warns of a board the computer cannot reach, two boards on one port pattern, and an input no motor moves', () => {
    const texts = (d: typeof demoSchematic) => view(d).problems.map((p) => p.text);
    expect(texts(demoSchematic)).toEqual(expect.arrayContaining([expect.stringContaining('same serial port pattern'), 'No motor moves sample-z.']));
    expect(texts(setSettings(demoSchematic, 'C2', null, { 'port-pattern': '/dev/ttyUSB1' }))).not.toEqual(expect.arrayContaining([expect.stringContaining('same serial port pattern')]));
    expect(texts(disconnect(demoSchematic, 'C2', null))).toEqual(expect.arrayContaining([expect.stringContaining('Standalone board 2 has no connection to the computer, so its 3 devices do not work')]));
  });

  it('finds two motors on one input, and two devices with one id', () => {
    let d = addControlPart(demoSchematic, { id: 'C5', label: 'Focus', module: 'Motorized linear stage', source: 'Core Box' });
    d = setDeviceId(d, 'C5', 'optics-stage');
    d = setInput(d, 'C5', 'x', 'optics-x');
    const problems = view(d).problems;
    expect(problems.some((p) => p.text.includes('all move optics-x'))).toBe(true);
    expect(problems.some((p) => p.text.includes('same NewSwitch id, optics-stage/x'))).toBe(true);
  });
});

describe('the edits', () => {
  it('a device has one connection: a new one takes the place of the old', () => {
    const d = connect(demoSchematic, { kind: 'direct', controller: 'C2', part: 'C3', device: X, settings: { id: 0, subid: 0 } });
    expect(device(d, 'C3', X)?.parent?.id).toBe('C2');
    expect(d.wiring?.connections.filter((c) => c.part === 'C3' && c.device === X)).toHaveLength(1);
  });

  it('one part’s devices may be on different controllers; taking one off leaves the others', () => {
    const d = disconnect(demoSchematic, 'C3', X);
    expect(device(d, 'C3', X)?.status).toBe('unwired');
    expect(device(d, 'C3', Z)?.parent?.id).toBe('C1');
    const other = connect(demoSchematic, { kind: 'direct', controller: 'C2', part: 'C3', device: X, settings: { id: 0, subid: 0 } });
    expect(device(other, 'C3', Z)?.parent?.id).toBe('C1');
  });

  it('another kind of connection starts its settings again', () => {
    const d = setKind(demoSchematic, 'C1', null, 'canopen-canbus');
    expect(view(d).boards[1].connection?.settings).toEqual(KIND_DEFAULTS['canopen-canbus']);
  });

  it('an input gets a free name; taking it out leaves its motors moving nothing', () => {
    const { design, name } = addInput(demoSchematic, { name: 'Sample X', unit: 'mm' });
    expect(name).toBe('sample-x-2');
    expect(device(removeInput(design, 'sample-x'), 'C4', X)?.status).toBe('no-input');
  });

  it('a renamed input keeps its motors and its place; a name in use is refused', () => {
    const moved = moveCard(demoSchematic, 'input:sample-x', { x: 32, y: 48 });
    const { design, name } = renameInput(moved, 'sample-x', 'Stage X');
    expect(name).toBe('stage-x');
    expect(device(design, 'C4', X)?.input).toBe('stage-x');
    expect(design.wiring?.positions).toEqual({ 'input:stage-x': { x: 32, y: 48 } });
    expect(renameInput(demoSchematic, 'sample-x', 'optics-x').name).toBe('sample-x');
  });

  it('a removed board takes its connections, in and out, and its place', () => {
    const d = removeControlPart(moveCard(demoSchematic, 'C1', { x: 16, y: 16 }), 'C1');
    expect(view(d).boards.map((b) => b.id)).toEqual(['root', 'C2']);
    expect(device(d, 'C3', X)?.status).toBe('unwired');
    expect(d.wiring?.connections.some((c) => c.part === 'C1' || c.controller === 'C1')).toBe(false);
    expect(d.wiring?.positions).toEqual({});
  });

  it('an empty id is made from the name again', () => {
    const idOf = (d: typeof demoSchematic) => view(d).carriers.find((c) => c.id === 'C3')?.deviceId;
    expect(idOf(setDeviceId(demoSchematic, 'C3', '  '))).toBe('optics-stage');
    expect(idOf(setDeviceId(demoSchematic, 'C3', 'Stage 2'))).toBe('stage-2');
  });

  it('tidy forgets where the cards were left', () => {
    expect(tidyCards(moveCard(demoSchematic, 'C1', { x: 16, y: 16 })).wiring?.positions).toBeUndefined();
  });
});

describe('the stand-in', () => {
  it('makes exactly Ethan’s config for his stage-demo', () => {
    expect(newswitchConfigObject(allWired, modelOf)).toEqual(ethanStageDemo);
  });

  it('keeps a device with no connection in the file, with no controller reaching it', () => {
    const { devices } = newswitchConfigObject(demoSchematic, modelOf);
    expect(devices.camera.type).toBe('detector');
    expect(devices.root.connections).not.toHaveProperty('camera');
  });

  it('writes canopen as Ethan’s FRAME example does', () => {
    const d = setKind(demoSchematic, 'C1', null, 'canopen-canbus');
    expect((newswitchConfigObject(d, modelOf).devices.root.connections as Record<string, unknown>)['standalone-board-1']).toEqual({
      protocol: 'canopen',
      transport: { type: 'can', interface: 'socketcan', selectors: { channel: 'can0' }, bitrate: 500000 },
    });
  });

  it('writes the file as YAML, keys sorted', () => {
    const text = newswitchConfig(allWired, modelOf);
    expect(text).toContain('  optics-stage/x:\n    homing_required: true\n');
    expect(text).toContain("        selectors:\n          user_defined_name: ''\n");
    expect(text).toContain('    homing_order:\n    - z\n    - y\n    - x\n');
    expect(text.endsWith('newswitch_version: v1.0.2\n')).toBe(true);
  });

  it('the bench answers for what it reaches, with one Motor Z driver silent', () => {
    const inv = benchInventory(demoSchematic, modelOf);
    expect(inv.devices['optics-stage/z'].state).toBe('error');
    expect(inv.devices['sample-stage/z'].state).toBe('ready');
    expect(inv.devices.camera).toBeUndefined();
  });
});

it('the design file keeps the wiring, and where the cards are', () => {
  const d = moveCard(demoSchematic, 'C1', { x: 16, y: 16 });
  expect(readDesignFile(designFileText(d))?.wiring).toEqual(d.wiring);
});
