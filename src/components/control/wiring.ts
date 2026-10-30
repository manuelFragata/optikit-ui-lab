/**
 * Wiring (optikit-v2 WP-378): the instrument's electronics as a device tree,
 * the lab's model of Ethan's connections (openUC2/optikit #37):
 *
 *   root ──connection──▶ board ──connection──▶ device ──axis──▶ design input
 *
 * - **root** is the computer that runs NewSwitch. Every design has it.
 * - A **board** is a controller. Root reaches it over serial or CAN.
 * - A **device** belongs to a part: a light source, a camera, a stage's axis.
 *   The library says which devices a module has (`ElectronicsModel`).
 * - A **connection** joins one controller to one device, and each kind has its
 *   own settings. `direct` has the firmware's `id` and `subid`.
 * - A motor's axis moves a design input, and the poses that read it follow.
 *
 * The app writes each of these to the design file (docs/INTEGRATION.md,
 * "Electronics"). Pure functions, tested in wiring.test.ts.
 */
import type { Schematic } from '../editor/model';

/** The four connection designs of `primitives/connections/`, by name. */
export type ConnectionKind = 'direct' | 'uc2-rest-serial' | 'canopen-canbus' | 'usb3-vision';

export const KIND_LABELS: Record<ConnectionKind, string> = {
  direct: 'Direct',
  'uc2-rest-serial': 'UC2-REST over serial',
  'canopen-canbus': 'CANopen over CAN bus',
  'usb3-vision': 'USB3 Vision',
};

/** A connection's settings, named as the inputs of its design. */
export type ConnectionSettings = Readonly<Record<string, string | number>>;

/** The settings a new connection of each kind starts with, as the examples set them. */
export const KIND_DEFAULTS: Record<ConnectionKind, ConnectionSettings> = {
  direct: { id: 0, subid: 0 },
  'uc2-rest-serial': { 'port-pattern': '/dev/ttyUSB*', baudrate: 115200 },
  'canopen-canbus': { interface: 'socketcan', channel: 'can0', bitrate: 500000 },
  'usb3-vision': { name: '' },
};

export const BAUD_RATES = [1200, 1800, 2400, 4800, 9600, 19200, 28800, 38400, 57600, 76800, 115200, 230400, 460800, 576000, 921600];
export const CAN_INTERFACES = ['socketcan', 'pcan', 'kvaser', 'slcan', 'gs_usb', 'virtual'];

/** The device types a connection can reach, as NewSwitch's device files name them. A stage is reached through its axes. */
export type DeviceType = 'lightsource' | 'axis' | 'detector';

/** One device of a part: a primitive child of its design with a NewSwitch device file. */
export interface DeviceSpec {
  /** The child's name in the part's design: `x-axis-driver`, `laser`. */
  key: string;
  label: string;
  type: DeviceType;
  /** The NewSwitch device file beside the design. */
  file: string;
  /** A motor: the axis it drives (`x`), and the part's own input its pose reads (`position-x`). */
  axis?: { name: string; input: string; unit: string };
}

/** A named place on a board, which fills a direct connection's `id` and `subid` (optikit-v2: a board's `outputs`). */
export interface BoardOutput {
  name: string;
  label: string;
  takes: DeviceType;
  id: number;
  subid: number;
}

/** What the library says about a module's electronics. */
export type ElectronicsModel =
  | { role: 'controller'; file: string; protocols: ConnectionKind[]; outputs: BoardOutput[]; defaults?: ConnectionSettings }
  /** `stage`: the device file of the stage that groups these axes. */
  | { role: 'devices'; devices: DeviceSpec[]; stage?: { file: string } };

/** A part that is electronics or motion only, with no place on the optical grid: a board, the sample stage. */
export interface ControlPart {
  id: string;
  label: string;
  module: string;
  source: string;
}

/** A top-level input of the design: a motor moves it, and the poses that read it follow. */
export interface DesignInput {
  name: string;
  unit: string;
}

/** What the top-level design sets for one part. */
export interface PartBinding {
  /** `newswitch-device-id`; without it, made from the part's name. */
  deviceId?: string;
  /** `newswitch-input-variable-<axis>`: the design input each axis moves, by axis name. */
  inputs?: Record<string, string>;
}

/** One connection: a controller to the device it reaches. A device has one at most. */
export interface Connection {
  kind: ConnectionKind;
  /** The controller's part id; `root` is the computer. */
  controller: string;
  /** The part at the other end. */
  part: string;
  /** Which of its devices; `null`: the part itself is a board. */
  device: string | null;
  settings: ConnectionSettings;
}

