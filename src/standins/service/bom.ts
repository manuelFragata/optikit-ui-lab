/**
 * The bill of materials: what to buy to build the design, and how many.
 * The parts are grouped by what they are bought as: a module (a part in its
 * cube) or, for a part not mounted yet, the optic on its own (it still
 * needs a holder). As optikit-v2's live BOM (document/bom.ts): one function
 * for the panel and the CSV, so the two never disagree; a price is never
 * invented, so a line with no price stays unpriced and out of the total.
 *
 * STAND-IN for the service: in the app the BOM is optikit-core's
 * (POST /v1/export/parts), with the library's prices.
 */
import { specLine, type Schematic } from '../../components/editor/model';
import type { PriceList } from '../../ports/library';
import type { Bom, BomLine } from '../../ports/service';

/** Group a design's parts into BOM lines: modules first, then the optics with no holder; most first, then by name. */
export function buildBom(design: Schematic, prices: PriceList): Bom {
  const byName = new Map<string, BomLine>();
  for (const s of design.symbols) {
    const p = s.placement;
    // An ideal part has no part yet: its own line, by its specification, with no price.
    const [name, kind, source] =
      p.state === 'in-cube'
        ? [p.module, 'module' as const, p.source]
        : p.state === 'unmounted'
          ? [p.part, 'optic' as const, p.source]
          : [`${s.label} (${specLine(s) || 'ideal'}), no part chosen`, 'optic' as const, 'Sketch'];
    const line = byName.get(name) ?? { name, kind, source, qty: 0, partIds: [], unitPrice: p.state === 'ideal' ? null : (prices[name] ?? null) };
    line.qty += 1;
    line.partIds.push(s.id);
    byName.set(name, line);
  }
  const lines = [...byName.values()].sort((a, b) => (a.kind === b.kind ? b.qty - a.qty || a.name.localeCompare(b.name) : a.kind === 'module' ? -1 : 1));
  return {
    lines,
    parts: design.symbols.length,
    total: lines.reduce((sum, l) => sum + (l.unitPrice ?? 0) * l.qty, 0),
    unpriced: lines.filter((l) => l.unitPrice === null).length,
  };
}
