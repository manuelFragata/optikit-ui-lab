/**
 * STAND-IN for the kernel: in the app a path's transmission comes from
 * oc-wasm's coatings along the traced sequence.
 *
 * What a beam's path passes across the spectrum, from the coatings it knows,
 * for the Simulate tab's transmission plot. Pure.
 */
import { surfaceInfo, throughput } from '../coatings';
import type { Beam } from './beam';

/** What the path passes at each wavelength: the product over its parts with known coatings; `null` when none are known. */
export function spectrum(beam: Beam, from = 350, to = 1100, steps = 150): { nm: number; t: number }[] | null {
  const known = beam.elements.flatMap((e) => (e.record ? [surfaceInfo(e.record)] : []));
  if (!known.length) return null;
  return Array.from({ length: steps + 1 }, (_, k) => {
    const nm = from + ((to - from) * k) / steps;
    return { nm, t: known.reduce((p, infos) => p * throughput(infos, nm), 1) };
  });
}