export interface Point {
  x: number;
  y: number;
}

export interface Wiring {
  parts: ControlPart[];
  inputs: DesignInput[];
  /** By part id: a part on the grid (S1) or a control part. */
  bindings: Record<string, PartBinding>;
  connections: Connection[];
  /** Where each card was left, px, by card key. A card with none is placed for it. */
  positions?: Record<string, Point>;
}

export const NO_WIRING: Wiring = { parts: [], inputs: [], bindings: {}, connections: [] };

export const wiringOf = (design: Schematic): Wiring => design.wiring ?? NO_WIRING;

/** The computer's part id, and its device id. */
export const ROOT = 'root';

/** A design input's card key; a part's card key is its id. */
export const inputCard = (name: string) => `input:${name}`;

/* ------------------------------------------------------------------ */
/* What the design's wiring is, worked out                             */
/* ------------------------------------------------------------------ */

/** A controller in the design: the computer, or a board. */
export interface Board {
  id: string;
  label: string;
  module: string;
  deviceId: string;
  file: string;
  isRoot: boolean;
  protocols: ConnectionKind[];
  outputs: BoardOutput[];
  defaults?: ConnectionSettings;
  /** How root reaches a board. */
  connection?: Connection;
}

export type DeviceStatus = 'wired' | 'unwired' | 'no-input';

/** One device of a part, and how it is wired. */
export interface DeviceState {
  device: DeviceSpec;
  deviceId: string;
  connection?: Connection;
  /** The controller that reaches it. */
  parent?: Board;
  /** The board output its `id` and `subid` are; none on a custom value. */
  output?: BoardOutput;
  /** A motor: the design input it moves. */
  input?: string;
  status: DeviceStatus;
}

/** A part with devices. */
export interface Carrier {
  id: string;
  label: string;
  module: string;
  /** On the optical grid (a schematic part), or a control part. */
  onGrid: boolean;
  deviceId: string;
  /** The stage device that groups the axes. */
  stage?: { deviceId: string; file: string };
  devices: DeviceState[];
}

export interface Problem {
  level: 'error' | 'warning';
  text: string;
  /** The parts it is about, to select them. */
  ids: string[];
}

export interface WiringView {
  /** The computer first, then the boards. */
  boards: Board[];
  carriers: Carrier[];
  inputs: DesignInput[];
  connections: Connection[];
  problems: Problem[];
  /** Boards and devices in all, and how many are wired. */
  count: { devices: number; wired: number };
}

export type ModelOf = (module: string) => ElectronicsModel | undefined;

/** `Laser 488` → `laser-488`. */
export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'part';

/** A device by name: the part's alone when it is the part's only one (`Camera`), else both (`Sample stage · Z motor`). */
export const deviceName = (carrier: { label: string; devices: unknown[] }, d: DeviceState) => (carrier.devices.length > 1 ? `${carrier.label} · ${d.device.label}` : carrier.label);

/** A device's NewSwitch id: the part's, then `/x` for a part with a stage or more than one device. */
const deviceIdOf = (partId: string, device: DeviceSpec, grouped: boolean) => (grouped ? `${partId}/${device.axis?.name ?? device.key}` : partId);

/** The output a direct connection's values are. */
export const outputOf = (board: Board, type: DeviceType, connection?: Connection) =>
  connection?.kind === 'direct' ? board.outputs.find((o) => o.takes === type && o.id === connection.settings.id && o.subid === connection.settings.subid) : undefined;

/** What `Number(...)` of a setting says, for comparing them. */
const valueKey = (settings: ConnectionSettings) => `${settings.id}/${settings.subid}`;

/** Every part that may have electronics, on the grid first. */
function electronicParts(design: Schematic, wiring: Wiring) {
  const onGrid = design.symbols.flatMap((s) => (s.placement.state === 'in-cube' ? [{ id: s.id, label: s.label, module: s.placement.module, onGrid: true }] : []));
  return [...onGrid, ...wiring.parts.map((p) => ({ id: p.id, label: p.label, module: p.module, onGrid: false }))];
}

