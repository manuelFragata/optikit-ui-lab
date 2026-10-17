/**
 * What the views ask the service: which real parts could be a sketched one,
 * and what the design costs to build. The views ask what the app provides
 * (`ServiceProvider`). In the lab that is the stand-in (src/standins/service);
 * in the app it is optikit-core's endpoints. docs/INTEGRATION.md maps each
 * call to its endpoint.
 *
 * Every call is a request: it takes time and can fail. Views ask through
 * `useRequest` (./request.ts), which gives them the waiting and the failing
 * to draw.
 */
import { createContext, useContext } from 'react';
import type { CatalogRecord } from '../components/editor/holders/optic';
import type { Schematic, SchematicSymbol, SymbolKind } from '../components/editor/model';

/** One way to make an ideal part real: a part, in its cube when a module holds it. */
export interface Choice {
  key: string;
  /** The part number, or the module's name when it holds no catalogue part. */
  title: string;
  /** Who makes it, and its own values. */
  detail: string;
  /** How it differs from the specification; empty when it is as specified. */
  differs: string[];
  /** The module it comes in, ready to build; `null`: a holder is still needed. */
  cube: { module: string; source: string } | null;
  /** With no cube: the holders that could be made for it. */
  holders: string[];
  /** Lower is nearer the specification. */
  score: number;
  /** What the part becomes. */
  patch: Partial<SchematicSymbol>;
}

/** What an ideal part asks for (from its inputs). */
export interface IdealSpec {
  kind: SymbolKind;
  focalMm?: number;
  diameterMm?: number;
}

/** A catalogue part an ideal part could be, against its specification. */
export interface SnapCandidate {
  record: CatalogRecord;
  /** Lower is better; 0 is exactly the specification. */
  score: number;
  /** The record's focal length, and how far it is from the specification (relative, signed). */
  eflMm?: number;
  focalError?: number;
  diameterMm: number;
  /** As specified: the focal length within 2 %, and at least as wide. */
  matches: boolean;
  /** Why it falls short of the specification, in words. */
  notes: string[];
  /** The holders that can take it into a cube (their labels), best first; empty when none. */
  holders: string[];
}

export interface BomLine {
  /** The module, or the optic's part number. */
  name: string;
  /** A module, or an optic with no holder yet. */
  kind: 'module' | 'optic';
  /** Where it comes from: a box, a vendor. */
  source: string;
  qty: number;
  /** The design's parts on this line, for selecting them. */
  partIds: string[];
  /** EUR each, or null when there is no price. */
  unitPrice: number | null;
}

export interface Bom {
  lines: BomLine[];
  /** Parts in the design. */
  parts: number;
  /** EUR, priced lines only. */
  total: number;
  /** Lines with no price. */
  unpriced: number;
}

export interface Service {
  /** What an ideal part could become, best first (POST /v1/fit/existing for the modules; GET /v1/catalog/index for the parts). */
  choicesFor: (s: SchematicSymbol) => Promise<Choice[]>;
  /** The catalogue parts near a specification, for the close-up (GET /v1/catalog/index). */
  snapCandidates: (spec: IdealSpec) => Promise<SnapCandidate[]>;
  /** What to buy to build the design (POST /v1/export/parts). */
  bom: (design: Schematic) => Promise<Bom>;
}

/** No service: nothing to choose from, nothing to buy. */
export const NO_SERVICE: Service = {
  choicesFor: async () => [],
  snapCandidates: async () => [],
  bom: async (d) => ({ lines: [], parts: d.symbols.length, total: 0, unpriced: 0 }),
};

const Context = createContext<Service>(NO_SERVICE);

/** Gives every view below it the app's service. */
export const ServiceProvider = Context.Provider;

export const useService = () => useContext(Context);
