/**
 * The design file (.optikit): the design as JSON, to save and open again.
 * Writing and reading live together so the two stay in step. In the product
 * the file is optikit-core's design document; this is the lab's stand-in.
 */
import type { Schematic } from './model';

export const DESIGN_FILE_EXTENSION = '.optikit';

export const designFileText = (design: Schematic) => JSON.stringify(design, null, 2);

/** The design in a design file's text, or null when the text is not one. Fields older files lack get their defaults. */
export function readDesignFile(text: string): Schematic | null {
  try {
    const d = JSON.parse(text) as Partial<Schematic> | null;
    if (!d || !Array.isArray(d.symbols)) return null;
    // Only the design's own fields: older files also name light paths (`rays`), but the light comes from the parts now.
    return { symbols: d.symbols, groups: d.groups ?? [], unitMm: d.unitMm ?? 50 };
  } catch {
    return null;
  }
}
