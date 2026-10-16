/**
 * Every change the editor makes to a design, as pure functions: a design in,
 * the changed design out. The editor runs them through its undo history, so
 * each call is one undo step. Tested in designEdits.test.ts.
 */
import type { PartEntry } from '../../editor/AddPartSearch';
import { frozen, isLocked, realize, shifted, type ModuleOption, type Schematic, type SchematicSymbol, type Seat, type SymbolKind, type SymbolParam } from '../../editor/model';

type Patch = (part: SchematicSymbol) => Partial<SchematicSymbol>;

/** `n` free ids like the others: S7, S8, … */
export function nextIds(design: Schematic, n: number): string[] {
  const top = Math.max(0, ...design.symbols.map((s) => Number(s.id.replace(/\D/g, '')) || 0));
  return Array.from({ length: n }, (_, i) => `S${top + 1 + i}`);
}

/** Change some parts; `patch` says what changes for each. */
export const updateParts = (design: Schematic, ids: string[], patch: Patch): Schematic => ({
  ...design,
  symbols: design.symbols.map((s) => (ids.includes(s.id) ? { ...s, ...patch(s) } : s)),
});

export const addParts = (design: Schematic, parts: SchematicSymbol[]): Schematic => ({ ...design, symbols: [...design.symbols, ...parts] });

export const removeParts = (design: Schematic, ids: string[]): Schematic => ({ ...design, symbols: design.symbols.filter((s) => !ids.includes(s.id)) });

/** Some parts moved by `by` (grid units, z in layers), each staying put along its locked axes. */
export const moveParts = (design: Schematic, ids: string[], by: { x?: number; y?: number; z?: number }): Schematic =>
  updateParts(design, ids, (s) => shifted(s, by));

/** A quarter turn for each part that is in a cube and may turn. */
export const turnParts = (design: Schematic, ids: string[]): Schematic =>
  updateParts(design, ids, (s) =>
    s.placement.state === 'in-cube' && !isLocked(s, 'turn') ? { placement: { ...s.placement, seat: ((s.placement.seat + 1) % 4) as Seat } } : {},
  );

/**
 * Copies of some parts, moved by `by` (grid units, z in layers; three cubes
 * to the right unless said). Copies start unlocked. Returns the design and
 * the copies' ids.
 */
export function copyParts(design: Schematic, ids: string[], by: { x?: number; y?: number; z?: number } = { x: 3 }): { design: Schematic; ids: string[] } {
  const originals = design.symbols.filter((s) => ids.includes(s.id));
  const newIds = nextIds(design, originals.length);
  const tenth = (v: number) => Math.round(v * 10) / 10;
  const copies = originals.map((s, i) => ({
    ...s,
    id: newIds[i],
    label: `${s.label} copy`,
    locks: undefined,
    x: tenth(s.x + (by.x ?? 0)),
    y: tenth(s.y + (by.y ?? 0)),
    z: Math.max(0, s.z + (by.z ?? 0)),
  }));
  return { design: addParts(design, copies), ids: newIds };
}

/** A new part from the library, at `at` on layer `z`: in a cube when it is a module, loose when it is a bare optic. */
export function newPart(entry: PartEntry, at: { x: number; y: number }, z: number, id: string, inputs: SymbolParam[] = []): SchematicSymbol {
  return {
    id,
    label: entry.label,
    kind: entry.kind,
    type: entry.label,
    x: at.x,
    y: at.y,
    z,
    placement:
      entry.mount === 'mounted'
        ? { state: 'in-cube', module: entry.label, source: entry.source, seat: 0 }
        : { state: 'unmounted', part: entry.label, source: entry.source },
    inputs,
    notes: '',
  };
}

/** Every unmounted part realized as the first module that fits it, or frozen into a holder made for it. */
export const mountAll = (design: Schematic, modulesFor: (kind: SymbolKind) => ModuleOption[]): Schematic => ({
  ...design,
  symbols: design.symbols.map((s) => {
    if (s.placement.state !== 'unmounted') return s;
    const option = modulesFor(s.kind)[0];
    return option ? { ...s, ...realize(s, option) } : { ...s, placement: frozen(s.placement) };
  }),
});
