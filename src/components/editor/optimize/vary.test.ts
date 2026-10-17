import { describe, expect, it } from 'vitest';
import type { Variable } from '../../../ports/analysis';
import { percent } from './session';
import { freeOf, toggled, variableOf, type Varying } from './vary';

const r1: Variable = { id: 'L:radius0', part: 'L', kind: 'radius', surface: 0, label: 'R1', value: 25, min: 12, max: 50 };
const t1: Variable = { id: 'L:thickness0', part: 'L', kind: 'thickness', surface: 0, label: 't1', value: 5, min: 2.5, max: 10 };
const at: Variable = { id: 'L:position', part: 'L', kind: 'position', label: 'Position', value: 600, min: 400, max: 800 };

describe('the free variables, shared by Optimize and Properties', () => {
  it('free a variable at its own bounds, and fix it again', () => {
    const free = toggled({}, r1);
    expect(free).toEqual({ 'L:radius0': { min: 12, max: 50 } });
    expect(toggled(free, r1)).toEqual({});
  });

  it('give the free ones with the bounds set for them', () => {
    expect(freeOf([r1, t1, at], { 'L:position': { min: 500, max: 700 } })).toEqual([{ ...at, min: 500, max: 700 }]);
  });

  it('find the variable behind a row: a radius or thickness by its surface', () => {
    const varying: Varying = { groups: [{ part: { id: 'L', label: 'Lens' }, variables: [r1, t1, at] }], free: {}, toggle: () => {} };
    expect(variableOf(varying, 'L', 'thickness', 0)).toBe(t1);
    expect(variableOf(varying, 'L', 'radius', 1)).toBeUndefined();
    expect(variableOf(varying, 'L', 'position')).toBe(at);
    expect(variableOf(undefined, 'L', 'position')).toBeUndefined();
  });
});

describe('the merit as the pane shows it', () => {
  it('as a share of where it started, small ones said plainly', () => {
    expect([1, 0.25, 0.042, 0.0003, 3.8e-9, 0].map(percent)).toEqual(['100 %', '25 %', '4.2 %', '0.030 %', '< 0.01 %', '0 %']);
  });
});
