/** Small designs for the simulate tests: parts in a straight line along +x, and one light path through them. */
import { catalogRecord } from '../../library/catalog';
import { recordOf } from '../../../components/editor/holders/designs';
import type { LightPath } from '../../../ports/light';
import type { Placement, Schematic, SchematicSymbol, SymbolKind } from '../../../components/editor/model';

export const part = (
  id: string,
  kind: SymbolKind,
  x: number,
  inputs: Record<string, number> = {},
  placement: Placement = { state: 'in-cube', module: id, source: 'test', seat: 0 },
): SchematicSymbol => ({
  id,
  label: id,
  kind,
  type: kind,
  x,
  y: 0,
  z: 1,
  placement,
  inputs: Object.entries(inputs).map(([label, value]) => ({ label, value, unit: '', min: 0, max: 1000, step: 1 })),
  notes: '',
});

/** A design with one straight path through its parts, in order along +x ('sample' first for emission). */
export function straight(symbols: SchematicSymbol[], sampleAt?: number): { design: Schematic; path: LightPath } {
  const design: Schematic = { symbols, rays: [], groups: [], unitMm: 50 };
  const ids = [...(sampleAt === undefined ? [] : ['sample']), ...symbols.map((s) => s.id)];
  const points = [...(sampleAt === undefined ? [] : [{ x: sampleAt, y: 0 }]), ...symbols.map((s) => ({ x: s.x, y: 0 }))];
  const ray = { id: 'r', label: 'r', color: 'ray1' as const, path: ids, offset: 0, arrowSegment: 0, labelAt: 0 };
  return { design, path: { ray, z: 1, points, open: false, parts: ids } };
}

export const lookup = (s: SchematicSymbol) => recordOf(s, catalogRecord);