/** The design's controllers, parts with devices, inputs and problems, as the Control tab shows them. */
export function wiringView(design: Schematic, modelOf: ModelOf): WiringView {
  const wiring = wiringOf(design);
  const parts = electronicParts(design, wiring);
  const idOf = (p: { id: string; label: string }) => wiring.bindings[p.id]?.deviceId || slug(p.label);
  const connectionOf = (part: string, device: string | null) => wiring.connections.find((c) => c.part === part && c.device === device);

  const root: Board = { id: ROOT, label: 'Computer', module: 'Runs NewSwitch', deviceId: ROOT, file: 'root.newswitch-device.yml', isRoot: true, protocols: [], outputs: [] };
  const boards: Board[] = [
    root,
    ...parts.flatMap((p) => {
      const m = modelOf(p.module);
      if (m?.role !== 'controller') return [];
      const connection = connectionOf(p.id, null);
      return [{ id: p.id, label: p.label, module: p.module, deviceId: idOf(p), file: m.file, isRoot: false, protocols: m.protocols, outputs: m.outputs, defaults: m.defaults, connection: connection?.controller === ROOT ? connection : undefined }];
    }),
  ];
  const boardById = new Map(boards.map((b) => [b.id, b]));
  const inputNames = new Set(wiring.inputs.map((i) => i.name));

  const carriers: Carrier[] = parts.flatMap((p) => {
    const m = modelOf(p.module);
    if (m?.role !== 'devices' || !m.devices.length) return [];
    const b = wiring.bindings[p.id] ?? {};
    const deviceId = idOf(p);
    const grouped = Boolean(m.stage) || m.devices.length > 1;
    const devices = m.devices.map((device): DeviceState => {
      const found = connectionOf(p.id, device.key);
      const parent = found && boardById.get(found.controller);
      const connection = parent ? found : undefined;
      const named = device.axis ? b.inputs?.[device.axis.name] : undefined;
      const input = named && inputNames.has(named) ? named : undefined;
      return {
        device,
        deviceId: deviceIdOf(deviceId, device, grouped),
        connection,
        parent,
        output: parent && outputOf(parent, device.type, connection),
        input,
        status: !connection ? 'unwired' : device.axis && !input ? 'no-input' : 'wired',
      };
    });
    return [{ id: p.id, label: p.label, module: p.module, onGrid: p.onGrid, deviceId, stage: m.stage && { deviceId, file: m.stage.file }, devices }];
  });

  const all = carriers.flatMap((c) => c.devices);
  const plainBoards = boards.filter((b) => !b.isRoot);
  const known = new Set([ROOT, ...parts.map((p) => p.id)]);
  return {
    boards,
    carriers,
    inputs: wiring.inputs,
    connections: wiring.connections.filter((c) => known.has(c.controller) && known.has(c.part)),
    problems: problemsOf(wiring.inputs, boards, carriers),
    count: {
      devices: all.length + plainBoards.length,
      wired: all.filter((d) => d.status === 'wired').length + plainBoards.filter((b) => b.connection).length,
    },
  };
}

