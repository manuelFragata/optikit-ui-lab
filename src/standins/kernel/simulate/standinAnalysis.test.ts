import { describe, expect, it } from 'vitest';
import type { OptimizeRun } from '../../../ports/analysis';
import { catalogRecord } from '../../library/catalog';
import { optimizeSteps, standinAnalysis } from './standinAnalysis';
import { part, straight } from './testDesigns';

const free = { state: 'unmounted' as const, part: 'ideal', source: 'x' };
const analysis = standinAnalysis({ record: catalogRecord });

/** A 10× objective, a tube lens to move, and a camera: the run moves the lens until the spot is smallest. */
function tubeLens() {
  const { design, path } = straight([part('O', 'objective', 2, { Magnification: 10, 'Numerical aperture': 0.25 }), part('T', 'lens', 4, { 'Focal length': 150 }, free), part('C', 'camera', 8)], 0);
  const light = { paths: [path], misses: [] };
  const [place] = analysis.places({ design, light, settings: { beamMm: 2, na: null, rays: 41, nm: null, shiftMm: {} } });
  const setup = analysis.setup({ design, light, place: place.key });
  const position = setup.groups.flatMap((g) => g.variables).find((v) => v.part === 'T' && v.kind === 'position')!;
  return { design, light, place: place.key, goals: [{ objective: setup.objective, weight: 1 }], variables: [position] };
}

describe('an optimizer run', () => {
  it('reads the light at once, with no wait', () => {
    const ask = tubeLens();
    expect(analysis.view(ask).values[0]).toBeGreaterThan(1000);
  });

  it('gives the best so far after each step, never worse than the step before, then the run', () => {
    const it = optimizeSteps(tubeLens(), catalogRecord);
    const steps: OptimizeRun[] = [];
    let r = it.next();
    for (; !r.done; r = it.next()) steps.push(r.value);
    expect(steps.length).toBeGreaterThan(0);
    for (let i = 1; i < steps.length; i++) expect(steps[i].merit.after).toBeLessThanOrEqual(steps[i - 1].merit.after + 1e-9);
    expect(r.value.goals[0].after).toBeLessThan(1);
    expect(r.value.merit.before).toBeCloseTo(1, 9);
    expect(r.value.history[0]).toBe(r.value.merit.before);
    expect(r.value.stopped).toBe(false);
  });

  it('runs through the port to the end, saying each step on the way', async () => {
    const said: OptimizeRun[] = [];
    const run = await analysis.run(tubeLens(), (best) => said.push(best)).done;
    expect(said.length).toBeGreaterThan(0);
    expect(run.goals[0].after).toBeLessThan(1);
    expect(run.design.symbols.find((s) => s.id === 'T')!.x).toBeCloseTo(5, 2);
  });

  it('stops with the best so far', async () => {
    const job = analysis.run(tubeLens(), () => job.stop());
    const run = await job.done;
    expect(run.stopped).toBe(true);
    expect(run.steps).toBe(1);
    expect(run.merit.after).toBeLessThanOrEqual(run.merit.before);
  });
});
