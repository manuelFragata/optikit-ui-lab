/**
 * The Simulate pane's reading of the numbers: for each place light is read
 * (a detector, the sample, where a path runs out), the few checks that say
 * whether the design works there, each with a tone and the analysis that
 * shows it in full.
 *
 * - Focus: the RMS spot at the plane, against the best focus near it. Where
 *   the light runs out, Collimation: how far the rays leave parallel.
 * - Clipping: the fullest aperture on the path, and rays stopped.
 * - Transmission: what the path passes at its wavelength, from the coatings
 *   it knows.
 *
 * The numbers come from the analysis port (src/ports/analysis.ts); the
 * tones are the UI's reading of them. A number is only as good as what it
 * stands on, so each check says that too (`caveats`): what the analysis
 * assumed where the design does not say, parts with no data. A geometric
 * spot smaller than the diffraction limit is not what one sees: the check
 * then gives the Airy radius.
 */
import type { AnalysisId, Assumed, Place, SimulateSettings } from '../../../ports/analysis';

export const ANALYSES: { id: AnalysisId; label: string; plane: boolean; rays: boolean }[] = [
  { id: 'spot', label: 'Spot', plane: true, rays: true },
  { id: 'fan', label: 'Ray fan', plane: true, rays: true },
  { id: 'focus', label: 'Through focus', plane: true, rays: true },
  { id: 'fill', label: 'Aperture fill', plane: false, rays: false },
  { id: 'transmission', label: 'Transmission', plane: false, rays: false },
];

/** How light is sent in and read until the person says otherwise: a typical diode module's 2 mm beam, the objective's own NA, 41 rays, each source's wavelength. */
export const DEFAULT_SETTINGS: SimulateSettings = { beamMm: 2, na: null, rays: 41, nm: null, shiftMm: {} };

/** ok: works; warn: worth a look; bad: does not work as drawn; none: nothing to say (not known). */
export type Tone = 'ok' | 'warn' | 'bad' | 'none';

export interface Check {
  id: 'focus' | 'collimation' | 'clipping' | 'transmission';
  label: string;
  value: string;
  note: string;
  tone: Tone;
  /** The analysis that shows it in full. */
  analysis: AnalysisId;
  /** What the number stands on that the design does not give, in words: when any, it is an estimate. */
  caveats: string[];
}

/** A length as it reads: µm when small, mm from a millimetre; under what the trace resolves, a bound, not a false 0.0. */
export const length = (mm: number) => (Math.abs(mm) >= 1 ? `${mm.toFixed(2)} mm` : Math.abs(mm) < 5e-5 ? '< 0.1 µm' : `${(mm * 1000).toFixed(Math.abs(mm * 1000) >= 100 ? 0 : 1)} µm`);
const signed = (mm: number) => `${mm >= 0 ? '+' : '−'}${Math.abs(mm).toFixed(Math.abs(mm) >= 10 ? 0 : 1)} mm`;

/** In focus: the spot at the plane no more than half again the best one, or within 5 µm of it. */
const IN_FOCUS = (atPlane: number, best: number) => atPlane <= Math.max(best * 1.5, best + 0.005);
/** Nearly full: past this the edge of the beam is close to a part's edge. */
const NEARLY_FULL = 0.85;

/** What the optics stand on that the design does not give: each part's assumptions, other than its size. */
const opticsCaveats = (assumed: Assumed[]) =>
  assumed.flatMap((a) => {
    const optics = a.assumed.filter((x) => !(a.apertureAssumed && /^one inch/.test(x)));
    return optics.length ? [`${a.label}: ${optics.join(', ')}`] : [];
  });

/** What the apertures stand on: the sizes taken. */
const sizeCaveats = (assumed: Assumed[]) => assumed.flatMap((a) => (a.apertureAssumed ? [`${a.label}: ${a.assumed.find((x) => /^one inch/.test(x)) ?? 'a size taken'}`] : []));

