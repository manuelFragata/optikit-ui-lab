/**
 * The quote for a design: its bill of materials at list price, what the
 * parts cost us and when they can ship, a discount and the assembly labour.
 * Internal (the Commercial tab). Prices, costs and lead times come from the
 * shop (Odoo); a missing number is never guessed, it stays out of the sums
 * and the line says so.
 */
import type { Bom, BomLine } from '../../editor/bom';

/** What a module or optic costs us, EUR each, and how long it takes to get, working days. */
export interface Supply {
  cost: number;
  leadDays: number;
}

export type SupplyList = Readonly<Record<string, Supply>>;

export interface QuoteTerms {
  /** Off the parts, 0–1. */
  discount: number;
  labourHours: number;
  /** EUR per hour. */
  labourRate: number;
}

export interface QuoteLine extends BomLine {
  /** EUR each, or null when unknown. */
  cost: number | null;
  /** Of the list price, 0–1; null without a price or a cost. */
  marginShare: number | null;
  leadDays: number | null;
}

export interface Quote {
  lines: QuoteLine[];
  /** The priced lines at list price, EUR. */
  parts: number;
  discount: number;
  labour: number;
  /** Excluding VAT, EUR. */
  total: number;
  /** On the parts after the discount (labour is not counted): EUR, and 0–1 of what they sell for. */
  margin: number;
  marginShare: number;
  /** The slowest line's lead time; null when no line has one. */
  leadDays: number | null;
  /** Lines with no price (out of the total), and lines with no cost (out of the margin). */
  unpriced: number;
  uncosted: number;
}

/** Below this share of the price, a margin is flagged. */
export const LOW_MARGIN = 0.2;

export function buildQuote(bom: Bom, supply: SupplyList, terms: QuoteTerms): Quote {
  const lines: QuoteLine[] = bom.lines.map((l) => {
    const s = supply[l.name];
    const cost = s?.cost ?? null;
    const marginShare = l.unitPrice !== null && cost !== null && l.unitPrice > 0 ? (l.unitPrice - cost) / l.unitPrice : null;
    return { ...l, cost, marginShare, leadDays: s?.leadDays ?? null };
  });
  const parts = bom.total;
  const discount = parts * terms.discount;
  const labour = terms.labourHours * terms.labourRate;
  // The margin counts the lines with both a price and a cost, discounted like the rest.
  const known = lines.filter((l) => l.unitPrice !== null && l.cost !== null);
  const sold = known.reduce((sum, l) => sum + l.unitPrice! * l.qty, 0) * (1 - terms.discount);
  const bought = known.reduce((sum, l) => sum + l.cost! * l.qty, 0);
  const leads = lines.flatMap((l) => (l.leadDays === null ? [] : [l.leadDays]));
  return {
    lines,
    parts,
    discount,
    labour,
    total: parts - discount + labour,
    margin: sold - bought,
    marginShare: sold > 0 ? (sold - bought) / sold : 0,
    leadDays: leads.length ? Math.max(...leads) : null,
    unpriced: bom.unpriced,
    uncosted: lines.filter((l) => l.cost === null).length,
  };
}

/** One check before a quote goes out: passed, worth a look, or not checked here (the engine does it). */
export interface QuoteCheck {
  label: string;
  state: 'ok' | 'warn' | 'later';
  detail: string;
}
