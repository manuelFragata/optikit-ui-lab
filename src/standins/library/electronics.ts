/**
 * STAND-IN for the library's electronics and for NewSwitch: which devices each
 * module has, the boards and their outputs, the config the design makes, and
 * what the instrument has.
 *
 * The device files are Ethan's (openUC2/optikit `examples/designs`, at
 * `839b79a`), and `newswitchConfig` works as his `tools/examples/newswitch/config.py`:
 * load each file, deep-merge what the design sets over it, merge equal ids.
 * Its output for his `stage-demo` equals his file (wiring.test.ts).
 *
 * In the app the devices come from the library index (optikit-v2 WP-401a), the
 * config from POST /v1/export/newswitch-config (WP-401c) and the inventory from
 * NewSwitch (WP-317). A board's outputs are optikit-v2's `outputs`; the HAT+'s
 * follow the firmware's table (D-N1), since the library has none yet.
 */
import { outputOf, ROOT, wiringView, type BoardOutput, type Connection, type DeviceSpec, type ElectronicsModel } from '../../components/control/wiring';
import type { Schematic } from '../../components/editor/model';
import type { ControlEntry, Electronics, Inventory } from '../../ports/electronics';
import { NO_NETWORK, overNetwork, type Network } from '../network';

type Yaml = Record<string, unknown>;

/** The device files, by name, without their `newswitch_version` (all are v1.0.2). */
export const DEVICE_FILES: Record<string, Yaml> = {
  'root.newswitch-device.yml': { type: 'controller' },
  'mainboard.newswitch-device.yml': { type: 'controller', name: 'UC2-Mainboard-v4', manufacturer: 'openUC2', firmware: { name: 'esp32-uc2-standalone-4', version: 'v2026.0.0-beta.3' } },
  'hat-plus.newswitch-device.yml': { type: 'controller', name: 'HAT+', manufacturer: 'openUC2' },
  'laser.newswitch-device.yml': { type: 'lightsource', name: 'boison-488', manufacturer: 'Boison', wavelength_nm: 488, bandwidth: 2.0, spec_shape: 'gauss', coherence: 'coherent' },
  'led.newswitch-device.yml': { type: 'lightsource', channels: 1 },
  'axis.newswitch-device.yml': { type: 'axis', name: 'linear-100', manufacturer: 'openUC2', steps_per_um: 8.0, homing_required: true, pos: { min: 0.0, max: 100000.0, unit: 'um' }, vel: { value: 5000.0, unit: 'um/s' } },
  'stage.newswitch-device.yml': { type: 'stage', name: 'xyz-linear-100', manufacturer: 'openUC2', homing_order: ['z', 'y', 'x'] },
  'linear-stage.newswitch-device.yml': { type: 'stage', name: 'linear-100', manufacturer: 'openUC2', homing_order: ['x'] },
  'hikcamera.newswitch-device.yml': {
    type: 'detector',
    name: 'MV-CA023-10UM',
    manufacturer: 'HIK ROBOTICS',
    tags: ['monochrome', 'global-shutter', 'gige'],
    pixelcount: [1920, 1200],
    pixelpitch_um: 10.0,
    channels: 1,
    exposure_time_ms: { value: 25.0, min: 0.024, max: 10000.0, inc: 0.001, unit: 'ms' },
    framerate_per_sec: { value: 163.0, min: 0.5, max: 163.0, unit: 'Hz' },
    gain_db: { value: 0.0, min: 0.0, max: 23.98, inc: 0.01, unit: 'dB' },
    binning: 1,
    trigger: { type: 'hardware', edge: 'rising' },
  },
};

/** A motor on one axis: it moves the part's own input along it. */
const motor = (axis: string): DeviceSpec => ({
  key: `${axis}-axis-driver`,
  label: `${axis.toUpperCase()} motor`,
  type: 'axis',
  file: 'axis.newswitch-device.yml',
  axis: { name: axis, input: `position-${axis}`, unit: 'mm' },
});

const laser: DeviceSpec = { key: 'drivers', label: 'Laser', type: 'lightsource', file: 'laser.newswitch-device.yml' };
const xyz = { role: 'devices', devices: [motor('x'), motor('y'), motor('z')], stage: { file: 'stage.newswitch-device.yml' } } as const satisfies ElectronicsModel;

