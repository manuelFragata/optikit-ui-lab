/**
 * The parts library, as the app asks it for parts. The views never read the
 * library themselves: they ask what the app provides (`LibraryProvider`). In
 * the lab that is the stand-in (src/standins/library); in the app it is the
 * service's library and catalogue endpoints. docs/INTEGRATION.md maps each
 * field to its endpoint.
 *
 * The library comes as one index, loaded once when the app starts (and again
 * on `reload`); its fields answer at once after that. `status` says where the
 * loading is, so the views can show it: while `loading` the fields are empty.
 */
import { createContext, useContext } from 'react';
import type { CatalogRecord } from '../components/editor/holders/optic';
import type { ModuleOption, SchematicSymbol, SymbolKind } from '../components/editor/model';
import type { MeshRef } from '../components/editor/scene3d/layout3d';

/** Prices by module or part name, EUR. */
export type PriceList = Readonly<Record<string, number>>;

/** One part the library lists for placing. */
export interface PaletteEntry {
  id: string;
  label: string;
  /** The symbol it is drawn as once placed. */
  kind: SymbolKind;
}

/** A box of modules, or a vendor's parts, as the library lists them for placing. */
export interface PaletteGroup {
  id: string;
  label: string;
  /** Total parts in the library, even when only some are listed. */
  count: number;
  mount: 'mounted' | 'unmounted';
  entries: PaletteEntry[];
}

export type LibraryStatus = { state: 'loading' } | { state: 'ready' } | { state: 'error'; error: string };

export interface Library {
  status: LibraryStatus;
  /** Load the index again (after an error). */
  reload: () => void;
  /** Every optics record a part can be: the library's records and the vendor catalogue's (GET /v1/library/index, GET /v1/catalog/index). */
  catalogue: readonly CatalogRecord[];
  /** The record behind a part number (GET /v1/library/index; a catalogue row through POST /v1/catalog/import). */
  record: (part: string) => CatalogRecord | undefined;
  /** The modules a part of this kind can be realized as (GET /v1/library/index, by category). */
  modulesFor: (kind: SymbolKind) => ModuleOption[];
  /** The modules and parts to place, by box or vendor (GET /v1/library/index, GET /v1/catalog/index). */
  palette: readonly PaletteGroup[];
  /** Prices by name (records' `vendor.price`, the catalogue's rows). */
  prices: PriceList;
  /** A module's mesh, as it sits in its cube (GET /v1/library/index `assets`, files from /v1/library/assets/). */
  meshFor: (s: SchematicSymbol) => MeshRef | undefined;
}

/** No library: nothing to place, nothing to match. */
export const EMPTY_LIBRARY: Library = { status: { state: 'ready' }, reload: () => {}, catalogue: [], record: () => undefined, modulesFor: () => [], palette: [], prices: {}, meshFor: () => undefined };

const Context = createContext<Library>(EMPTY_LIBRARY);

/** Gives every view below it the app's library. */
export const LibraryProvider = Context.Provider;

export const useLibrary = () => useContext(Context);