/** What would go wrong on the instrument (optikit-v2 WP-401d). */
function problemsOf(inputs: DesignInput[], boards: Board[], carriers: Carrier[]): Problem[] {
  const problems: Problem[] = [];
  // One id and subid on one controller, for each type of device: a laser 0 and a motor 0 are different in the firmware.
  const places = new Map<string, { carrier: Carrier; d: DeviceState }[]>();
  for (const carrier of carriers)
    for (const d of carrier.devices)
      if (d.parent && d.connection?.kind === 'direct') {
        const key = `${d.parent.id}/${d.device.type}/${valueKey(d.connection.settings)}`;
        places.set(key, [...(places.get(key) ?? []), { carrier, d }]);
      }
  for (const users of places.values()) {
    if (users.length < 2) continue;
    const { d } = users[0];
    problems.push({
      level: 'error',
      text: `${users.map((u) => deviceName(u.carrier, u.d)).join(' and ')} have the same place on ${d.parent?.label}: id ${d.connection?.settings.id}, sub-id ${d.connection?.settings.subid}.`,
      ids: users.map((u) => u.carrier.id),
    });
  }
  // One NewSwitch id, one device.
  const byId = new Map<string, { label: string; id: string }[]>();
  for (const thing of [...boards.map((b) => ({ deviceId: b.deviceId, label: b.label, id: b.id })), ...carriers.flatMap((c) => c.devices.map((d) => ({ deviceId: d.deviceId, label: deviceName(c, d), id: c.id })))])
    byId.set(thing.deviceId, [...(byId.get(thing.deviceId) ?? []), thing]);
  for (const [deviceId, users] of byId)
    if (users.length > 1) problems.push({ level: 'error', text: `${users.map((u) => u.label).join(' and ')} have the same NewSwitch id, ${deviceId}.`, ids: [...new Set(users.map((u) => u.id))] });
  // A board the computer cannot reach: nothing on it can work.
  for (const b of boards) {
    if (b.isRoot || b.connection) continue;
    const onIt = carriers.flatMap((c) => c.devices).filter((d) => d.parent?.id === b.id).length;
    if (onIt) problems.push({ level: 'warning', text: `${b.label} has no connection to the computer, so its ${onIt === 1 ? 'device does' : `${onIt} devices do`} not work.`, ids: [b.id] });
  }
  // Two boards with one port selector: NewSwitch cannot tell them apart.
  const serial = new Map<string, Board[]>();
  for (const b of boards)
    if (b.connection?.kind === 'uc2-rest-serial') {
      const port = String(b.connection.settings['port-pattern']);
      serial.set(port, [...(serial.get(port) ?? []), b]);
    }
  for (const [port, users] of serial)
    if (users.length > 1) problems.push({ level: 'warning', text: `${users.map((u) => u.label).join(' and ')} have the same serial port pattern, ${port}. NewSwitch cannot tell them apart.`, ids: users.map((u) => u.id) });
  // One input, one motor: two motors on one input fight.
  const movers = new Map<string, { carrier: Carrier; d: DeviceState }[]>();
  for (const carrier of carriers) for (const d of carrier.devices) if (d.input) movers.set(d.input, [...(movers.get(d.input) ?? []), { carrier, d }]);
  for (const [input, users] of movers)
    if (users.length > 1) problems.push({ level: 'warning', text: `${users.map((u) => deviceName(u.carrier, u.d)).join(' and ')} all move ${input}.`, ids: [...new Set(users.map((u) => u.carrier.id))] });
  // An input no motor moves.
  for (const i of inputs) if (!movers.has(i.name)) problems.push({ level: 'warning', text: `No motor moves ${i.name}.`, ids: [inputCard(i.name)] });
  return problems;
}

/** What each output of a board has on it. */
export const boardOutputs = (view: WiringView, board: Board) =>
  board.outputs.map((output) => ({
    output,
    users: view.carriers.flatMap((carrier) => carrier.devices.filter((d) => d.parent?.id === board.id && d.output === output).map((d) => ({ carrier, d }))),
  }));

/** What a controller reaches directly, whatever the output: boards and devices, by name. */
export function reachedBy(view: WiringView, board: Board): { id: string; name: string; connection: Connection }[] {
  const boards = view.boards.flatMap((b) => (b.connection?.controller === board.id ? [{ id: b.id, name: b.label, connection: b.connection }] : []));
  const devices = view.carriers.flatMap((c) => c.devices.flatMap((d) => (d.connection && d.parent?.id === board.id ? [{ id: c.id, name: deviceName(c, d), connection: d.connection }] : [])));
  return [...boards, ...devices];
}

/** The motors that move an input. */
export const moversOf = (view: WiringView, input: string) => view.carriers.flatMap((carrier) => carrier.devices.filter((d) => d.input === input).map((d) => ({ carrier, d })));

/* ------------------------------------------------------------------ */
/* Edits: a design in, the changed design out                          */
/* ------------------------------------------------------------------ */

const withWiring = (design: Schematic, change: (w: Wiring) => Wiring): Schematic => ({ ...design, wiring: change(wiringOf(design)) });

const withBinding = (design: Schematic, partId: string, change: (b: PartBinding) => PartBinding) =>
  withWiring(design, (w) => ({ ...w, bindings: { ...w.bindings, [partId]: change(w.bindings[partId] ?? {}) } }));

const sameEnd = (c: Connection, part: string, device: string | null) => c.part === part && c.device === device;

/** Join a controller to a device. A device has one connection: a new one takes the place of the old. */
export const connect = (design: Schematic, connection: Connection) =>
  withWiring(design, (w) => ({ ...w, connections: [...w.connections.filter((c) => !sameEnd(c, connection.part, connection.device)), connection] }));

export const disconnect = (design: Schematic, part: string, device: string | null) => withWiring(design, (w) => ({ ...w, connections: w.connections.filter((c) => !sameEnd(c, part, device)) }));

/** Change some settings of a connection. */
export const setSettings = (design: Schematic, part: string, device: string | null, settings: ConnectionSettings) =>
  withWiring(design, (w) => ({ ...w, connections: w.connections.map((c) => (sameEnd(c, part, device) ? { ...c, settings: { ...c.settings, ...settings } } : c)) }));