/** The stepper outputs of every board: A, X, Y and Z are 0 to 3 in UC2-REST. */
const steppers: BoardOutput[] = ['A', 'X', 'Y', 'Z'].map((n, id) => ({ name: `motor-${n.toLowerCase()}`, label: `Motor ${n}`, takes: 'axis', id, subid: 0 }));
const lasers = (n: number): BoardOutput[] => Array.from({ length: n }, (_, id) => ({ name: `laser-${id}`, label: `Laser ${id}`, takes: 'lightsource', id, subid: 0 }));

/** Each module's electronics, by module name. Modules not here have none. */
export const ELECTRONICS: Record<string, ElectronicsModel> = {
  'Standalone board v4': { role: 'controller', file: 'mainboard.newswitch-device.yml', protocols: ['uc2-rest-serial'], outputs: [...lasers(1), ...steppers] },
  'HAT+ board': {
    role: 'controller',
    file: 'hat-plus.newswitch-device.yml',
    protocols: ['canopen-canbus', 'uc2-rest-serial'],
    outputs: [...lasers(4), { name: 'led-0', label: 'LED 0', takes: 'lightsource', id: 4, subid: 0 }, ...steppers],
  },
  'Laser 488 module': { role: 'devices', devices: [laser] },
  'Laser cube 520 nm': { role: 'devices', devices: [laser] },
  // The library has no device file for this camera: it stands in with the HIK camera's, as Ethan's examples use.
  'IMX477 camera': { role: 'devices', devices: [{ key: 'drivers', label: 'Camera', type: 'detector', file: 'hikcamera.newswitch-device.yml' }] },
  'xyz-stage': xyz,
  'XYZ stage': xyz,
  'Motorized linear stage': { role: 'devices', devices: [motor('x')], stage: { file: 'linear-stage.newswitch-device.yml' } },
  'LED ring': { role: 'devices', devices: [{ key: 'led', label: 'LED', type: 'lightsource', file: 'led.newswitch-device.yml' }] },
};

/** The parts Control adds: boards, and motion and light with no optic on the grid. */
export const CONTROL_CATALOGUE: ControlEntry[] = [
  { module: 'Standalone board v4', source: 'openUC2 Electronics Box', role: 'controller', detail: 'Over serial · 4 motors, 1 laser' },
  { module: 'HAT+ board', source: 'openUC2 Electronics Box', role: 'controller', detail: 'Over CAN · 4 motors, 4 lasers, 1 LED' },
  { module: 'XYZ stage', source: 'openUC2 FRAME', role: 'devices', detail: 'Moves the sample: 3 motors' },
  { module: 'Motorized linear stage', source: 'openUC2 Core Box', role: 'devices', detail: 'Moves along one axis: 1 motor' },
  { module: 'LED ring', source: 'openUC2 Core Box', role: 'devices', detail: 'Bright-field light: 1 LED' },
];

const isMap = (v: unknown): v is Yaml => typeof v === 'object' && v !== null && !Array.isArray(v);

/** As `deepmerge.always_merger` for what these files hold: maps merge, the rest is replaced. */
function merged(a: Yaml, b: Yaml): Yaml {
  const out: Yaml = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const old = out[k];
    out[k] = isMap(old) && isMap(v) ? merged(old, v) : v;
  }
  return out;
}

/** What each kind of connection writes, as its design in `primitives/connections/` does. */
function connectionConfig(kind: string, s: Readonly<Record<string, string | number>>): Yaml {
  if (kind === 'direct') return { protocol: 'direct', selectors: { id: s.id, subid: s.subid } };
  if (kind === 'uc2-rest-serial') return { protocol: 'uc2-rest', transport: { type: 'serial', selectors: { port_pattern: s['port-pattern'] }, baudrate: s.baudrate } };
  if (kind === 'canopen-canbus') return { protocol: 'canopen', transport: { type: 'can', interface: s.interface, selectors: { channel: s.channel }, bitrate: s.bitrate } };
  return { protocol: 'usb3-vision', selectors: { user_defined_name: s.name } };
}