export function focusCheck(place: Place): Check {
  const f = place.numbers.focus;
  const caveats = opticsCaveats(place.assumed);
  if (f.kind === 'collimation') {
    const mrad = f.rmsAngleRad * 1000;
    return {
      id: 'collimation',
      label: 'Collimation',
      value: mrad < 0.001 ? '< 0.001 mrad' : `${mrad < 0.1 ? mrad.toFixed(3) : mrad.toFixed(2)} mrad`,
      note: mrad < 0.5 ? 'Leaves parallel' : 'Leaves spreading or converging',
      tone: mrad < 0.5 ? 'ok' : mrad < 5 ? 'warn' : 'bad',
      analysis: 'fan',
      caveats,
    };
  }
  const limited = (rms: number) => f.airyMm !== null && rms <= f.airyMm;
  const ok = limited(f.rmsMm) || IN_FOCUS(f.rmsMm, f.rmsBestMm);
  return {
    id: 'focus',
    label: 'Focus',
    // Below the diffraction limit the smallest spot one sees is the Airy disc, whatever the geometric spot says.
    value: limited(f.rmsMm) ? length(f.airyMm!) : length(f.rmsMm),
    note: limited(f.rmsMm)
      ? `Diffraction-limited: the Airy radius (geometric RMS ${length(f.rmsMm)})`
      : ok
        ? 'In focus'
        : limited(f.rmsBestMm)
          ? `Best focus ${signed(f.bestDzMm)} from here, where it is diffraction-limited`
          : `Best focus ${signed(f.bestDzMm)} from here, ${length(f.rmsBestMm)} RMS`,
    tone: ok ? 'ok' : Math.abs(f.bestDzMm) < 5 ? 'warn' : 'bad',
    analysis: ok ? 'spot' : 'focus',
    caveats: [...caveats, ...(place.numbers.transmission.nm === null ? [`λ = ${f.airyNm} nm: the source states no wavelength`] : [])],
  };
}

export function clippingCheck(place: Place): Check {
  const { fullest, stopped, rays } = place.numbers.clipping;
  if (!fullest) return { id: 'clipping', label: 'Clipping', value: '—', note: 'No part states an aperture', tone: 'none', analysis: 'fill', caveats: [] };
  const clips = fullest.fill > 1 || stopped > 0;
  return {
    id: 'clipping',
    label: 'Clipping',
    value: `${Math.round(fullest.fill * 100)}%`,
    note: stopped ? `${stopped} of ${rays} rays stopped · fullest at ${fullest.label}` : `Fullest at ${fullest.label}`,
    tone: clips ? 'bad' : fullest.fill > NEARLY_FULL ? 'warn' : 'ok',
    analysis: 'fill',
    caveats: [...sizeCaveats(place.assumed), ...opticsCaveats(place.assumed)],
  };
}

export function transmissionCheck(place: Place): Check {
  const { t, nm, unknown } = place.numbers.transmission;
  const base = { id: 'transmission' as const, label: 'Transmission', analysis: 'transmission' as const };
  if (!nm) return { ...base, value: '—', note: 'The source states no wavelength', tone: 'none', caveats: [] };
  if (t === null) return { ...base, value: '—', note: 'No coatings known on this path', tone: 'none', caveats: [] };
  // A part with no data can only lose light: with any, the number is a ceiling.
  const value = `${(t * 100).toFixed(t >= 0.995 ? 0 : 1)}%`;
  return {
    ...base,
    value: unknown.length ? `≤ ${value}` : value,
    note: unknown.length ? `At ${nm} nm · ${unknown.length} ${unknown.length === 1 ? 'part' : 'parts'} without data` : `At ${nm} nm`,
    tone: t >= 0.8 ? 'ok' : t >= 0.5 ? 'warn' : 'bad',
    caveats: unknown.map((label) => `${label}: no coating data, counted as lossless`),
  };
}

/** The three checks at a place. */
export const checksOf = (place: Place): Check[] => [focusCheck(place), clippingCheck(place), transmissionCheck(place)];

/** The worst tone of some checks: what a place's row shows at a glance. */
export function worst(checks: Check[]): Tone {
  const order: Tone[] = ['bad', 'warn', 'ok', 'none'];
  return order.find((tone) => checks.some((c) => c.tone === tone)) ?? 'none';
}
