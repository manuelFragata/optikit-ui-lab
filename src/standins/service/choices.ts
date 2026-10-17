/**
 * What an ideal part could become. Each choice is a part and its cube
 * together where the library has a module that holds it (one pick makes it
 * buildable); a catalogue part no module holds says that a holder is still
 * needed; a module that holds no catalogue part comes as it is. Best against
 * the specification first, then the ones that come in a cube. Pure.
 *
 * STAND-IN for the service: in the app the modules come from
 * POST /v1/fit/existing (by part number, prescription, or focal length and
 * diameter) and the parts from GET /v1/catalog/index. Neither compares a
 * filter's band or a splitter's ratio yet; this does, from the records'
 * `response` blocks.
 */
import { snapCandidates } from './snap';
import { snappedValues, type BandUm, type CatalogRecord } from '../../components/editor/holders/optic';
import { realize, snapped, type ModuleOption, type SchematicSymbol, type SymbolKind } from '../../components/editor/model';
import type { Choice } from '../../ports/service';

/** Two wavelengths this close are the same; other values within this fraction. */
const SAME_NM = 2;
const SAME_FRACTION = 0.02;

const fmt = (v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(1));

/** How offered values differ from the part's inputs, on the inputs both name (the focal length and diameter of a lens are snap.ts's). */
function compare(s: SchematicSymbol, offered: Readonly<Record<string, number>>, skip: readonly string[] = []): { differs: string[]; score: number } {
  const differs: string[] = [];
  let score = 0;
  for (const input of s.inputs ?? []) {
    const value = offered[input.label];
    if (value === undefined || skip.includes(input.label)) continue;
    const d = value - input.value;
    const nm = input.unit === 'nm';
    if (nm ? Math.abs(d) <= SAME_NM : Math.abs(d) <= SAME_FRACTION * Math.abs(input.value)) continue;
    score += nm ? Math.abs(d) / 50 : Math.abs(d) / Math.max(Math.abs(input.value), 1);
    differs.push(`${input.label} ${fmt(value)} ${input.unit}, asked ${fmt(input.value)}`);
  }
  return { differs, score };
}

const nm = (um: number) => Math.round(um * 1000);

/** What a record's coating does, by the inputs' labels: from the first surface that has a `response`. */
function responseValues(r: CatalogRecord): Record<string, number> {
  const response = r.fragmentSurfaces.find((f) => f.response)?.response;
  if (!response) return {};
  const [band]: BandUm[] = (response.kind === 'absorptive' ? response['transmit-bands-um'] : response['reflect-bands-um']) ?? [];
  if (response.kind === 'absorptive' && band && band[0] !== null && band[1] !== null) return { 'Centre wavelength': (nm(band[0]) + nm(band[1])) / 2, Bandwidth: nm(band[1]) - nm(band[0]) };
  // A longpass dichroic turns the light below its cut-on.
  if (response.kind === 'dichroic' && band && band[0] === null && band[1] !== null) return { 'Cut-on wavelength': nm(band[1]) };
  if (response.kind === 'sampler' && response['transmit-ratio'] != null) return { Reflectance: Math.round(response['transmit-ratio'] * 100) };
  return {};
}

/** What a record states, by the inputs' labels. */
const recordValues = (r: CatalogRecord): Record<string, number> => ({ ...snappedValues(r), ...responseValues(r) });

/** The record a module holds: its `component` ref without the version range. */
const heldRecord = (m: ModuleOption) => m.component?.split('@')[0];

/** The values a record states, in a line. */
function valuesLine(r: CatalogRecord, diameterMm: number) {
  const s = responseValues(r);
  return [
    r.eflMm !== undefined && `f = ${fmt(r.eflMm)} mm`,
    s['Centre wavelength'] !== undefined && `${s['Centre wavelength']} nm`,
    s.Bandwidth !== undefined && `${s.Bandwidth} nm wide`,
    s['Cut-on wavelength'] !== undefined && `cut-on ${s['Cut-on wavelength']} nm`,
    s.Reflectance !== undefined && `R ${s.Reflectance} %`,
    diameterMm > 0 && `Ø${fmt(diameterMm)}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * What an ideal part could become, best first: the catalogue parts of its kind
 * (each in the module that holds it, when there is one) and the modules that
 * hold no catalogue part. Nothing for a part that is not ideal.
 */
export function choicesFor(s: SchematicSymbol, catalogue: readonly CatalogRecord[], modulesFor: (kind: SymbolKind) => ModuleOption[]): Choice[] {
  if (s.placement.state !== 'ideal') return [];
  const inputs = Object.fromEntries((s.inputs ?? []).map((i) => [i.label, i.value]));
  const modules = modulesFor(s.kind);
  const records = snapCandidates({ kind: s.kind, focalMm: inputs['Focal length'], diameterMm: inputs.Diameter }, catalogue);
  const held = new Set<string>();

  const fromCatalogue = records.map((c): Choice => {
    const mpn = c.record.vendor?.mpn ?? c.record.id;
    const values = recordValues(c.record);
    const rest = compare(s, values, ['Focal length', 'Diameter']);
    const module = modules.find((m) => heldRecord(m) === c.record.id);
    if (module) held.add(module.module);
    const source = `${c.record.vendor?.name ?? 'Catalogue'} parts`;
    const patch = module ? { ...realize(s, module), inputs: (s.inputs ?? []).map((i) => (i.label in values ? { ...i, value: values[i.label] } : i)) } : snapped(s, mpn, source, values);
    return {
      key: `part:${c.record.id}`,
      title: mpn,
      detail: [c.record.vendor?.name, valuesLine(c.record, c.diameterMm)].filter(Boolean).join(' · '),
      differs: [...c.notes, ...rest.differs],
      cube: module ? { module: module.module, source: module.source } : null,
      holders: module ? [] : c.holders,
      score: c.score + rest.score,
      patch,
    };
  });

  const fromModules = modules
    .filter((m) => !held.has(m.module))
    .map((m): Choice => {
      const { differs, score } = compare(s, m.fixes ?? {});
      return {
        key: `module:${m.module}`,
        title: m.module,
        detail: m.version ? `${m.source} · v${m.version}` : m.source,
        differs,
        cube: { module: m.module, source: m.source },
        holders: [],
        score,
        patch: realize(s, m),
      };
    });

  // Nearest first; as near, the one that comes in a cube.
  return [...fromCatalogue, ...fromModules].sort((a, b) => a.score - b.score || Number(Boolean(b.cube)) - Number(Boolean(a.cube)));
}