/** The config as an object, as `config.py` assembles it. Devices no connection reaches are still in it, as in Ethan's. */
export function newswitchConfigObject(design: Schematic, modelOf: (m: string) => ElectronicsModel | undefined): { newswitch_version: string; devices: Record<string, Yaml> } {
  const view = wiringView(design, modelOf);
  const devices: Record<string, Yaml> = {};
  const add = (id: string, file: string, over: Yaml = {}) => {
    devices[id] = merged(devices[id] ?? {}, merged(DEVICE_FILES[file] ?? {}, over));
  };
  /** The controller lists what it reaches: every controller is in `devices` before this runs. */
  const reach = (parentId: string, id: string, connection: Connection) => {
    devices[parentId] = merged(devices[parentId], { connections: { [id]: connectionConfig(connection.kind, connection.settings) } });
  };
  for (const b of view.boards) add(b.deviceId, b.file);
  for (const b of view.boards) if (b.connection) reach(ROOT, b.deviceId, b.connection);
  for (const c of view.carriers) {
    if (c.stage) add(c.stage.deviceId, c.stage.file, { axes: Object.fromEntries(c.devices.flatMap((d) => (d.device.axis ? [[d.device.axis.name, d.deviceId]] : []))) });
    for (const d of c.devices) {
      add(d.deviceId, d.device.file, d.input ? { optikit_dsn_variable: d.input } : {});
      if (d.connection && d.parent) reach(d.parent.deviceId, d.deviceId, d.connection);
    }
  }
  return { newswitch_version: 'v1.0.2', devices };
}

const yamlScalar = (v: unknown): string => {
  if (typeof v === 'string') return /^[A-Za-z0-9._/-]+$/.test(v) && !/^[-.\d]/.test(v) && !/^(yes|no|on|off|true|false|null)$/i.test(v) ? v : `'${v.replace(/'/g, "''")}'`;
  return String(v);
};

/** The object as YAML, keys sorted, as Ethan's `yaml.dump` writes it. */
function yamlOf(v: unknown, indent = ''): string {
  if (isMap(v)) {
    return Object.keys(v)
      .sort()
      .map((k) => {
        const value = v[k];
        const key = `${indent}${yamlScalar(k)}:`;
        if (isMap(value) && Object.keys(value).length) return `${key}\n${yamlOf(value, `${indent}  `)}`;
        if (Array.isArray(value) && value.length) return `${key}\n${value.map((x) => `${indent}- ${yamlScalar(x)}`).join('\n')}`;
        return `${key} ${isMap(value) ? '{}' : Array.isArray(value) ? '[]' : yamlScalar(value)}`;
      })
      .join('\n');
  }
  return `${indent}${yamlScalar(v)}`;
}

export const newswitchConfig = (design: Schematic, modelOf: (m: string) => ElectronicsModel | undefined) => `${yamlOf(newswitchConfigObject(design, modelOf))}\n`;

/**
 * What a bench instrument says after it loaded the config: every device that
 * is reached is ready, but the first driver on Motor Z does not answer; and it
 * has an LED ring the design does not name.
 */
export function benchInventory(design: Schematic, modelOf: (m: string) => ElectronicsModel | undefined): Inventory {
  const view = wiringView(design, modelOf);
  const devices: Inventory['devices'] = Object.fromEntries(view.boards.filter((b) => b.isRoot || b.connection).map((b) => [b.deviceId, { state: 'ready' as const }]));
  let silent = false;
  for (const c of view.carriers)
    for (const d of c.devices) {
      if (!d.connection || !d.parent) continue;
      const output = outputOf(d.parent, d.device.type, d.connection);
      const fails: boolean = !silent && output?.name === 'motor-z';
      silent ||= fails;
      devices[d.deviceId] = fails ? { state: 'error', reason: `The driver on ${output?.label} of ${d.parent.label} does not answer.` } : { state: 'ready' };
    }
  devices['led-ring'] = { state: 'ready' };
  return { instrument: 'frame-bench-02', devices };
}

const modelOf = (module: string) => ELECTRONICS[module];

export const standinElectronics = (net: Network = NO_NETWORK): Electronics => ({
  modelOf,
  catalogue: CONTROL_CATALOGUE,
  config: (design) => overNetwork(net, 'the NewSwitch config', () => newswitchConfig(design, modelOf)),
  inventory: (design) => overNetwork({ ...net, latencyMs: net.latencyMs * 3 }, 'the instrument’s devices', () => benchInventory(design, modelOf)),
});