/** Change how a connection goes; its settings start again. */
export const setKind = (design: Schematic, part: string, device: string | null, kind: ConnectionKind) =>
  withWiring(design, (w) => ({ ...w, connections: w.connections.map((c) => (sameEnd(c, part, device) ? { ...c, kind, settings: KIND_DEFAULTS[kind] } : c)) }));

/** The design input an axis moves, or none. */
export const setInput = (design: Schematic, partId: string, axis: string, input: string | undefined) =>
  withBinding(design, partId, (b) => {
    const inputs = { ...b.inputs };
    if (input) inputs[axis] = input;
    else delete inputs[axis];
    return { ...b, inputs };
  });

/** The part's NewSwitch id; empty: made from its name again. */
export const setDeviceId = (design: Schematic, partId: string, deviceId: string) => withBinding(design, partId, (b) => ({ ...b, deviceId: deviceId.trim() ? slug(deviceId) : undefined }));

/** A new id for a control part: `C1`, `C2`, … */
export const nextControlId = (design: Schematic) => `C${1 + Math.max(0, ...wiringOf(design).parts.map((p) => Number(p.id.replace(/\D/g, '')) || 0))}`;

export const addControlPart = (design: Schematic, part: ControlPart) => withWiring(design, (w) => ({ ...w, parts: [...w.parts, part] }));

const withoutKey = <T,>(map: Record<string, T> | undefined, key: string) => (map ? Object.fromEntries(Object.entries(map).filter(([k]) => k !== key)) : undefined);

/** Take a control part out, with its bindings, its card's place and every connection to or from it. */
export const removeControlPart = (design: Schematic, id: string) =>
  withWiring(design, (w) => ({
    ...w,
    parts: w.parts.filter((p) => p.id !== id),
    bindings: withoutKey(w.bindings, id) ?? {},
    connections: w.connections.filter((c) => c.part !== id && c.controller !== id),
    positions: withoutKey(w.positions, id),
  }));

/** A design input with a free name like `name` (`focus`, `focus-2`, …). Returns its name too. */
export function addInput(design: Schematic, input: DesignInput): { design: Schematic; name: string } {
  const taken = new Set(wiringOf(design).inputs.map((i) => i.name));
  const base = slug(input.name);
  let name = base;
  for (let n = 2; taken.has(name); n++) name = `${base}-${n}`;
  return { design: withWiring(design, (w) => ({ ...w, inputs: [...w.inputs, { ...input, name }] })), name };
}

/** Rename an input, and the motors that move it with it; its card stays where it is. A name in use, or empty, changes nothing. Returns the name it has. */
export function renameInput(design: Schematic, from: string, to: string): { design: Schematic; name: string } {
  const name = to.trim() ? slug(to) : '';
  const w = wiringOf(design);
  if (!name || name === from || w.inputs.some((i) => i.name === name)) return { design, name: from };
  const place = w.positions?.[inputCard(from)];
  return {
    design: withWiring(design, () => ({
      ...w,
      inputs: w.inputs.map((i) => (i.name === from ? { ...i, name } : i)),
      bindings: Object.fromEntries(Object.entries(w.bindings).map(([id, b]) => [id, { ...b, inputs: Object.fromEntries(Object.entries(b.inputs ?? {}).map(([axis, v]) => [axis, v === from ? name : v])) }])),
      positions: place ? { ...withoutKey(w.positions, inputCard(from)), [inputCard(name)]: place } : w.positions,
    })),
    name,
  };
}

/** Take an input out; the motors that moved it move nothing. */
export const removeInput = (design: Schematic, name: string) =>
  withWiring(design, (w) => ({
    ...w,
    inputs: w.inputs.filter((i) => i.name !== name),
    bindings: Object.fromEntries(Object.entries(w.bindings).map(([id, b]) => [id, { ...b, inputs: Object.fromEntries(Object.entries(b.inputs ?? {}).filter(([, v]) => v !== name)) }])),
    positions: withoutKey(w.positions, inputCard(name)),
  }));

/** Leave a card here. */
export const moveCard = (design: Schematic, key: string, at: Point) => withWiring(design, (w) => ({ ...w, positions: { ...w.positions, [key]: at } }));

/** Every card where it is now, so that later edits do not move the others. */
export const pinCards = (design: Schematic, positions: Record<string, Point>) => withWiring(design, (w) => ({ ...w, positions: { ...positions, ...w.positions } }));

/** Forget where the cards were left: they are placed in tree order again. */
export const tidyCards = (design: Schematic) => withWiring(design, (w) => ({ ...w, positions: undefined }));
