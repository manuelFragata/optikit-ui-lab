import { describe, expect, it } from 'vitest';
import { catalogList } from '../library/catalog';
import { demoInputs } from '../../demo/editorContent';
import { demoModules } from '../library/modules';
import type { SchematicSymbol, SymbolKind } from '../../components/editor/model';
import { part } from '../kernel/simulate/testDesigns';
import { choicesFor } from './choices';

const ideal = (kind: SymbolKind, values: Record<string, number> = {}): SchematicSymbol => ({
  ...part('P', kind, 0, {}, { state: 'ideal' }),
  label: `Ideal ${kind}`,
  inputs: demoInputs[kind].map((i) => (i.label in values ? { ...i, value: values[i.label] } : i)),
});
const modulesFor = (kind: SymbolKind) => demoModules[kind];

describe('what an ideal part could become', () => {
  it('offers a lens of the focal length in the module that holds it first, then the same lens with a holder still to make', () => {
    const choices = choicesFor(ideal('lens', { 'Focal length': 50 }), catalogList, modulesFor);
    expect(choices[0]).toMatchObject({ title: 'LA1131-A', cube: { module: 'Lens holder, f = 50' }, differs: [] });
    expect(choices[0].patch.placement).toMatchObject({ state: 'in-cube', module: 'Lens holder, f = 50' });
    expect(choices[0].patch.label).toBe('Lens holder, f = 50');

    const loose = choices.find((c) => c.title === 'AC254-050-A')!;
    expect(loose.cube).toBeNull();
    expect(loose.holders.length).toBeGreaterThan(0);
    expect(loose.patch.placement).toMatchObject({ state: 'unmounted', part: 'AC254-050-A' });
  });

  it('says how a choice differs from the specification, and ranks it by how much', () => {
    const choices = choicesFor(ideal('lens', { 'Focal length': 50 }), catalogList, modulesFor);
    const f100 = choices.find((c) => c.title === 'LA1509-A')!;
    expect(f100.cube?.module).toBe('Lens holder, f = 100');
    expect(f100.differs.join()).toMatch(/longer by 100 %/);
    expect(choices.indexOf(f100)).toBeGreaterThan(choices.findIndex((c) => c.title === 'AC254-050-A'));
  });

  it('matches a pass filter by its band, and keeps the part’s own values', () => {
    const [best, next] = choicesFor(ideal('filter', { 'Centre wavelength': 525, Bandwidth: 40 }), catalogList, modulesFor);
    expect(best).toMatchObject({ title: 'FBH520-40', cube: { module: 'Emission filter cube 520/40' } });
    expect(best.differs).toEqual(['Centre wavelength 520 nm, asked 525']);
    expect(next.title).toBe('FBH550-40');
    expect(best.patch.inputs?.find((i) => i.label === 'Centre wavelength')?.value).toBe(520);
  });

  it('offers a module that holds no catalogue part as it is, and nothing for a part that is not ideal', () => {
    expect(choicesFor(ideal('aperture'), catalogList, modulesFor).map((c) => c.title)).toEqual(['Iris cube']);
    expect(choicesFor({ ...ideal('lens'), placement: { state: 'unmounted', part: 'AC254-050-A', source: 'x' } }, catalogList, modulesFor)).toEqual([]);
  });

  it('reads a dichroic’s cut-on and a splitter’s ratio off the records’ `response` blocks, as the library writes them', () => {
    expect(choicesFor(ideal('dichroic'), catalogList, modulesFor)[0]).toMatchObject({ title: 'DMLP505', cube: { module: 'Dichroic holder' }, differs: ['Ø43.8: wider than needed'] });
    const [splitter] = choicesFor(ideal('beamsplitter', { Reflectance: 30 }), catalogList, modulesFor);
    expect(splitter).toMatchObject({ title: 'BS013', cube: { module: 'Beam splitter cube 50:50' } });
    expect(splitter.differs).toEqual(['Reflectance 50 %, asked 30']);
  });
});
