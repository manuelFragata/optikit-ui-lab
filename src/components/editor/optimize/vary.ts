/**
 * What the optimizer may change, shared by the Optimize pane and the
 * Properties panel: while Optimize is open, each number the optimizer can
 * change has a V toggle on its row in Properties (the Zemax convention), and
 * the pane lists the same ones. One map of the free variables, by id
 * (`<part>:<kind><surface>`), with their bounds. Pure.
 */
import type { PartVariables, Variable, VariableKind } from '../../../ports/analysis';

export interface Bounds {
  min: number;
  max: number;
}

/** The free variables, by id, with their bounds. */
export type VaryMap = Readonly<Record<string, Bounds>>;

/** Optimize mode, as the Properties panel sees it: the selected part's variables and which are free. */
export interface Varying {
  /** Every part on the path being optimized, with what it lets change, or why nothing. */
  groups: PartVariables[];
  free: VaryMap;
  toggle: (v: Variable) => void;
  /** The values a run proposes (or the best so far), by id: shown beside the free rows. */
  proposed?: Readonly<Record<string, number>>;
}

/** One number of a part as the optimizer knows it, if it is one. */
export function variableOf(varying: Varying | undefined, part: string, kind: VariableKind, surface?: number): Variable | undefined {
  return varying?.groups.find((g) => g.part.id === part)?.variables.find((v) => v.kind === kind && (surface === undefined || v.surface === surface));
}

/** The map with `v` free (at its own bounds) or no longer free. */
export const toggled = (free: VaryMap, v: Variable): VaryMap => {
  if (free[v.id]) {
    const next = { ...free };
    delete next[v.id];
    return next;
  }
  return { ...free, [v.id]: { min: v.min, max: v.max } };
};

/** The free ones among `all`, with their bounds. */
export const freeOf = (all: Variable[], free: VaryMap): Variable[] => all.filter((v) => free[v.id]).map((v) => ({ ...v, ...free[v.id] }));
