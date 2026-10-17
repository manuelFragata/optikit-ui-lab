/** The bill of materials as a file to download. */
import type { Bom } from '../../ports/service';

/** The CSV's file name, for a design. */
export const bomFileName = (designName: string) => `${designName} BOM.csv`;

/** The BOM as CSV, with a total row. */
export function bomCsv(bom: Bom): string {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const eur = (v: number | null) => (v === null ? '' : v.toFixed(2));
  const rows = [
    ['qty', 'item', 'kind', 'source', 'unit EUR', 'total EUR', 'parts'],
    ...bom.lines.map((l) => [
      String(l.qty),
      l.name,
      l.kind === 'module' ? 'module' : 'optic, no holder',
      l.source,
      eur(l.unitPrice),
      l.unitPrice === null ? 'unpriced' : eur(l.unitPrice * l.qty),
      l.partIds.join(' '),
    ]),
    ['', 'TOTAL', '', '', '', eur(bom.total), bom.unpriced ? `+${bom.unpriced} unpriced` : ''],
  ];
  return rows.map((r) => r.map(cell).join(',')).join('\n') + '\n';
}
