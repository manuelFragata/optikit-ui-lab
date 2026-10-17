/**
 * Snapping an ideal part to the catalogue (optikit-v2 WP-376): the parts that
 * could be it, best first. For a lens, the one whose focal length is nearest
 * the specification, at least as wide; a narrower one would clip what the
 * sketch lets through. Each says how far it is from the specification, and
 * whether a cube holder can take it, since that is the next step. Pure.
 *
 * STAND-IN for the service: in the app the catalogue search is
 * GET /v1/catalog/index and the holders' fit is GET /v1/generators.
 */
import { CATEGORY_OF } from '../../components/editor/model';
import { GENERATORS, holdRefusal } from './generators';
import { opticFacts, type CatalogRecord } from '../../components/editor/holders/optic';
import type { IdealSpec, SnapCandidate } from '../../ports/service';

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
