/**
 * The arithmetic behind the plots' axes: round tick steps (1, 2 or 5 × a
 * power of ten), a domain widened to them, tick labels with just the
 * decimals the step needs, and a length unit that keeps the numbers short.
 * Pure.
 */

/** A round step near `span / count`: 1, 2 or 5 × a power of ten. */
export function niceStep(span: number, count = 5): number {
  if (!(span > 0) || !Number.isFinite(span)) return 1;
  const raw = span / count;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((k) => k * p).find((s) => s >= raw * (1 - 1e-9))!;
}

export interface Ticks {
  /** The domain, widened to whole steps when asked. */
  domain: [number, number];
  step: number;
  values: number[];
}

/**
 * Ticks across `[min, max]`, about `count` of them. `nice` widens the domain
 * out to whole steps (an axis that starts and ends on a tick); otherwise the
 * domain stays and the ticks fall inside it.
 */
export function ticks(min: number, max: number, { count = 5, nice = true }: { count?: number; nice?: boolean } = {}): Ticks {
  let [lo, hi] = min <= max ? [min, max] : [max, min];
  if (hi - lo < 1e-12) {
    const pad = Math.abs(lo) * 0.1 || 1;
    [lo, hi] = [lo - pad, hi + pad];
  }
  const step = niceStep(hi - lo, count);
  const domain: [number, number] = nice ? [Math.floor(lo / step + 1e-9) * step, Math.ceil(hi / step - 1e-9) * step] : [lo, hi];
  // Each tick from its index, rounded to the step's decimals: no 0.30000000000000004.
  const first = Math.ceil(domain[0] / step - 1e-9);
  const last = Math.floor(domain[1] / step + 1e-9);
  const round = (v: number) => Number(v.toFixed(decimalsFor(step) + 2)) || 0;
  const values = Array.from({ length: Math.max(0, last - first + 1) }, (_, k) => round((first + k) * step));
  return { domain: nice ? [round(domain[0]), round(domain[1])] : domain, step, values };
}

/** Decimals a step needs: 0 for 1, 2, 5, 10…; 1 for 0.5; 2 for 0.05… */
export const decimalsFor = (step: number) => Math.max(0, -Math.floor(Math.log10(step) + 1e-9));

/** A tick label: the value with the step's decimals, a true minus sign, and no "-0". */
export function tickLabel(v: number, step: number): string {
  const s = v.toFixed(decimalsFor(step));
  return Number(s) === 0 ? s.replace('-', '') : s.replace('-', '−');
}

/** A linear map from a domain onto a range (pixels). */
export const linear =
  ([d0, d1]: [number, number], [r0, r1]: [number, number]) =>
  (v: number) =>
    r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);

/** The unit to show lengths in, given the largest one (mm): µm below a millimetre. */
export function lengthUnit(maxMm: number): { unit: 'µm' | 'mm'; perMm: number } {
  return Math.abs(maxMm) < 1 ? { unit: 'µm', perMm: 1000 } : { unit: 'mm', perMm: 1 };
}

/** How far out a spot reaches, mm: its farthest ray, or a little past its RMS circle. For a shared scale, take the larger of two. */
export const spotReach = (points: { x: number; y: number }[], rmsMm: number) => Math.max(rmsMm * 1.6, ...points.map((p) => Math.hypot(p.x, p.y)), 1e-6) * 1.08;

/** A length as it reads in a figure: µm below a millimetre, 3 significant digits. */
export function lengthText(mm: number): string {
  const { unit, perMm } = lengthUnit(mm);
  const v = mm * perMm;
  const digits = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2;
  return `${v.toFixed(digits)} ${unit}`;
}
