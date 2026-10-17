/** The parts of a design as Choose parts lists them: in the order the light meets them, each with where it stands. Pure. */
import type { Light } from '../../../ports/light';
import type { Schematic, SchematicSymbol } from '../model';

/** Where a part stands: sketched, a part chosen with no holder yet, or in a cube. */
export type ChoiceStatus = 'ideal' | 'chosen' | 'cube';

export const statusOf = (s: SchematicSymbol): ChoiceStatus => (s.placement.state === 'ideal' ? 'ideal' : s.placement.state === 'unmounted' ? 'chosen' : 'cube');

/** The design's parts, the ones the light meets first, in the order it meets them; then the rest as the design lists them. */
export function inLightOrder(design: Schematic, light: Light): SchematicSymbol[] {
  const byId = new Map(design.symbols.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const out: SchematicSymbol[] = [];
  for (const id of light.paths.flatMap((p) => p.parts ?? [])) {
    const s = byId.get(id);
    if (s && !seen.has(id)) {
      seen.add(id);
      out.push(s);
    }
  }
  return [...out, ...design.symbols.filter((s) => !seen.has(s.id))];
}
