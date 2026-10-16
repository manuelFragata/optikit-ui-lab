/**
 * The bill of materials: what to buy to build the design, and how many.
 * The parts are grouped by what they are bought as: a module (a part in its
 * cube) or, for a part not mounted yet, the optic on its own (it still
 * needs a holder). As optikit-v2's live BOM (document/bom.ts): one function
 * for the panel and the CSV, so the two never disagree; a price is never
 * invented, so a line with no price stays unpriced and out of the total.
 */
import { specLine, type Schematic } from './model';

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

/** Prices by module or part name, EUR (from the shop; the lab's are made up). */
export type PriceList = Readonly<Record<string, number>>;

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

/** The CSV's file name, for a design. */
export const bomFileName = (designName: string) => `${designName} BOM.csv`;

/** The BOM as CSV, with a total row. */
export function bomCsv(bom: Bom): string {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const eur = (v: number | null) => (v === null ? '' : v.toFixed(2));
  const rows = [
    ['qty', 'item', 'kind', 'source', 'unit EUR', 'total EUR', 'parts'],
    ...bom.lines.map((l) => [String(l.qty), l.name, l.kind === 'module' ? 'module' : 'optic, no holder', l.source, eur(l.unitPrice), l.unitPrice === null ? 'unpriced' : eur(l.unitPrice * l.qty), l.partIds.join(' ')]),
    ['', 'TOTAL', '', '', '', eur(bom.total), bom.unpriced ? `+${bom.unpriced} unpriced` : ''],
  ];
  return rows.map((r) => r.map(cell).join(',')).join('\n') + '\n';
}
