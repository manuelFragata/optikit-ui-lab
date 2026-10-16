/**
 * Snapping an ideal part to the catalogue (optikit-v2 WP-376): the parts that
 * could be it, best first. For a lens, the one whose focal length is nearest
 * the specification, at least as wide; a narrower one would clip what the
 * sketch lets through. Each says how far it is from the specification, and
 * whether a cube holder can take it, since that is the next step. Pure.
 */
import type { SymbolKind } from '../model';
import { GENERATORS, holdRefusal } from './generators';
import { opticFacts, type CatalogRecord } from './optic';

/** The record category an ideal part of each kind snaps to. */
export const CATEGORY_OF: Record<SymbolKind, string> = {
  lens: 'lens',
  mirror: 'mirror',
  dichroic: 'dichroic',
  objective: 'objective',
  laser: 'source',
  camera: 'detector',
};

/** What an ideal part asks for (from its inputs). */
export interface IdealSpec {
  kind: SymbolKind;
  focalMm?: number;
  diameterMm?: number;
}

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

/** A lens narrower than asked loses this much, plus its shortfall. */
const NARROW_PENALTY = 0.5;

/** The catalogue parts an ideal part could be, best first. */
export function snapCandidates(spec: IdealSpec, records: readonly CatalogRecord[]): SnapCandidate[] {
  const category = CATEGORY_OF[spec.kind];
  return records
    .filter((r) => r.category === category)
    .map((record): SnapCandidate => {
      const facts = opticFacts(record);
      const notes: string[] = [];
      let score = 0;
      const focalError = spec.focalMm && record.eflMm ? (record.eflMm - spec.focalMm) / spec.focalMm : undefined;
      if (focalError !== undefined) {
        score += Math.abs(focalError);
        if (Math.abs(focalError) >= 0.02) notes.push(`f = ${record.eflMm} mm, ${focalError > 0 ? 'longer' : 'shorter'} by ${Math.abs(focalError * 100).toFixed(0)} %`);
      }
      if (spec.diameterMm) {
        const short = spec.diameterMm - facts.acrossMm;
        if (short > 0.5) {
          score += NARROW_PENALTY + short / spec.diameterMm;
          notes.push(`Ø${facts.acrossMm.toFixed(1)}: narrower than the Ø${spec.diameterMm} asked`);
        } else if (facts.acrossMm > spec.diameterMm * 1.5) {
          // Much wider than asked: bigger, dearer, and harder to hold.
          score += 0.05;
          notes.push(`Ø${facts.acrossMm.toFixed(1)}: wider than needed`);
        }
      }
      const holders = GENERATORS.filter((g) => g.holds.outline !== 'any' && !holdRefusal(g.holds, facts)).map((g) => g.holds.label);
      return { record, score, eflMm: record.eflMm, focalError, diameterMm: facts.acrossMm, matches: notes.length === 0, notes, holders };
    })
    .sort((a, b) => a.score - b.score || a.diameterMm - b.diameterMm);
}

/** The values a snapped part takes for its inputs: what the record really is. */
export function snappedValues(record: CatalogRecord): Record<string, number> {
  const facts = opticFacts(record);
  return {
    ...(record.eflMm !== undefined && { 'Focal length': record.eflMm }),
    ...(!facts.rectangular && { Diameter: Math.round(facts.acrossMm * 10) / 10 }),
  };
}
