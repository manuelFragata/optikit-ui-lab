/**
 * What the Control tab asks about electronics: which devices a module has
 * (from the library), the parts to add that are electronics or motion only,
 * the NewSwitch config the design makes, and what the running instrument
 * has. The views ask what the app provides (`ElectronicsProvider`). In the
 * lab that is the stand-in (src/standins/library/electronics.ts); in the app
 * it is optikit-core. docs/INTEGRATION.md maps each call to its endpoint.
 *
 * `modelOf` and `catalogue` come with the library index, at once; `config`
 * and `inventory` are requests (./request.ts).
 */
import { createContext, useContext } from 'react';
import type { ElectronicsModel } from '../components/control/wiring';
import type { Schematic } from '../components/editor/model';

/** A part to add in Control: a controller, or a motion part with no optic (the sample stage). */
export interface ControlEntry {
  module: string;
  source: string;
  role: 'controller' | 'devices';
  /** What it is, in a few words. */
  detail: string;
}

/** What NewSwitch says it has, after it loaded the config (optikit-v2 WP-317). */
export interface Inventory {
  /** The instrument that answered. */
  instrument: string;
  /** By NewSwitch device id: ready, or why not. */
  devices: Record<string, { state: 'ready' } | { state: 'error'; reason: string }>;
}

export interface Electronics {
  /** A module's electronics, from the library index; `undefined`: it has none. */
  modelOf: (module: string) => ElectronicsModel | undefined;
  catalogue: ControlEntry[];
  /** The NewSwitch config the design makes, as text (GET /v1/export/newswitch-config). */
  config: (design: Schematic) => Promise<string>;
  /** What the instrument has now (NewSwitch's inventory, WP-317). */
  inventory: (design: Schematic) => Promise<Inventory>;
}

/** No electronics: no module has devices, there is nothing to export or to ask. */
export const NO_ELECTRONICS: Electronics = {
  modelOf: () => undefined,
  catalogue: [],
  config: async () => '',
  inventory: async () => ({ instrument: '', devices: {} }),
};

const Context = createContext<Electronics>(NO_ELECTRONICS);

/** Gives every view below it the app's electronics. */
export const ElectronicsProvider = Context.Provider;

export const useElectronics = () => useContext(Context);
